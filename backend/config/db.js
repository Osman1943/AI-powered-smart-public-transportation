const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Bağlantıyı test etme amaçlı yazılan console log.
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Veritabanına bağlanırken hata oluştu:', err.message);
    } else {
        console.log('MySQL Veritabanı bağlantısı başarıyla sağlandı! 🗄️');
        connection.release();
    }
});

module.exports = pool.promise(); // Asenkron (async/await) sorgular için promise yapısını dışa aktarıyoruz