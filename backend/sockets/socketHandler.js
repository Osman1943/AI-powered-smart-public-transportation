// backend/sockets/socketHandler.js
const db = require('../config/db');

// İki nokta arasındaki mesafeyi hesaplayan Haversine Formülü
function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km cinsinden mesafe
}

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('Canlı soket bağlantısı kuruldu, ID:', socket.id);

        // 1. SEFER ODASINA KATILMA (Yolcu veya Sürücü odaya girer)
        socket.on('join_trip', (data) => {
            // Frontend ile birebir eşleşmesi için oda adını doğrudan Trip ID yapıyoruz
            const room = data.tripId.toString();
            socket.join(room);
            socket.tripId = data.tripId;
            socket.userId = data.userId;
            socket.role = data.role;
            console.log(`[SOKET] ${data.role} (${data.userId}), ${room} numaralı odaya katıldı.`);
        });

        // 2. YOLCU DURAKTA BEKLİYOR SİNYALİ
        socket.on('passenger_waiting', async (data) => {
            const room = data.tripId.toString();
            console.log(`[SOKET] Sinyal Geldi! Sefer ID: ${data.tripId}, Durak ID: ${data.stopId}`);

            // ÖNCELİK 1: ŞOFÖRE BİLDİRİMİ ANINDA FIRLAT! (Veritabanı tablosu olmasa bile bu çalışsın)
            io.to(room).emit('passenger_waiting_notification', data);
            console.log(`[SOKET] Bildirim odadaki şoföre başarıyla iletildi.`);

            // ÖNCELİK 2: Veritabanına kaydetmeyi dene
            try {
                await db.query(
                    "INSERT INTO passenger_requests (user_id, stop_id, trip_id, board_stop_id, status) VALUES (?, ?, ?, ?, 'waiting')",
                    [data.userId, data.stopId, data.tripId, data.stopId]
                );
            } catch (err) {
                console.log('Not: passenger_requests tablosu henüz yok ama sorun değil, bildirim şoföre ulaştı.');
            }
        });
        // YOLCU BEKLEMEKTEN VAZGEÇTİ (İPTAL SİNYALİ)
        socket.on('cancel_passenger_waiting', async (data) => {
            const room = data.tripId.toString();
            console.log(`[SOKET] İptal Geldi! Sefer ID: ${data.tripId}, Durak ID: ${data.stopId}`);

            // Şoföre "Yolcu vazgeçti, pas geçebilirsin" sinyalini fırlat
            io.to(room).emit('passenger_cancelled_notification', data);

            // Veritabanındaki "waiting" durumunu "cancelled" olarak güncelle
            try {
                await db.query(
                    "UPDATE passenger_requests SET status = 'cancelled' WHERE user_id = ? AND trip_id = ? AND stop_id = ? AND status = 'waiting'",
                    [data.userId, data.tripId, data.stopId]
                );
            } catch (err) { }
        });

        // 3. OTOBÜS GPS VE DURAK ATALAMA ALGORİTMASI (Şoför konum bastıkça çalışır)
        socket.on('bus_location_update', async (data) => {
            const room = socket.tripId ? socket.tripId.toString() : data.tripId?.toString();
            if (!room) return;

            try {
                // Otobüsün anlık konumunu güncelle
                await db.query(
                    "UPDATE buses b JOIN trips t ON b.bus_id = t.bus_id SET b.current_latitude = ?, b.current_longitude = ? WHERE t.trip_id = ?",
                    [data.lat, data.lng, room]
                );

                // Yaklaşılan sonraki durağın bilgilerini çek
                const [stopData] = await db.query("SELECT * FROM stops WHERE stop_order = ?", [data.nextStopOrder]);

                if (stopData.length > 0) {
                    const targetStop = stopData[0];
                    let waitingCount = 0;
                    let alightingCount = 0;

                    // Tablolar yoksa kod çökmesin diye Try-Catch içine aldık
                    try {
                        const [waiting] = await db.query(
                            "SELECT COUNT(*) as count FROM passenger_requests WHERE trip_id = ? AND stop_id = ? AND status = 'waiting'",
                            [room, targetStop.stop_id]
                        );
                        waitingCount = waiting[0].count;

                        const [alighting] = await db.query(
                            "SELECT COUNT(*) as count FROM passenger_requests WHERE trip_id = ? AND alight_stop_id = ? AND status = 'boarded'",
                            [room, targetStop.stop_id]
                        );
                        alightingCount = alighting[0].count;
                    } catch (e) { }

                    // Karar mekanizması
                    let decision = 'SKIP'; // Kimse yoksa pas geç önerisi
                    let reason = 'Durakta bekleyen veya inecek yolcu yok. Yakıt tasarrufu sağlayabilirsiniz.';

                    if (waitingCount > 0 || alightingCount > 0) {
                        decision = 'STOP';
                        reason = 'Aktif yolcu saptandı. Bu durakta durmanız gerekmektedir.';
                    }

                    // Hesaplanan mesafeye göre ETA (Tahmini Varış Süresi) bulma
                    const distance = calculateHaversine(data.lat, data.lng, targetStop.latitude, targetStop.longitude);
                    const etaMinutes = Math.round((distance / 25) * 60 + (waitingCount * 0.5)); // 25 km/h hız varsayımı

                    // Şoföre durup durmama kararını anlık gönder
                    socket.emit('driver_decision_suggestion', {
                        nextStopName: targetStop.stop_name,
                        decision,
                        reason
                    });


                    // Yolculara da otobüsün konumunu ve kalan dakikasını anlık yayınla
                    // Yolculara da otobüsün konumunu ve kalan dakikasını anlık yayınla
                    io.to(room).emit('bus_status_broadcast', {
                        lat: data.lat,
                        lng: data.lng,
                        nextStopName: targetStop.stop_name,
                        etaMinutes,
                        plateNumber: data.plateNumber,
                        driverName: data.driverName,
                        passengerCount: data.passengerCount, // YENİ: Binen Yolcu Sayısı
                        capacity: data.capacity              // YENİ: Otobüs Kapasitesi
                    });
                }
            } catch (err) {
                console.error('Soket GPS güncelleme hatası:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log('Kullanıcı soketten ayrıldı:', socket.id);
        });
    });
};

module.exports = socketHandler;