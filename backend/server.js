// backend/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json()); 

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes); 

app.get('/', (req, res) => {
    res.send('AI-Powered Route Optimization API Çalışıyor! 🚌');
});

app.get('/api/protected-test', authMiddleware, (req, res) => {
    res.json({
        message: 'Tebrikler! Güvenlik duvarını geçtiniz. 🛡️',
        user_data: req.user 
    });
});

// GÜNCELLENEN KISIM: React 5173 portundan geldiği için "*" diyerek tümüne izin veriyoruz
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT"]
    }
});

// Soket işlemleri dış dosyadan yönetiliyor
const socketHandler = require('./sockets/socketHandler');
socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portu üzerinde yayında! 🚀`);
});