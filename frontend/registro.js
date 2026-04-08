const form = document.getElementById('formularioRegistro');

form.addEventListener('submit', async function(evento) {
    evento.preventDefault();

    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const two_factor_method = document.getElementById('two_factor_method').value;

    try {
        const respuesta = await fetch('http://localhost:3000/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email || null,
                phone: phone || null,
                password: password,
                two_factor_method: two_factor_method
            })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            document.getElementById('formularioRegistro').style.display = 'none';
            document.getElementById('titulo-pantalla').style.display = 'none';
            
            if (datos.qrCodeUrl) {
                document.getElementById('seccion-qr').style.display = 'block';
                document.getElementById('imagen-qr').src = datos.qrCodeUrl;
                document.getElementById('codigo-manual').innerText = datos.secret;
            } else {
                alert('Registrado. Elegiste un método distinto a la App.');
            }
        } else {
            alert('Error: ' + datos.error);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar con el servidor.');
    }
});