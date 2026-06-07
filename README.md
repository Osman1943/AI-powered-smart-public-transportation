# 🚌 AI-Powered Smart Public Transportation System

Bu proje, toplu taşıma araçlarının anlık konumlarını, yolcu doluluk oranlarını ve yolcu taleplerini canlı olarak senkronize eden bir akıllı ulaşım sistemidir.

## 🛠️ Teknolojiler
- **Frontend:** React, Vite, Socket.io-client, Leaflet Maps, React-Bootstrap, Recharts.
- **Backend:** Node.js, Express, Socket.io, MySQL, JWT, Bcrypt.

## 💡 Temel Özellikler
- **Canlı Takip:** Yolcu, otobüsün konumunu ve ETA süresini harita üzerinde anlık görür.
- **Şoför Paneli:** Sefer başlatma, canlı doluluk oranı takibi ve kazanç gösterge paneli.
- **Yolcu Talebi:** Yolcu, durakta beklediğini şoföre bildirebilir.
- **Güvenlik:** OTP kodlu kayıt ve 2FA (Çift Faktörlü Doğrulama) sistemi.

## 🚀 Nasıl Çalıştırılır?
1. Repoyu klonlayın: `git clone [linkin]`
2. Backend klasörüne gidin ve `.env` dosyasını oluşturun.
3. `npm install` komutuyla bağımlılıkları yükleyin.
4. `npm run dev` ile uygulamayı başlatın.
# 🚌 AI-Powered Real-Time Public Transportation & Route Optimization System

An advanced, full-stack, real-time transit management platform designed to optimize urban mobility, reduce fuel consumption, and bridge the communication gap between transit drivers and passengers. 

## 🌟 Key Features

### 📡 Real-Time Synchronized Fleet Tracking
*   **Live Bus Tracking & ETAs:** Passengers can monitor the real-time movement of buses on interactive maps with dynamically updating Estimated Time of Arrival (ETA).
*   **Bi-Directional Socket Signaling:** Passengers can send a "Waiting at Stop" signal directly to the driver's screen. If a passenger changes their mind, a "Cancellation" signal instantly updates the driver's console and reverts the passenger interface smoothly.

### 🧠 Intelligent Rota & Fuel Optimization
*   **Haversine Decision Algorithm:** The backend incorporates a Haversine formula-based algorithm to evaluate the bus's current GPS coordinates against the coordinates of the upcoming stop.
*   **Smart Stop/Skip Advice:** By analyzing live passenger boarding requests and onboard alighting counts, the system advises the driver to either **STOP** or **SKIP** the stop, significantly eliminating unnecessary stop-starts and optimizing fuel efficiency.

### 🗺️ Geolocation & Dynamic Fare Engine
*   **Automated Stop Detection:** Uses browser geolocation APIs to find the passenger’s coordinates and automatically select the nearest transit stop.
*   **Index-Based Fare Calculation:** Dynamically calculates transit fares based on the distance (stop delta) between the selected boarding and alighting locations.

### 📊 Comprehensive Driver Command Center
*   **Advanced Analytics Dashboard:** Drivers gain access to a full-fledged command board tracking active routes, plate numbers, start times, and aggregated real-time earnings.
*   **Live Occupancy Visualization:** Displays real-time passenger-to-capacity metrics utilizing **Recharts** interactive Pie Charts, complete with conditional color states (Success/Warning/Danger).

### 🔒 Enterprise-Grade Security Architecture
*   **Session Management:** Secure authentication infrastructure powered by JSON Web Tokens (JWT) with separate access and refresh token mechanisms.
*   **Multi-Stage Verification:** New registrations are initialized in a passive state (`is_active = 0`) and require a 6-digit OTP code validation.
*   **Two-Factor Authentication (2FA):** Optional secondary layer generating time-sensitive login verification tokens logged securely via the backend workflow.

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React.js (Vite), Leaflet Maps (OpenStreetMap), React-Bootstrap, Recharts, Socket.io-client, SweetAlert2 |
| **Backend** | Node.js, Express.js, Socket.io, JWT, Bcrypt, Crypto |
| **Database** | MySQL |

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16.x or higher)
*   MySQL Server

### Installation & Setup

1. **Clone the Repository:**
```bash
   git clone [https://github.com/Osman1943/AI-powered-smart-public-transportation.git](https://github.com/Osman1943/AI-powered-smart-public-transportation.git)
   cd AI-powered-smart-public-transportation
