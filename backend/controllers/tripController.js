// backend/controllers/tripController.js
const db = require('../config/db');

// 1. YENİ SEFER BAŞLATMA (POST /api/trips)
exports.startTrip = async (req, res) => {
    try {
        const { plate_number, capacity } = req.body;
        const driverId = req.user.userId; // Auth middleware'den gelen şoför ID'si

        // Sürücünün zaten aktif bir seferi var mı kontrol edelim
        const [activeDriverTrip] = await db.query(
            "SELECT t.* FROM trips t JOIN buses b ON t.bus_id = b.bus_id WHERE b.driver_id = ? AND t.status = 'active'",
            [driverId]
        );

        if (activeDriverTrip.length > 0) {
            return res.status(400).json({ error: 'Zaten aktif bir seferiniz bulunmaktadır. Önce onu sonlandırın!' });
        }

        // Otobüs veritabanında var mı, yoksa yeni otobüs kaydı açalım mı?
        let [bus] = await db.query('SELECT * FROM buses WHERE plate_number = ?', [plate_number]);
        let busId;

        if (bus.length === 0) {
            // Yeni otobüs kaydı açıyoruz
            const [newBus] = await db.query(
                'INSERT INTO buses (plate_number, capacity, driver_id, status) VALUES (?, ?, ?, "active")',
                [plate_number, capacity || 40, driverId]
            );
            busId = newBus.insertId;
        } else {
            busId = bus[0].bus_id;
            // Var olan otobüsün şoförünü ve durumunu güncelliyoruz
            await db.query('UPDATE buses SET driver_id = ?, status = "active" WHERE bus_id = ?', [driverId, busId]);
        }

        // Canlı seferi (trips tablosuna) başlatıyoruz
        const [tripResult] = await db.query(
            'INSERT INTO trips (bus_id, status) VALUES (?, "active")',
            [busId]
        );

        res.status(201).json({
            message: 'Sefer başarıyla başlatıldı! Yol boyu iyi sürüşler. 🚌',
            tripId: tripResult.insertId,
            busId: busId
        });

    } catch (error) {
        console.error('Sefer başlatma hatası:', error);
        res.status(500).json({ error: 'Sefer başlatılırken sunucu hatası oluştu.' });
    }
};

// 2. SEFERİ SONLANDIRMA (PUT /api/trips/:id/end)
exports.endTrip = async (req, res) => {
    try {
        const tripId = req.params.id;

        // Sefer durumunu completed yap ve bitiş zamanını yaz
        const [result] = await db.query(
            "UPDATE trips SET status = 'completed', ended_at = NOW() WHERE trip_id = ? AND status = 'active'",
            [tripId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Aktif sefer bulunamadı veya zaten sonlandırılmış.' });
        }

        // Otobüsün durumunu tekrar boşa çıkar (idle yap)
        const [tripData] = await db.query('SELECT bus_id FROM trips WHERE trip_id = ?', [tripId]);
        if (tripData.length > 0) {
            await db.query('UPDATE buses SET status = "idle" WHERE bus_id = ?', [tripData[0].bus_id]);
        }

        res.status(200).json({ message: 'Sefer başarıyla sonlandırıldı. Geçmiş olsun!' });

    } catch (error) {
        console.error('Sefer bitirme hatası:', error);
        res.status(500).json({ error: 'Sefer sonlandırılırken sunucu hatası oluştu.' });
    }
};