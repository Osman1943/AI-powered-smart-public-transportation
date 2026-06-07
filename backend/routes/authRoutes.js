// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// /api/auth/register -> Yeni kayıt (is_active: 0 olarak eklenir)
router.post('/register', authController.register);

// /api/auth/activate -> Ön yüzden gönderilen 6 haneli kod ile aktivasyon
router.post('/activate', authController.activateWithCode);

// /api/auth/login -> Kullanıcı girişi
router.post('/login', authController.login);

// /api/auth/verify-2fa -> 2FA kod onayı
router.post('/verify-2fa', authController.verify2FA);

module.exports = router;