const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const router = express.Router();

// Configurar multer para la carga de archivos
const upload = multer({ dest: 'uploads/' });

// Inicializar cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

client.on('qr', (qr) => {
  console.log('Código QR generado:', qr);
  // Puedes guardar este QR y enviarlo al cliente cuando lo solicite
});

client.on('ready', () => {
  console.log('Cliente de WhatsApp listo');
});

client.initialize();

// Ruta para obtener el estado de WhatsApp
router.get('/whatsapp-status', (req, res) => {
  if (client && client.info && client.info.wid) {
    res.json({ status: 'connected' });
  } else {
    res.json({ status: 'disconnected' });
  }
});

// Ruta para obtener el código QR de WhatsApp
router.get('/get-qr', (req, res) => {
  // Enviar el código QR almacenado
  res.json({ qrCode: 'QR_GENERADO_PREVIAMENTE' });
});

// Ruta para subir archivos y procesar contactos
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file.path;
    const workbook = xlsx.readFile(file);
    const sheetNameList = workbook.SheetNames;
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);

    // Lógica para procesar los contactos y enviar mensajes
    data.forEach(async (row) => {
      const phoneNumber = `549${row['TELEFONO']}`;
      const message = row['MSJ DE PRUEBA'];

      const numberId = await client.getNumberId(`${phoneNumber}@c.us`);
      if (numberId) {
        await client.sendMessage(numberId._serialized, message);
        console.log(`Mensaje enviado a ${phoneNumber}`);
      }
    });

    fs.unlinkSync(file); // Eliminar el archivo después de procesarlo
    res.status(200).send('Archivo procesado y mensajes enviados');
  } catch (error) {
    console.error('Error al procesar el archivo:', error);
    res.status(500).send('Error al procesar el archivo');
  }
});

module.exports = router;
