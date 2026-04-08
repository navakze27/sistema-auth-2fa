const form = document.getElementById('formularioLogin');

form.addEventListener('submit', async function(evento) {
    evento.preventDefault();

    // Obtenemos lo que escribió el usuario
    const identificador = document.getElementById('identificador').value;
    const password = document.getElementById('password').value;

    // TRUCO: ¿Cómo sabemos si escribió un correo o un teléfono?
    // Si tiene una arroba '@', asumimos que es correo. Si no, es teléfono.
    const esCorreo = identificador.includes('@');
    
    // Preparamos los datos tal como los espera nuestro backend en server.js
    const cuerpoPeticion = {
        email: esCorreo ? identificador : null,
        phone: !esCorreo ? identificador : null,
        password: password
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpoPeticion)
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // Si la contraseña es correcta, el backend nos dice require2FA: true
            if (datos.require2FA) {
                alert('¡Contraseña correcta! ' + datos.mensaje);
                
                // Guardamos en la "memoria a corto plazo" del navegador quién está intentando entrar
                // Esto es vital para no perder el rastro del usuario al cambiar de pantalla
                sessionStorage.setItem('temp_userId', datos.userId);
                sessionStorage.setItem('temp_2fa_method', datos.two_factor_method);
                
                // Lo mandamos a la pantalla de verificación (que crearemos en el siguiente paso)
                window.location.href = 'verificacion.html';
            }
        } else {
            // Si la contraseña está mal o el usuario no existe
            alert('Acceso denegado: ' + datos.error);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar con el servidor.');
    }
});