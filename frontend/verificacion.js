// 1. Verificamos que el usuario venga del Login
// Recuperamos el "gafete" temporal que guardamos en el Paso 8
const userId = sessionStorage.getItem('temp_userId');

if (!userId) {
    // Si alguien intenta entrar directo a verificacion.html sin pasar por el login, lo pateamos fuera.
    alert('Acceso no autorizado. Por favor inicia sesión primero.');
    window.location.href = 'login.html';
}

// 2. Manejamos el envío del código
const form = document.getElementById('formularioVerificacion');

form.addEventListener('submit', async function(evento) {
    evento.preventDefault();

    const codigo = document.getElementById('codigo2fa').value;

    try {
        // Hacemos una petición a una NUEVA ruta en el backend (que crearemos en el paso 10)
        const respuesta = await fetch('http://localhost:3000/api/verificar-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                token: codigo
            })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // ¡ÉXITO TOTAL! El código era correcto.
            alert('¡Acceso concedido! Bienvenido al sistema.');
            
            // Destruimos el "gafete" temporal por seguridad
            sessionStorage.removeItem('temp_userId');
            sessionStorage.removeItem('temp_2fa_method');
            
            // Aquí lo mandaríamos al "Dashboard" o página principal de tu aplicación.
            // Como aún no la tenemos, simplemente lo redirigimos a una página en blanco simulada o recargamos.
            document.body.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100vh;"><h1>🔐 ¡Bienvenido, estás dentro del sistema seguro!</h1></div>';

        } else {
            // El código estaba mal
            alert('Error de verificación: ' + datos.error);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar con el servidor.');
    }
});