// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    // İstek başlığından (Headers) Authorization kısmını alıyoruz
    const authHeader = req.headers['authorization'];
    
    // Header mevcut mu ve 'Bearer <token>' formatında mı kontrol ediyoruz
    const token = authHeader && authHeader.split(' ')[1];

    // Eğer token gönderilmemişse erişimi engelle (401 Unauthorized)
    if (!token) {
        return res.status(401).json({ error: 'Erişim engellendi! Giriş jetonu (token) bulunamadı.' });
    }

    try {
        // Token'ı gizli anahtarımızla çözüp doğruluyoruz
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Çözülen kullanıcı bilgilerini (id ve rol) req nesnesine ekliyoruz
        // Böylece bu middleware'den sonraki fonksiyonlar req.user.userId diyerek kullanıcıya ulaşabilecek
        req.user = decoded;
        
        // Her şey yolunda, bir sonraki fonksiyona geçiş izni veriyoruz
        next();
    } catch (error) {
        console.error('Token doğrulama hatası:', error.message);
        return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş giriş jetonu!' });
    }
};