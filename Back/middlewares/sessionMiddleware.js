const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configuración del middleware de sesión
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: 'mysecret', // Cambia esto por algo más seguro
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: false } // secure: false para desarrollo
});

module.exports = sessionMiddleware;
