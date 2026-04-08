require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static('frontend'));

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect(err => {
    if (err) console.error('Error DB:', err);
    else console.log('✅ Base de Datos Conectada');
});

// --- API: REGISTRO ---
app.post('/api/registro', async (req, res) => {
    const { email, phone, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    db.query('INSERT INTO usuarios (email, telefono, password) VALUES (?, ?, ?)', 
    [email, phone, hash], (err) => {
        if (err) return res.status(500).json({ error: 'Usuario ya existe' });
        res.json({ mensaje: 'Cuenta creada con éxito' });
    });
});

// --- API: LOGIN ---
app.post('/api/login', (req, res) => {
    const { identificador, password } = req.body;
    const query = identificador.includes('@') ? 'SELECT * FROM usuarios WHERE email = ?' : 'SELECT * FROM usuarios WHERE telefono = ?';
    
    db.query(query, [identificador], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
        const match = await bcrypt.compare(password, results[0].password);
        if (!match) return res.status(401).json({ error: 'Clave incorrecta' });
        res.json({ userId: results[0].id, email: results[0].email });
    });
});

// --- API: ENVIAR CÓDIGO 2FA ---
app.post('/api/solicitar-2fa', async (req, res) => {
    const { userId, metodo, email } = req.body;
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 5 * 60000);

    db.query('UPDATE usuarios SET codigo_2fa = ?, codigo_expiracion = ? WHERE id = ?', 
    [codigo, expiracion, userId], async (err) => {
        if (err) return res.status(500).json({ error: 'Error interno' });

        if (metodo === 'email') {
            const transporter = nodemailer.createTransport({
                service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });
            await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject: '🔐 Código de Acceso', text: `Tu código: ${codigo}` });
            res.json({ mensaje: 'Enviado a tu Gmail' });
        } 
        else if (metodo === 'telegram') {
            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🔐 *SISTEMA EMANUEL*\n\nCódigo: \`${codigo}\``, { parse_mode: 'Markdown' });
            res.json({ mensaje: 'Enviado a Telegram' });
        }
        else if (metodo === 'app') {
            db.query('SELECT secreto_2fa FROM usuarios WHERE id = ?', [userId], async (err, results) => {
                let secreto = results[0].secreto_2fa;
                if (!secreto) {
                    const nuevo = speakeasy.generateSecret({ name: "Emanuel_Seguridad" });
                    db.query('UPDATE usuarios SET secreto_2fa = ? WHERE id = ?', [nuevo.base32, userId]);
                    const qr = await qrcode.toDataURL(nuevo.otpauth_url);
                    return res.json({ requiereQR: true, qrUrl: qr, secretoManual: nuevo.base32 });
                }
                res.json({ requiereQR: false });
            });
        }
    });
});

// --- API: VERIFICAR CÓDIGO ---
app.post('/api/verificar-2fa', (req, res) => {
    const { userId, token, metodo } = req.body;
    if (metodo === 'app') {
        db.query('SELECT secreto_2fa FROM usuarios WHERE id = ?', [userId], (err, results) => {
            const ok = speakeasy.totp.verify({ secret: results[0].secreto_2fa, encoding: 'base32', token });
            if (ok) res.json({ success: true });
            else res.status(401).json({ error: 'Código de App inválido' });
        });
    } else {
        db.query('SELECT codigo_2fa, codigo_expiracion FROM usuarios WHERE id = ?', [userId], (err, results) => {
            if (token === results[0].codigo_2fa && new Date() < new Date(results[0].codigo_expiracion)) res.json({ success: true });
            else res.status(401).json({ error: 'Código incorrecto o expirado' });
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));