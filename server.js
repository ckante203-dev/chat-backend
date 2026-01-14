const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');

const app = express();

// =========================
// MIDDLEWARES
// =========================
app.use(cors());
app.use(bodyParser.json());

// =========================
// TEST SERVEUR
// =========================
app.get('/', (req, res) => {
  res.send('Serveur OK !');
});

// =========================
// INSCRIPTION
// =========================
app.post('/api/auth/register', async (req, res) => {
  const { email, motDePasse, dateNaissance, numero } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Champs obligatoires manquants' });
  }

  try {
    const userCheck = await pool.query(
      'SELECT id FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    await pool.query(
      `INSERT INTO utilisateurs 
       (email, mot_de_passe, date_naissance, numero)
       VALUES ($1, $2, $3, $4)`,
      [email, hashedPassword, dateNaissance, numero]
    );

    res.status(201).json({ message: 'Utilisateur créé avec succès' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CONNEXION
// =========================
app.post('/api/auth/login', async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email ou mot de passe manquant' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, mot_de_passe FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(motDePasse, user.mot_de_passe);

    if (!valid) {
      return res.status(400).json({ message: 'Mot de passe incorrect' });
    }

    res.status(200).json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTE UTILISATEURS
// =========================
app.get('/api/utilisateurs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, numero, date_naissance
      FROM utilisateurs
      ORDER BY id DESC
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CREER / RECUPERER CONVERSATION
// =========================
app.post('/api/conversations', async (req, res) => {
  const { utilisateur1_id, utilisateur2_id } = req.body;

  if (!utilisateur1_id || !utilisateur2_id) {
    return res.status(400).json({ message: 'IDs manquants' });
  }

  try {
    const exist = await pool.query(
      `
      SELECT * FROM conversations
      WHERE 
        (utilisateur1_id = $1 AND utilisateur2_id = $2)
        OR
        (utilisateur1_id = $2 AND utilisateur2_id = $1)
      `,
      [utilisateur1_id, utilisateur2_id]
    );

    if (exist.rows.length > 0) {
      return res.status(200).json(exist.rows[0]);
    }

    const result = await pool.query(
      `
      INSERT INTO conversations (utilisateur1_id, utilisateur2_id)
      VALUES ($1, $2)
      RETURNING *
      `,
      [utilisateur1_id, utilisateur2_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('CONVERSATION ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ENVOYER MESSAGE
// =========================
app.post('/api/messages', async (req, res) => {
  const { conversation_id, expediteur_id, contenu } = req.body;

  if (!conversation_id || !expediteur_id || !contenu) {
    return res.status(400).json({ message: 'Champs obligatoires manquants' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO messages (conversation_id, expediteur_id, contenu)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [conversation_id, expediteur_id, contenu]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('SEND MESSAGE ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CHARGER MESSAGES D'UNE CONVERSATION ✅
// =========================
app.get('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        conversation_id,
        expediteur_id,
        contenu,
        date_envoi
      FROM messages
      WHERE conversation_id = $1
      ORDER BY date_envoi ASC
      `,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('FETCH MESSAGES ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// Marquer tous les messages d'une conversation comme lus pour un utilisateur
app.put('/api/conversations/:id/lus/:userId', async (req, res) => {
  const { id, userId } = req.params;

  try {
    const result = await pool.query(
      `
      UPDATE messages
      SET lu = TRUE
      WHERE conversation_id = $1
        AND expediteur_id != $2
        AND lu = FALSE
      RETURNING *
      `,
      [id, userId]
    );

    res.status(200).json({ updated: result.rows.length });
  } catch (err) {
    console.error('MARK AS READ ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// =========================
// LANCEMENT SERVEUR
// =========================
app.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Serveur lancé sur http://0.0.0.0:3000');
});
