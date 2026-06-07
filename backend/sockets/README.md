# 🚌 AI-Powered Real-Time Route Optimization & Smart Transit System

Bu proje, toplu taşıma araçlarının doluluk oranlarını, anlık konumlarını ve yolcu taleplerini canlı olarak senkronize eden, yapay zeka destekli bir akıllı ulaşım ve rota optimizasyon sistemidir. 

## 🚀 Öne Çıkan Özellikler
- **Gerçek Zamanlı İletişim:** Socket.io ile şoför ve yolcu arasında saliseler içinde çift taraflı canlı bildirim akışı.
- **Konum Tabanlı Akıllı Algılama:** Tarayıcı GPS'i üzerinden yolcuya en yakın durağın otomatik olarak saptanması.
- **Dinamik Ücretlendirme:** Biniş ve iniş durakları arasındaki mesafeye göre anlık yolculuk ücreti hesaplama motoru.
- **Yapay Zeka Karar Mekanizması (Haversine tabanlı):** Otobüsün anlık konumunu ve duraklardaki bekleyen/inecek yolcu sayılarını analiz ederek şoföre "DUR" veya yakıt tasarrufu için "PAS GEÇ" önerisi sunan algoritma.
- **Gelişmiş Şoför Dashboard'u:** Canlı kazanç takibi, başlama saati ve Recharts kütüphanesiyle optimize edilmiş yüzdelik doluluk grafiği (Pie Chart).
- **Güvenlik Duvarı:** JWT (Json Web Token) tabanlı oturum yönetimi ve 6 haneli OTP kodlu hesap aktivasyonu ile entegre 2FA (Çift Faktörlü Doğrulama) altyapısı.

## 🛠️ Kullanılan Teknolojiler
- **Frontend:** React.js, Vite, React-Bootstrap, Leaflet Maps (Harita Entegrasyonu), Recharts, SweetAlert2.
- **Backend:** Node.js, Express.js, Socket.io, JWT, Bcrypt.
- **Database:** MySQL.