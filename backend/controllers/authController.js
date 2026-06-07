// backend/controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // (Eski kodlar için kalsın, ileride lazım olabilir)
require('dotenv').config();

// 1. KULLANICI KAYIT (REGISTER)
exports.register = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;

        // E-posta adresi veritabanında zaten var mı kontrol ediyoruz
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda!' });
        }

        // Güvenlik için şifreyi bcrypt ile hash'liyoruz (saltRounds: 12)
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Kullanıcıyı ilk başta PASİF (is_active = 0) olarak veritabanına ekliyoruz
        const [userResult] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 0)',
            [full_name, email, password_hash, role || 'passenger']
        );
        const userId = userResult.insertId;

        // URL tokeni yerine 6 HANELİ AKTİVASYON KODU üretiyoruz (Örn: 582910)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat geçerli

        // Üretilen kodu otp_tokens tablosuna yazıyoruz
        await db.query(
            'INSERT INTO otp_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)',
            [userId, otpCode, 'email_activation', expiresAt]
        );

        //---------------------------------------------------------------------------------
        // GELİŞTİRME ORTAMI (DEVELOPMENT) ÖZEL AYARI:
        // Gerçek bir SMTP/Gmail sunucusu kurana kadar, üretilen kodu 
        // doğrudan terminal (konsol) ekranına yazdırıyoruz ki test edebilelim.
        //---------------------------------------------------------------------------------
        console.log(`\n========================================`);
        console.log(`✉️ YENİ KAYIT YAPILDI - ${email}`);
        console.log(`🔑 Aktivasyon Kodunuz: ${otpCode}`);
        console.log(`========================================\n`);

        res.status(201).json({ 
            message: 'Kayıt başarılı! Lütfen hesabınızı aktifleştirmek için e-postanıza (konsola) gönderilen 6 haneli kodu girin.' 
        });

    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ error: 'Kayıt işlemi sırasında bir sunucu hatası oluştu.' });
    }
};

// 2. KOD İLE E-POSTA AKTİVASYONU (ACTIVATE)
exports.activateWithCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        // Kullanıcıyı bul
        const [users] = await db.query('SELECT user_id, is_active FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
        }

        const user = users[0];

        // Eğer zaten aktifse uyar
        if (user.is_active === 1) {
            return res.status(400).json({ error: 'Hesabınız zaten aktif! Doğrudan giriş yapabilirsiniz.' });
        }

        // Kod geçerli mi, süresi dolmuş mu veya kullanılmış mı kontrolü
        const [record] = await db.query(
            "SELECT * FROM otp_tokens WHERE user_id = ? AND token = ? AND type = 'email_activation' AND expires_at > NOW() AND used = 0",
            [user.user_id, code]
        );

        if (record.length === 0) {
            return res.status(400).json({ error: 'Girdiğiniz aktivasyon kodu geçersiz veya süresi dolmuş!' });
        }

        // Kodu doğru girdiyse: Hesabı aktifleştir ve kodu kullanıldı olarak işaretle
        await db.query('UPDATE users SET is_active = 1 WHERE user_id = ?', [user.user_id]);
        await db.query('UPDATE otp_tokens SET used = 1 WHERE token_id = ?', [record[0].token_id]);

        res.status(200).json({ message: 'Harika! Hesabınız başarıyla aktifleştirildi. Artık giriş yapabilirsiniz.' });

    } catch (error) {
        console.error('Aktivasyon hatası:', error);
        res.status(500).json({ error: 'Aktivasyon işlemi sırasında bir sunucu hatası oluştu.' });
    }
};

// 3. KULLANICI GİRİŞİ (LOGIN - 1. AŞAMA)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı veritabanında ara
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Geçersiz e-posta adresi veya şifre!' });
        }

        const user = users[0];

        // Hesabı aktif mi kontrol et
        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Lütfen önce hesabınızı aktifleştirin!' });
        }

        // Şifre kontrolü (bcrypt.compare)
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Geçersiz e-posta adresi veya şifre!' });
        }

        // DÖKÜMANTASYON GEREĞİ: Çift Faktörlü Doğrulama (2FA) Aktif mi kontrolü
        if (user.is_2fa_enabled === 1) {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika geçerli

            await db.query(
                'INSERT INTO otp_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)',
                [user.user_id, otpCode, '2fa', expiresAt]
            );

            console.log(`[Geliştirme Modu] ${user.full_name} için üretilen 2FA Kodu: ${otpCode}`);

            return res.status(200).json({ 
                requires2FA: true, 
                userId: user.user_id,
                message: 'Çift faktörlü doğrulama kodu e-postanıza gönderildi.',
                debug_code: otpCode
            });
        }

        // Eğer 2FA aktif değilse doğrudan JWT token çiftini üretip dönüyoruz
        const jwt = require('jsonwebtoken');
        const accessToken = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.user_id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            message: 'Giriş başarılı!',
            accessToken,
            refreshToken,
            user: { user_id: user.user_id, full_name: user.full_name, role: user.role, email: user.email }
        });

    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ error: 'Giriş işlemi sırasında bir sunucu hatası oluştu.' });
    }
};

// 4. 2FA KOD DOĞRULAMA (VERIFY-2FA - 2. AŞAMA)
exports.verify2FA = async (req, res) => {
    try {
        const { userId, code } = req.body;

        // Kod geçerli mi, süresi dolmuş mu veya kullanılmış mı kontrolü
        const [record] = await db.query(
            "SELECT * FROM otp_tokens WHERE user_id = ? AND token = ? AND type = '2fa' AND expires_at > NOW() AND used = 0",
            [userId, code]
        );

        if (record.length === 0) {
            return res.status(400).json({ error: 'Girilen 2FA kodu geçersiz ya da süresi dolmuş!' });
        }

        const tokenId = record[0].token_id;

        // Kod kullanıldı olarak işaretleniyor
        await db.query('UPDATE otp_tokens SET used = 1 WHERE token_id = ?', [tokenId]);

        // Kullanıcı rolünü alıp nihai JWT'leri üretiyoruz
        const [users] = await db.query('SELECT role FROM users WHERE user_id = ?', [userId]);
        const userRole = users[0].role;

        const jwt = require('jsonwebtoken');
        const accessToken = jwt.sign({ userId, role: userRole }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            message: 'İki aşamalı doğrulama başarılı. Giriş yapıldı!',
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('2FA doğrulama hatası:', error);
        res.status(500).json({ error: 'Doğrulama sırasında sunucu hatası oluştu.' });
    }
};