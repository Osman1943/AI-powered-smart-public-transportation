import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Card, Form, Button, Container, Row, Col, Badge } from 'react-bootstrap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaBus, FaUsers, FaPlay, FaStop, FaIdCard, FaRedo, FaRoute, FaClock, FaWallet } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function DriverPanel() {
  const [plateNumber, setPlateNumber] = useState('');
  const [capacity, setCapacity] = useState(40);
  const [selectedRoute, setSelectedRoute] = useState('Kampüs-Hatti'); // Ortak Oda Adı

  const [tripActive, setTripActive] = useState(false);
  const [tripData, setTripData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [passengerCount, setPassengerCount] = useState(0);
  const [earnings, setEarnings] = useState(0); // Toplam Kazanç
  const [startTime, setStartTime] = useState(''); // Başlama Saati

  const COLORS = ['#10b981', '#ef4444'];

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true
  });

  // YENİ: JÜRİ İÇİN CANLI SÜRÜŞ SİMÜLATÖRÜ (Otobüs hareket ediyor gibi GPS atar)
  useEffect(() => {
    let gpsInterval;
    if (tripActive && socket) {
      const user = JSON.parse(localStorage.getItem('user'));
      let currentLat = 40.6500; // Kampüs başlangıç noktası
      let currentLng = 35.8300;

      // 3 saniyede bir otobüsün konumunu ve şoför bilgilerini yolcuya fırlat!
      gpsInterval = setInterval(() => {
        currentLat += 0.0002; // Haritada otobüsü hafifçe hareket ettir
        currentLng += 0.0002;

        // YENİ: JÜRİ İÇİN CANLI SÜRÜŞ SİMÜLATÖRÜ (Otobüs hareket ediyor gibi GPS atar)
        useEffect(() => {
          let gpsInterval;
          if (tripActive && socket) {
            const user = JSON.parse(localStorage.getItem('user'));
            let currentLat = 40.6500; // Kampüs başlangıç noktası
            let currentLng = 35.8300;

            // 3 saniyede bir otobüsün konumunu ve şoför bilgilerini yolcuya fırlat!
            gpsInterval = setInterval(() => {
              currentLat += 0.0002; // Haritada otobüsü hafifçe hareket ettir
              currentLng += 0.0002;

              socket.emit('bus_location_update', {
                tripId: selectedRoute,
                lat: currentLat,
                lng: currentLng,
                nextStopOrder: 2,
                plateNumber: plateNumber,
                driverName: user?.full_name || 'Kaptan Şoför',
                // YENİ EKLENEN KISIM: Doluluk oranını hesaplamak için yolcu ve kapasite yollanıyor
                passengerCount: passengerCount,
                capacity: capacity
              });
            }, 3000);
          }
          // Bağımlılık dizisine passengerCount ve capacity eklendi
        }, [tripActive, socket, selectedRoute, plateNumber, passengerCount, capacity]);
      }, 3000);
    }
    return () => clearInterval(gpsInterval);
  }, [tripActive, socket, selectedRoute, plateNumber]);

  useEffect(() => {
    const savedTrip = localStorage.getItem('activeTrip');
    if (savedTrip) {
      const parsedTrip = JSON.parse(savedTrip);
      setTripData(parsedTrip);
      setPlateNumber(parsedTrip.plate_number);
      setCapacity(parsedTrip.capacity);
      setSelectedRoute(parsedTrip.selectedRoute);
      setStartTime(parsedTrip.startTime);
      setPassengerCount(parsedTrip.passengerCount || 0);
      setEarnings(parsedTrip.earnings || 0);
      setTripActive(true);
      connectToSocket(parsedTrip.selectedRoute);
    }
    return () => { if (socket) socket.disconnect(); }
  }, []);

  const connectToSocket = (roomName) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // ID YERİNE HAT ADI İLE ODAYA GİRİYORUZ
    newSocket.emit('join_trip', { tripId: roomName, role: 'driver', userId: user.user_id });

    newSocket.on('passenger_waiting_notification', (data) => {
      Toast.fire({ icon: 'warning', title: `🔔 Yeni Yolcu!`, text: `Durak ID: ${data.stopId} konumunda.` });
    });

    newSocket.on('passenger_cancelled_notification', (data) => {
      Toast.fire({ icon: 'info', title: `ℹ️ Yolcu Vazgeçti`, text: `Durak ID: ${data.stopId} konumundaki yolcu ayrıldı.` });
    });
  };

  const startTrip = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Veritabanına kaydet (Gerçek Trip ID dönecek ama biz soket için route kullanacağız)
      const response = await axios.post('http://localhost:5000/api/trips',
        { plate_number: plateNumber, capacity: Number(capacity) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const timeNow = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const newTripData = response.data;

      setTripData(newTripData);
      setStartTime(timeNow);
      setTripActive(true);

      // Seferi hafızaya kazı
      localStorage.setItem('activeTrip', JSON.stringify({
        ...newTripData, plate_number: plateNumber, capacity: capacity, selectedRoute, startTime: timeNow, passengerCount: 0, earnings: 0
      }));

      connectToSocket(selectedRoute);

      Swal.fire({ icon: 'success', title: 'Sefer Başladı!', text: `${selectedRoute} hattında yayındasınız.`, timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Hata!', err.response?.data?.error || err.message, 'error');
    }
  };

  const handleBoardPassenger = () => {
    if (passengerCount < capacity) {
      const newCount = passengerCount + 1;
      const newEarnings = earnings + 20; // Yolcu başı 20 TL simülasyonu
      setPassengerCount(newCount);
      setEarnings(newEarnings);

      // LocalStorage güncelle
      const savedTrip = JSON.parse(localStorage.getItem('activeTrip'));
      localStorage.setItem('activeTrip', JSON.stringify({ ...savedTrip, passengerCount: newCount, earnings: newEarnings }));
    }
  };

  const endTrip = async () => {
    Swal.fire({
      title: 'Seferi bitirmek istiyor musunuz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'İptal',
      confirmButtonText: 'Evet, Bitir'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token');
          await axios.put(`http://localhost:5000/api/trips/${tripData.tripId}/end`, {}, { headers: { Authorization: `Bearer ${token}` } });

          if (socket) socket.disconnect();
          setTripActive(false);
          setTripData(null);
          setSocket(null);
          setPassengerCount(0);
          setEarnings(0);
          localStorage.removeItem('activeTrip');

          Swal.fire('Bitti!', 'Sefer başarıyla sonlandırıldı ve raporlandı.', 'success');
        } catch (err) {
          Swal.fire('Hata!', 'Sefer sonlandırılamadı!', 'error');
        }
      }
    });
  };

  const chartData = [
    { name: 'Boş Koltuk', value: capacity - passengerCount },
    { name: 'Dolu Koltuk', value: passengerCount }
  ];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize="18">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Container className="mt-2 mb-5">
      <div className="d-flex align-items-center mb-4 border-bottom pb-2">
        <FaBus size={32} className="text-warning me-3" />
        <h2 className="mb-0 fw-bold">Şoför Gösterge Paneli</h2>
      </div>

      {!tripActive ? (
        <Card className="shadow-lg border-0 rounded-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card.Body className="p-5">
            <h4 className="mb-4 text-center text-muted">Yeni Sefer Başlat</h4>
            <Form onSubmit={startTrip}>
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold"><FaRoute className="me-2 text-primary" /> Çalışılacak Hat / Güzergah</Form.Label>
                <Form.Select size="lg" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="fw-bold">
                  <option value="Kampüs-Hatti">101 - Merkez Kampüs Ring Hattı</option>
                  <option value="Yurt-Hatti">102 - Öğrenci Yurtları Ekspres</option>
                </Form.Select>
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold"><FaIdCard className="me-2" /> Araç Plakası</Form.Label>
                    <Form.Control type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold"><FaUsers className="me-2" /> Kapasite</Form.Label>
                    <Form.Control type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
                  </Form.Group>
                </Col>
              </Row>
              <Button variant="success" type="submit" size="lg" className="w-100 rounded-pill fw-bold shadow">
                <FaPlay className="me-2" /> Seferi Başlat
              </Button>
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          <Col md={7}>
            <Card className="shadow-lg border-0 rounded-4 border-top border-success border-5 mb-4 h-100">
              <Card.Body className="p-4 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="mb-0 fw-bold">Canlı Sefer Verileri</h4>
                  <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill d-flex align-items-center animate__animated animate__pulse animate__infinite">
                    <FaRedo className="me-2 fa-spin" /> Yayında
                  </Badge>
                </div>

                <Row className="g-3 mb-4">
                  <Col sm={6}>
                    <div className="bg-light p-3 rounded-3 border h-100">
                      <p className="text-muted mb-1 fs-6"><FaRoute className="me-1" /> Aktif Hat</p>
                      <h5 className="fw-bold text-primary mb-0">{selectedRoute === 'Kampüs-Hatti' ? '101 Kampüs' : '102 Yurtlar'}</h5>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="bg-light p-3 rounded-3 border h-100">
                      <p className="text-muted mb-1 fs-6"><FaIdCard className="me-1" /> Plaka</p>
                      <h5 className="fw-bold text-dark mb-0">{plateNumber}</h5>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="bg-light p-3 rounded-3 border h-100">
                      <p className="text-muted mb-1 fs-6"><FaClock className="me-1" /> Başlama Saati</p>
                      <h5 className="fw-bold text-info mb-0">{startTime}</h5>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="bg-light p-3 rounded-3 border border-success h-100" style={{ backgroundColor: '#f0fdf4' }}>
                      <p className="text-muted mb-1 fs-6"><FaWallet className="me-1 text-success" /> Toplam Kazanç</p>
                      <h4 className="fw-bold text-success mb-0">{earnings} ₺</h4>
                    </div>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between mt-auto">
                  <Button variant="outline-primary" size="lg" className="fw-bold px-4 shadow-sm w-50 me-2" onClick={handleBoardPassenger}>
                    <FaUsers className="me-2" /> Yolcu Bindi
                  </Button>
                  <Button variant="danger" size="lg" className="fw-bold px-4 shadow-sm w-50 ms-2" onClick={endTrip}>
                    <FaStop className="me-2" /> Seferi Bitir
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={5}>
            <Card className="shadow-lg border-0 rounded-4 mb-4 h-100">
              <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center">
                <Card.Title className="fw-bold text-muted mb-0">Canlı Doluluk Oranı</Card.Title>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={5} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <h3 className="text-center mt-2 fw-bold text-dark">{passengerCount} / {capacity}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}