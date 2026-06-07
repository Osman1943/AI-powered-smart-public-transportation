import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Form, Button, Container, Card, Row, Col } from 'react-bootstrap';
import { FaSignInAlt, FaUserPlus, FaKey, FaEnvelope, FaLock, FaUserAlt, FaBus } from 'react-icons/fa';

export default function Login({ setIsAuthenticated }) {
  const [view, setView] = useState('login'); // 'login', 'register', veya 'activate'
  const navigate = useNavigate();

  // Form State'leri
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('passenger');
  const [otpCode, setOtpCode] = useState('');

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });

  // 1. GİRİŞ YAPMA FONKSİYONU
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // 2FA Geliştirmesi için pay bıraktık
      if (res.data.requires2FA) {
        Swal.fire('Bilgi', '2FA kodunuz konsola gönderildi (Daha sonra entegre edilecek)', 'info');
        return;
      }

      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsAuthenticated(true);

      Toast.fire({ icon: 'success', title: 'Giriş Başarılı!' });
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Giriş Başarısız';
      
      // EĞER HATA "HESAP PASİF" HATASIYSA:
      if (errorMsg.includes('aktifleştirin')) {
        Swal.fire({
          icon: 'warning',
          title: 'Hesabınız Doğrulanmamış!',
          text: 'Giriş yapabilmek için önce e-postanıza (veya terminale) gelen 6 haneli kod ile hesabınızı doğrulamanız gerekmektedir.',
          confirmButtonText: 'Doğrulama Ekranına Git',
          confirmButtonColor: '#f59e0b'
        }).then(() => {
          setView('activate'); // Otomatik olarak aktivasyon ekranına fırlatıyoruz!
        });
      } else {
        Swal.fire('Hata!', errorMsg, 'error');
      }
    }
  };

  // 2. KAYIT OLMA FONKSİYONU
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', { 
        full_name: fullName, email, password, role 
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Kayıt Başarılı!',
        text: 'Güvenlik kodunuz oluşturuldu. (Lütfen VS Code terminaline bakınız)',
        confirmButtonColor: '#10b981'
      });
      
      // Kayıt başarılıysa aktivasyon ekranına geç
      setView('activate');
    } catch (err) {
      Swal.fire('Hata!', err.response?.data?.error || 'Kayıt başarısız.', 'error');
    }
  };

  // 3. KOD İLE HESAP DOĞRULAMA FONKSİYONU
  const handleActivate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/activate', { email, code: otpCode });
      
      Swal.fire({
        icon: 'success',
        title: 'Tebrikler!',
        text: res.data.message,
        confirmButtonColor: '#10b981'
      });
      
      // Aktifleşti! Şimdi rahatça giriş yapabilir
      setPassword(''); // Şifreyi güvenlik için temizle
      setOtpCode('');
      setView('login');
    } catch (err) {
      Swal.fire('Hata!', err.response?.data?.error || 'Doğrulama başarısız.', 'error');
    }
  };

  return (
    <div className="login-wrapper">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <div className="text-center mb-4 text-white animate__animated animate__fadeInDown">
              <FaBus size={60} className="mb-3 text-primary" />
              <h2 className="fw-bold">Akıllı Ulaşım Ağı</h2>
              <p className="opacity-75">Yapay zeka destekli yolculuğa hoş geldiniz</p>
            </div>

            <Card className="glass-card animate__animated animate__zoomIn">
              <Card.Body className="p-5">
                
                {/* --- MENÜ (GİRİŞ / KAYIT) --- */}
                <div className="d-flex justify-content-center mb-4 border-bottom border-secondary pb-3">
                  <Button variant={view === 'login' ? 'primary' : 'link'} className={`fw-bold text-decoration-none ${view !== 'login' && 'text-light opacity-50'}`} onClick={() => setView('login')}>
                    Giriş Yap
                  </Button>
                  <span className="mx-3 text-secondary mt-2">|</span>
                  <Button variant={view === 'register' ? 'primary' : 'link'} className={`fw-bold text-decoration-none ${view !== 'register' && 'text-light opacity-50'}`} onClick={() => setView('register')}>
                    Kayıt Ol
                  </Button>
                </div>

                {/* === GİRİŞ YAP FORMU === */}
                {view === 'login' && (
                  <Form onSubmit={handleLogin}>
                    <h5 className="mb-4 fw-bold text-center">Hesabınıza Giriş Yapın</h5>
                    <Form.Group className="mb-3">
                      <Form.Label><FaEnvelope className="me-2"/>E-Posta</Form.Label>
                      <Form.Control type="email" placeholder="ornek@mail.com" className="py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label><FaLock className="me-2"/>Şifre</Form.Label>
                      <Form.Control type="password" placeholder="••••••••" className="py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </Form.Group>
                    <Button variant="primary" type="submit" className="w-100 py-2 fw-bold rounded-pill shadow-sm">
                      <FaSignInAlt className="me-2" /> Sisteme Giriş Yap
                    </Button>
                    <div className="text-center mt-3">
                      <Button variant="link" className="text-warning text-decoration-none fs-6" onClick={() => setView('activate')}>
                        Hesabımı Doğrulamak İstiyorum
                      </Button>
                    </div>
                  </Form>
                )}

                {/* === KAYIT OL FORMU === */}
                {view === 'register' && (
                  <Form onSubmit={handleRegister}>
                    <h5 className="mb-4 fw-bold text-center">Yeni Hesap Oluştur</h5>
                    <Form.Group className="mb-3">
                      <Form.Label><FaUserAlt className="me-2"/>Ad Soyad</Form.Label>
                      <Form.Control type="text" placeholder="Örn: Osman ..." className="py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label><FaEnvelope className="me-2"/>E-Posta</Form.Label>
                      <Form.Control type="email" placeholder="ornek@mail.com" className="py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label><FaLock className="me-2"/>Şifre</Form.Label>
                      <Form.Control type="password" placeholder="Güçlü bir şifre belirleyin" className="py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label><FaBus className="me-2"/>Kullanıcı Rolü</Form.Label>
                      <Form.Select value={role} onChange={(e) => setRole(e.target.value)} className="py-2">
                        <option value="passenger">Yolcu</option>
                        <option value="driver">Şoför</option>
                      </Form.Select>
                    </Form.Group>
                    <Button variant="success" type="submit" className="w-100 py-2 fw-bold rounded-pill shadow-sm">
                      <FaUserPlus className="me-2" /> Kayıt Ol ve Kod Al
                    </Button>
                  </Form>
                )}

                {/* === HESAP DOĞRULAMA (AKTİVASYON) FORMU === */}
                {view === 'activate' && (
                  <Form onSubmit={handleActivate} className="animate__animated animate__fadeIn">
                    <div className="text-center mb-4">
                      <FaKey size={40} className="text-warning mb-2" />
                      <h5 className="fw-bold">Hesap Doğrulama</h5>
                      <p className="text-light opacity-75 small">E-postanıza (konsola) gönderilen 6 haneli güvenlik kodunu girin.</p>
                    </div>
                    <Form.Group className="mb-3">
                      <Form.Label>Kayıtlı E-Posta</Form.Label>
                      <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={email !== ''} className={email !== '' ? 'bg-secondary text-white' : ''} />
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label>6 Haneli Doğrulama Kodu</Form.Label>
                      <Form.Control type="text" maxLength="6" placeholder="Örn: 123456" className="py-2 text-center fs-4 fw-bold tracking-widest" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
                    </Form.Group>
                    <Button variant="warning" type="submit" className="w-100 py-2 fw-bold rounded-pill shadow-sm text-dark">
                      Hesabımı Aktifleştir
                    </Button>
                  </Form>
                )}

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}