import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Navbar, Container, Nav, Offcanvas, Button } from 'react-bootstrap';
import { FaBars, FaBus, FaUserAlt, FaSignOutAlt, FaHome, FaSignInAlt, FaUserTie, FaSmileWink, FaHeart } from 'react-icons/fa';
import Swal from 'sweetalert2';
import Login from './components/Login';
import DriverPanel from './components/DriverPanel';
import PassengerPanel from './components/PassengerPanel';

const ProtectedRoute = ({ isAuthenticated, allowedRole, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const user = JSON.parse(localStorage.getItem('user'));
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'driver' ? '/driver' : '/passenger'} replace />;
  }

  return children;
};

function MainLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [showMenu, setShowMenu] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  const handleClose = () => setShowMenu(false);
  const handleShow = () => setShowMenu(true);

  const handleLogout = () => {
    Swal.fire({
      title: 'Çıkış Yapılıyor...',
      icon: 'info',
      timer: 1000,
      showConfirmButton: false
    }).then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      handleClose();
      window.location.href = '/login';
    });
  };

  const location = useLocation();
  const isLoginPage = location.pathname === '/login';


  // --- VERİTABANINDAN DOĞRUDAN FULL_NAME ÇEKEN FONKSİYON ---
  const getUserName = () => {
    try {
      if (!user) return 'Kullanıcı';

      // Backend'den gelen full_name verisini kullanıyoruz
      if (user.full_name) {
        // İsimlerin sadece ilk harfini büyük yapmak için ufak bir makyaj
        return user.full_name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }

      return 'Kullanıcı';
    } catch (error) {
      return 'Kullanıcı';
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">

      {!isLoginPage && (
        <Navbar bg="dark" variant="dark" expand={false} className="shadow-sm sticky-top py-3">
          <Container fluid>
            <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center">
              <FaBus className="me-2 text-primary" size={24} />
              AI destekli Ulaşım
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="offcanvasNavbar" onClick={handleShow} className="border-0 shadow-none">
              <FaBars size={24} color="white" />
            </Navbar.Toggle>

            <Navbar.Offcanvas
              id="offcanvasNavbar"
              aria-labelledby="offcanvasNavbarLabel"
              placement="end"
              show={showMenu}
              onHide={handleClose}
              className="bg-dark text-light"
            >
              <Offcanvas.Header closeButton closeVariant="white">
                <Offcanvas.Title id="offcanvasNavbarLabel" className="fw-bold">
                  Kontrol Paneli
                </Offcanvas.Title>
              </Offcanvas.Header>
              <Offcanvas.Body>
                <Nav className="justify-content-end flex-grow-1 pe-3">
                  {!isAuthenticated ? (
                    <Nav.Link as={Link} to="/login" onClick={handleClose} className="fs-5 mb-3 border-bottom border-secondary pb-3">
                      <FaSignInAlt className="me-3 text-primary" /> Giriş Yap
                    </Nav.Link>
                  ) : (
                    <>
                      {user?.role === 'passenger' && (
                        <Nav.Link as={Link} to="/passenger" onClick={handleClose} className="fs-5 mb-3">
                          <FaUserAlt className="me-3 text-info" /> Yolcu Paneli
                        </Nav.Link>
                      )}

                      {user?.role === 'driver' && (
                        <Nav.Link as={Link} to="/driver" onClick={handleClose} className="fs-5 mb-3">
                          <FaBus className="me-3 text-warning" /> Şoför Paneli
                        </Nav.Link>
                      )}

                      <Button variant="danger" className="mt-4 d-flex align-items-center justify-content-center w-100 py-2 fw-bold" onClick={handleLogout}>
                        <FaSignOutAlt className="me-2" /> Çıkış Yap
                      </Button>
                    </>
                  )}
                </Nav>
              </Offcanvas.Body>
            </Navbar.Offcanvas>
          </Container>
        </Navbar>
      )}

      {/* ÜST KISIM - KİŞİSELLEŞTİRİLMİŞ HOŞ GELDİNİZ MESAJI */}
      {isAuthenticated && !isLoginPage && user && (
        <Container className="mt-4 mb-2">
          <div className={`d-flex align-items-center bg-white p-3 rounded-4 shadow-sm border-start border-5 ${user.role === 'driver' ? 'border-warning' : 'border-info'}`}>
            {user.role === 'driver' ? (
              <FaUserTie size={36} className="text-warning me-3" />
            ) : (
              <FaSmileWink size={36} className="text-info me-3" />
            )}
            <div>
              <h5 className="mb-1 fw-bold text-dark">
                Hoş Geldiniz, <span className="text-primary">{getUserName()}</span>!
              </h5>
              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                {user.role === 'driver'
                  ? 'Sefere çıkmadan önce lütfen güvenli sürüş kurallarına dikkat ediniz.'
                  : 'Yapay zeka destekli yolculuğunuz için en hızlı rotalar hazırlandı.'}
              </p>
            </div>
          </div>
        </Container>
      )}

      <div className={isLoginPage ? "flex-grow-1 d-flex flex-column" : "container mt-3 mb-5 flex-grow-1"}>
        <Routes>
          <Route path="/" element={
            !isLoginPage && (
              isAuthenticated ? (
                <Navigate to={user?.role === 'driver' ? '/driver' : '/passenger'} replace />
              ) : (
                <div className="text-center mt-5">
                  <FaBus size={80} className="text-primary mb-4" />
                  <h1 className="display-4 fw-bold">Yapay Zeka Destekli Ulaşım</h1>
                  <p className="lead text-muted mt-3">Sistemi kullanmak için menüden giriş yapın.</p>
                </div>
              )
            )
          } />
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/passenger" element={<ProtectedRoute isAuthenticated={isAuthenticated} allowedRole="passenger"><PassengerPanel /></ProtectedRoute>} />
          <Route path="/driver" element={<ProtectedRoute isAuthenticated={isAuthenticated} allowedRole="driver"><DriverPanel /></ProtectedRoute>} />
        </Routes>
      </div>

      {!isLoginPage && (
        <footer className="bg-dark text-light py-4 mt-auto">
          <Container className="d-flex flex-column flex-md-row justify-content-between align-items-center">
            <div className="mb-2 mb-md-0 d-flex align-items-center">
              <FaBus className="text-primary me-2" size={20} />
              <span className="fw-bold fs-5"></span>
            </div>
            <div className="text-center opacity-75">
              <small>
                &copy; {new Date().getFullYear()} Bitirme Projesi. <strong>JS</strong> ile tasarlandı.
              </small>
            </div>
            <div className="opacity-75">
              <small>Sürüm 1.0</small>
            </div>
          </Container>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}