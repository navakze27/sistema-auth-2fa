const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos el "pool" de conexiones usando los nombres exactos de tu .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS, // Corregido: antes decía DB_PASSWORD
    database: process.env.DB_NAME, // Corregido: agregada la coma al final
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Exportamos el pool directamente para que server.js lo use
module.exports = pool;