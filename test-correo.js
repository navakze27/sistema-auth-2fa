const { enviarCorreo2FA } = require('./mailer.js');

console.log('⏳ Intentando enviar correo de prueba...');

// 👇 PON AQUÍ TU CORREO REAL PARA RECIBIR LA PRUEBA 👇
enviarCorreo2FA('emanuelpereznava52@gmail.com', '123456')
    .then(exito => {
        if(exito) console.log('¡Prueba superada! Revisa tu bandeja de entrada.');
        else console.log('Algo falló. Revisa tu consola.');
    });