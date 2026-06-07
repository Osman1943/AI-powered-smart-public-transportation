import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
// Değişiklik A: ProgressBar ve FaUsers import edildi
import { Card, Form, Button, Container, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { FaUserAlt, FaMapMarkerAlt, FaSatelliteDish, FaRegClock, FaBusAlt, FaHandPaper, FaTimesCircle, FaWallet, FaRoute, FaMagic, FaUsers } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaUserTie, FaIdCard } from 'react-icons/fa'; 

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const STOPS_DATABASE = [
  { id: '1', name: '1 - Merkez Kampüs Girişi', lat: 40.6500, lng: 35.8300, order: 1 },
  { id: '2', name: '2 - Mühendislik Fakültesi', lat: 40.6520, lng: 35.8330, order: 2 },
  { id: '3', name: '3 - Kütüphane', lat: 40.6550, lng: 35.8360, order: 3 },
  { id: '4', name: '4 - Öğrenci Yurtları', lat: 40.6580, lng: 35.8400, order: 4 }
];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15, { animate: true });
  }, [center, map]);
  return null;
}

export default function PassengerPanel() {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('Kampüs-Hatti'); // Ortak Oda Adı
  const [boardStop, setBoardStop] = useState('1');
  const [alightStop, setAlightStop] = useState('4');
  const [estimatedFare, setEstimatedFare] = useState(0);

  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [busStatus, setBusStatus] = useState(null);
  const [waitingRequested, setWaitingRequested] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  // Konumu bulup en yakın durağı seçen fonksiyon
  const detectLocationAndStop = (lat, lng, isSimulation = false) => {
    setUserLocation([lat, lng]);
    let minDistance = Infinity;
    let closestStopId = '1';

    STOPS_DATABASE.forEach(stop => {
      const dist = getDistance(lat, lng, stop.lat, stop.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestStopId = stop.id;
      }
    });

    setBoardStop(closestStopId);

    if (!isSimulation) {
      Swal.fire({ icon: 'success', title: 'Konumunuz Algılandı 📍', text: `Size en yakın durak otomatik seçildi.`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => detectLocationAndStop(position.coords.latitude, position.coords.longitude),
        () => detectLocationAndStop(40.6534, 35.8335) // İzin verilmezse varsayılan
      );
    }
  }, []);

  useEffect(() => {
    const stop1 = STOPS_DATABASE.find(s => s.id === boardStop);
    const stop2 = STOPS_DATABASE.find(s => s.id === alightStop);
    if (stop1 && stop2) {
      const stopDiff = Math.abs(stop1.order - stop2.order);
      const fare = 15 + (stopDiff * 5); // 15 TL sabit + durak başı 5 TL
      setEstimatedFare(stopDiff === 0 ? 0 : fare);
    }
  }, [boardStop, alightStop]);

  // JÜRİ İÇİN SİMÜLASYON BUTONU FONKSİYONU
  const activateSimulationMode = () => {
    // Amasya Mühendislik Fakültesi koordinatlarına zorla sabitler
    detectLocationAndStop(40.6525, 35.8340, true);
    Swal.fire({
      icon: 'info',
      title: 'Sunum Modu Aktif 🎯',
      text: 'GPS konumunuz Amasya Kampüsü olarak ayarlandı.',
      confirmButtonColor: '#0ea5e9'
    });
  };

  const handleConnectToRoute = (e) => {
    e.preventDefault();
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // ARTIK DİREKT SEÇİLEN HAT ADIYLA ODAYA GİRİYOR!
    newSocket.emit('join_trip', { tripId: selectedRoute, role: 'passenger', userId: user.user_id });
    setJoined(true);

    newSocket.on('bus_status_broadcast', (data) => {
      setBusStatus(data);
    });
  };

  const handleRequestStop = () => {
    if (socket) {
      socket.emit('passenger_waiting', { tripId: selectedRoute, stopId: boardStop, userId: user.user_id });
      setWaitingRequested(true);
      Swal.fire({ icon: 'success', title: 'Talebiniz Şoföre İletildi!', text: 'Otobüs durağa yaklaşıyor.', confirmButtonColor: '#10b981' });
    }
  };

  const handleCancelRequest = () => {
    if (socket) {
      // 1. Şoföre iptal sinyalini gönder
      socket.emit('cancel_passenger_waiting', { tripId: selectedRoute, stopId: boardStop, userId: user.user_id });

      // 2. Soketi tamamen kapat ki arkada boşuna veri dinleyip tarayıcıyı yormasın
      socket.disconnect();
      setSocket(null);

      // 3. Ekranı sıfırla ve anasayfaya (seçim ekranına) döndür
      setWaitingRequested(false);
      setJoined(false); // Bizi ana ekrana fırlatan sihirli kod bu!
      setBusStatus(null);

      Swal.fire({
        icon: 'info',
        title: 'İptal Edildi',
        text: 'Yolculuk talebiniz geri çekildi. Ana ekrana yönlendiriliyorsunuz.',
        confirmButtonColor: '#ef4444',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  return (
    <Container className="mt-2 mb-5">
      <div className="d-flex align-items-center mb-4 border-bottom pb-2">
        <FaUserAlt size={32} className="text-info me-3" />
        <h2 className="mb-0 fw-bold">Akıllı Yolcu Ekranı</h2>
      </div>

      {!joined ? (
        <Card className="shadow-lg border-0 rounded-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <Card.Body className="p-5 text-center">
            <FaRoute size={50} className="text-primary mb-3" />
            <h4 className="fw-bold mb-3">Yolculuk Planla</h4>
            <p className="text-muted mb-4">Gitmek istediğiniz güzergahı seçerek otobüsleri canlı izleyin.</p>
            <Form onSubmit={handleConnectToRoute}>
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">Otobüs Hattı / Güzergah</Form.Label>
                <Form.Select size="lg" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="text-center fw-bold text-primary border-2 border-primary">
                  <option value="Kampüs-Hatti">🚌 101 - Merkez Kampüs Ring Hattı</option>
                  <option value="Yurt-Hatti">🚌 102 - Öğrenci Yurtları Ekspres</option>
                </Form.Select>
              </Form.Group>
              <Button variant="primary" type="submit" size="lg" className="w-100 rounded-pill fw-bold shadow-sm">
                Otobüsleri Bul ve Bağlan 📡
              </Button>
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          <Col md={7}>
            <Card className="shadow-lg border-0 rounded-4 border-top border-info border-5 mb-4 overflow-hidden">
              <Card.Body className="p-0">
                {/* SUNUM MODU BUTONU (Haritanın hemen üstünde) */}
                <div className="bg-light p-2 d-flex justify-content-end border-bottom">
                  <Button variant="outline-info" size="sm" className="fw-bold" onClick={activateSimulationMode}>
                    <FaMagic className="me-2" /> Sunum Modu: Konumu Kampüse Sabitle
                  </Button>
                </div>

                <div style={{ height: '350px', width: '100%' }}>
                  <MapContainer center={userLocation || [40.6534, 35.8335]} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <RecenterMap center={busStatus ? [busStatus.lat, busStatus.lng] : userLocation} />

                    {userLocation && (
                      <Marker position={userLocation}>
                        <Popup>📍 Siz Buradasınız (En Yakın Durak Hesaplandı)</Popup>
                      </Marker>
                    )}

                    {busStatus && (
                      <Marker position={[busStatus.lat, busStatus.lng]}>
                        <Popup>🚌 Hareket Halindeki Otobüs</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                <div className="p-4">
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-muted">📍 Biniş Durağınız</Form.Label>
                        <Form.Select value={boardStop} onChange={(e) => setBoardStop(e.target.value)} disabled={waitingRequested}>
                          {STOPS_DATABASE.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-muted">🏁 İneceğiniz Durak</Form.Label>
                        <Form.Select value={alightStop} onChange={(e) => setAlightStop(e.target.value)} disabled={waitingRequested}>
                          {STOPS_DATABASE.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 my-3 border border-secondary border-opacity-25">
                    <span className="fw-bold text-muted"><FaWallet className="me-2 text-success" /> Tahmini Yolculuk Ücreti:</span>
                    <Badge bg="dark" className="fs-5 px-3 py-2">{estimatedFare} ₺</Badge>
                  </div>

                  {!waitingRequested ? (
                    <Button variant="success" size="lg" className="w-100 rounded-pill shadow fw-bold py-2 mt-2" onClick={handleRequestStop}>
                      <FaHandPaper className="me-2" /> Durakta Bekliyorum (Sinyal Gönder)
                    </Button>
                  ) : (
                    <Button variant="danger" size="lg" className="w-100 rounded-pill shadow fw-bold py-2 mt-2" onClick={handleCancelRequest}>
                      <FaTimesCircle className="me-2" /> Talebi İptal Et / Vazgeçtim
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={5}>
            <Card className="shadow-lg border-0 rounded-4 bg-dark text-white mb-4 h-100" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
              <Card.Body className="text-center p-4 d-flex flex-column justify-content-center align-items-center">
                <h5 className="text-info fw-bold mb-4 tracking-wide text-uppercase">Canlı Varış Süresi (ETA)</h5>

                {/* Değişiklik B: Şoför ve Doluluk Çubuğu içeren yeni kart yapısı */}
                {busStatus ? (
                  <div className="w-100 animate__animated animate__fadeIn">
                    <h1 className="display-1 fw-bold text-white mb-0">{busStatus.etaMinutes}</h1>
                    <p className="lead text-muted mb-3"><FaRegClock className="me-1" /> Dakika Sonra Kapınızda</p>
                    
                    {/* YENİ EKLENEN: ÇOK ŞIK ŞOFÖR VE DOLULUK BİLGİ KARTI */}
                    <div className="bg-white text-dark p-3 rounded-3 w-100 text-start mb-3 shadow-sm border-start border-4 border-warning">
                      
                      <div className="d-flex align-items-center mb-2">
                        <FaUserTie className="text-primary me-3" size={24} />
                        <div>
                          <small className="text-muted d-block lh-1">Kaptan Şoför</small>
                          <strong className="fs-5">{busStatus.driverName || "Belirtilmedi"}</strong>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-center mb-3">
                        <FaIdCard className="text-secondary me-3" size={24} />
                        <div>
                          <small className="text-muted d-block lh-1">Araç Plakası</small>
                          <strong className="fs-5 text-uppercase">{busStatus.plateNumber || "Bilinmiyor"}</strong>
                        </div>
                      </div>

                      {/* CANLI DOLULUK ORANI ÇUBUĞU */}
                      <div className="border-top pt-2 mt-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted fw-bold"><FaUsers className="me-1 text-success"/> Doluluk Durumu</small>
                          <strong className="text-dark fs-6">{busStatus.passengerCount || 0} / {busStatus.capacity || 40}</strong>
                        </div>
                        <ProgressBar 
                          variant={busStatus.passengerCount >= busStatus.capacity ? "danger" : (busStatus.passengerCount > busStatus.capacity * 0.7 ? "warning" : "success")} 
                          now={((busStatus.passengerCount || 0) / (busStatus.capacity || 40)) * 100} 
                          style={{ height: '10px' }} 
                        />
                      </div>

                    </div>

                    <div className="bg-white bg-opacity-10 p-3 rounded-3 w-100 text-start">
                      <p className="mb-1 fs-6 text-light"><FaBusAlt className="text-warning me-2"/> Hedef Durak:</p>
                      <strong className="text-warning fs-5">{busStatus.nextStopName}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="py-5">
                    <div className="spinner-border text-info mb-4" style={{ width: '3rem', height: '3rem' }} role="status"></div>
                    <h4 className="text-light opacity-75">Otobüs Konumu Bekleniyor</h4>
                    <p className="text-muted fs-6 mb-0">Şoför hareket butonuna bastığında harita ve süre canlı güncellenecektir.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}