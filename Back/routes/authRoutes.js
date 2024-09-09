const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const router = express.Router();

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Ruta de login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user.id;
      res.send('Inicio de sesión exitoso');
    } else {
      res.status(401).send('Credenciales incorrectas');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al iniciar sesión');
  }
});

// Ruta de registro
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).send('Usuario registrado');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al registrar usuario');
  }
});

// Ruta de logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error al cerrar sesión');
    }
    res.send('Sesión cerrada exitosamente');
  });
});

module.exports = router;
