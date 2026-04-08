const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarCorreo2FA = async (correoDestino, codigo) => {
    try {
        const mailOptions = {
            from: `"Sistema de Seguridad" <${process.env.EMAIL_USER}>`,
            to: correoDestino,
            subject: 'Tu Código de Verificación 2FA 🔐',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Verificación de Seguridad</h2>
                    <p>Alguien está intentando iniciar sesión en tu cuenta.</p>
                    <p>Si eres tú, ingresa el siguiente código:</p>
                    <h1 style="color: #1e3c72; letter-spacing: 5px; background: #f4f4f4; padding: 10px; border-radius: 8px; display: inline-block;">${codigo}</h1>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Correo enviado exitosamente a ${correoDestino}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando el correo:', error);
        return false;
    }
};

module.exports = { enviarCorreo2FA };