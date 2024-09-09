const cors = require('cors');

const corsMiddleware = cors({
  origin: 'http://localhost:3000', // Asegúrate de que este sea el origen correcto
  methods: ['GET', 'POST'],
  credentials: true // Permitir envío de cookies o credenciales
});

module.exports = corsMiddleware;
