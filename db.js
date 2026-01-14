/*const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rivo_db',
  password: 'DIRECT@2017',
  port: 5432,
});

module.exports = pool;
*/

require('dotenv').config();
const { Pool } = require('pg');


const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } // obligatoire pour Supabase
});

module.exports = pool;
