const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    const user = result.rows[0];

    const motDePasseValide = await bcrypt.compare(
      motDePasse,
      user.mot_de_passe
    );

    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user.id },
      'SECRET_KEY',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
