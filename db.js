const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rivo_db',
  password: 'DIRECT@2017',
  port: 5432,
});

module.exports = pool;
