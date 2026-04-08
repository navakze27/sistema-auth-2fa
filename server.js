const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
require('dotenv').config();
const db = require('./db');
const { enviarCorreo2FA } = require('./mailer'); // ¡Llamamos al cartero!

const app = express();

app.use(cors());
app.use(express.json());
// Le decimos al servidor que también sirva nuestra página web
app.use(express.static('frontend'));

// Memoria temporal para guardar los códigos de correo (expiran en 5 mins)
const codigosCorreo = new Map();

// ==========================================
// 1. REGISTRO (Simple)
// ==========================================
app.post('/api/registro', async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if (!password || (!email && !phone)) {
            return res.status(400).json({ error: 'Faltan datos obligatorios.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const query = `INSERT INTO users (email, phone, password_hash) VALUES (?, ?, ?)`;
        await db.query(query, [email || null, phone || null, passwordHash]);

        res.status(201).json({ mensaje: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El correo o teléfono ya está registrado.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ==========================================
// 2. LOGIN (Paso 1: Validar contraseña)
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        let query = email ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE phone = ?';
        const [usuarios] = await db.query(query, [email || phone]);

        if (usuarios.length === 0) return res.status(401).json({ error: 'Usuario no encontrado.' });

        const usuario = usuarios[0];
        const contrasenaValida = await bcrypt.compare(password, usuario.password_hash);

        if (!contrasenaValida) return res.status(401).json({ error: 'Contraseña incorrecta.' });

        // Contraseña correcta -> Le avisamos al frontend para que pregunte el método 2FA
        res.status(200).json({
            mensaje: 'Credenciales correctas.',
            userId: usuario.id,
            email: usuario.email // Se lo mandamos por si elige "Correo"
        });

    } catch (error) {
        res.status(500).json({ error: 'Error en el login.' });
    }
});

// ==========================================
// 3. SOLICITAR 2FA (El usuario elige Correo o App)
// ==========================================
app.post('/api/solicitar-2fa', async (req, res) => {
    const { userId, metodo, email } = req.body;

    try {
        if (metodo === 'email') {
            if (!email) return res.status(400).json({ error: 'No tienes un correo registrado para usar esta opción.' });
            
            // Generamos un código de 6 números (ej. 849201)
            const codigoAleatorio = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Guardamos en memoria con expiración de 5 minutos
            codigosCorreo.set(userId, {
                codigo: codigoAleatorio,
                expira: Date.now() + 5 * 60 * 1000 
            });

            // Usamos tu cartero para enviar el correo real
            const enviado = await enviarCorreo2FA(email, codigoAleatorio);
            
            if (enviado) res.status(200).json({ mensaje: 'Código enviado a tu correo.' });
            else res.status(500).json({ error: 'No se pudo enviar el correo.' });

        } else if (metodo === 'app') {
            // Buscamos si ya tiene un QR generado
            const [usuarios] = await db.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
            
            if (usuarios[0].two_factor_secret) {
                // Ya lo tiene configurado, solo le pedimos que abra su app
                res.status(200).json({ mensaje: 'Abre tu app autenticadora.', requiereQR: false });
            } else {
                // Primera vez -> Generamos Secreto y QR
                const secret = speakeasy.generateSecret({ name: `Acceso Seguro (${email || 'Usuario'})` });
                await db.query('UPDATE users SET two_factor_secret = ? WHERE id = ?', [secret.base32, userId]);
                const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
                
                res.status(200).json({ 
                    mensaje: 'Escanea este QR en tu Google Authenticator.', 
                    requiereQR: true, 
                    qrUrl: qrCodeUrl,
                    secretoManual: secret.base32
                });
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Error procesando solicitud 2FA.' });
    }
});

// ==========================================
// 4. VERIFICAR 2FA (Paso Final)
// ==========================================
app.post('/api/verificar-2fa', async (req, res) => {
    const { userId, token, metodo } = req.body;

    try {
        if (metodo === 'email') {
            const dataTemporal = codigosCorreo.get(userId);
            
            if (!dataTemporal) return res.status(400).json({ error: 'Código no solicitado o expirado.' });
            if (Date.now() > dataTemporal.expira) return res.status(400).json({ error: 'El código ya expiró.' });
            if (dataTemporal.codigo !== token) return res.status(401).json({ error: 'Código incorrecto.' });

            codigosCorreo.delete(userId); // Borramos el código usado
            res.status(200).json({ mensaje: '¡Acceso concedido vía Correo!' });

        } else if (metodo === 'app') {
            const [usuarios] = await db.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
            
            const esValido = speakeasy.totp.verify({
                secret: usuarios[0].two_factor_secret, 
                encoding: 'base32', 
                token: token, 
                window: 1
            });

            if (esValido) res.status(200).json({ mensaje: '¡Acceso concedido vía App!' });
            else res.status(401).json({ error: 'Código de app inválido.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error verificando el código.' });
    }
});

// INICIO
db.query('SELECT 1').then(() => {
    console.log('✅ Base de datos conectada.');
    app.listen(process.env.PORT || 3000, () => console.log('🚀 Servidor corriendo en puerto 3000.'));
});