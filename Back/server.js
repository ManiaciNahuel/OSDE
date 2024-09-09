const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Enable CORS for frontend
app.use(cors({
    origin: 'http://localhost:3000',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type'
}));

// Store the QR code globally
let qrCodeString = '';

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize WhatsApp client with LocalAuth
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', (qr) => {
    qrCodeString = qr; // Store the QR code when it's generated
    /* qrcode.generate(qr, { small: true });  */
    console.log('QR code generated.');
});

client.on('ready', () => {
    console.log('WhatsApp client is ready');
});

client.on('authenticated', () => {
    console.log('Authentication successful');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected. Reconnecting...', reason);
    setTimeout(() => {
        client.initialize(); // Reinitialize after a delay
    }, 3000); // 3 seconds delay
});


// Initialize the WhatsApp client
client.initialize();

// Route to serve the QR code to the frontend
app.get('/get-qr', (req, res) => {
    if (qrCodeString) {
        res.json({ qrCode: qrCodeString });
    } else {
        res.status(404).json({ error: 'QR code not generated yet.' });
    }
});


app.get('/whatsapp-status', (req, res) => {
    if (client && client.info && client.info.wid) {
        res.json({ status: 'connected' });
    } else {
        res.json({ status: 'disconnected' });
    }
});


// Configure Nodemailer for email sending
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

// Route for uploading the file and processing the contacts
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file.path;
        const workbook = xlsx.readFile(file);
        const sheet_name_list = workbook.SheetNames;
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

        data.forEach(async (row) => {
            const prefix = row['PREFIJO'] ? row['PREFIJO'].toString().trim() : '';
            const phoneNumberRest = row['TELEFONO'] ? row['TELEFONO'].toString().trim() : '';
            const phoneNumber = `549${prefix}${phoneNumberRest}`;

            const message = row['MSJ DE PRUEBA'];
            const email = row['E-MAL'] ? row['E-MAL'].toString().trim() : '';

            // Check if the phone number has WhatsApp
            const numberId = await client.getNumberId(`${phoneNumber}@c.us`);
            if (numberId) {
                try {
                    await client.sendMessage(numberId._serialized, message);
                    console.log(`WhatsApp message sent to ${phoneNumber}`);
                } catch (err) {
                    console.error(`Failed to send WhatsApp to ${phoneNumber}. Error: ${err}`);
                }
            } else if (email) {
                // If the phone number doesn't have WhatsApp, send an email
                const mailOptions = {
                    from: process.env.EMAIL,
                    to: email,
                    subject: 'Important Message',
                    text: message
                };

                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`Email sent to ${email}`);
                } catch (error) {
                    console.error(`Failed to send email to ${email}. Error: ${error}`);
                }
            } else {
                console.log(`Contact missing phone and email: ${row['APELLIDO Y NOMBRE']}`);
            }
        });

        // Delete the uploaded file after processing
        fs.unlinkSync(file);

        res.status(200).send('File processed and messages sent');
    } catch (error) {
        console.error('Error processing the file:', error);
        res.status(500).send('Error processing the file');
    }
});

// Start the server
app.listen(3001, () => {
    console.log('Server listening on port 3001');
});
