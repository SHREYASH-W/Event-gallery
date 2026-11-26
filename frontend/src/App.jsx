import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import EventGallery from './pages/EventGallery';
import PaymentPage from './pages/PaymentPage';
import AdminDashboard from './pages/AdminDashboard';
import TestPanel from './pages/TestPanel';
import './App.css';

// Ash particle system
function initAshParticles() {
  const canvas = document.getElementById('ash-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const particles = [];
  const COUNT = 90;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height,
      size:   Math.random() * 2.5 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.5 + 0.1),
      opacity: Math.random() * 0.5 + 0.1,
      // ember vs ash
      isEmber: Math.random() < 0.12,
      flicker: Math.random() * Math.PI * 2,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.flicker += 0.04;
      const flicker = Math.sin(p.flicker) * 0.3;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

      if (p.isEmber) {
        ctx.fillStyle = `rgba(192, 80, 43, ${p.opacity + flicker})`;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = 'rgba(192, 57, 43, 0.6)';
      } else {
        ctx.fillStyle = `rgba(160, 155, 150, ${p.opacity + flicker})`;
        ctx.shadowBlur  = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      p.x += p.speedX + Math.sin(p.flicker * 0.5) * 0.15;
      p.y += p.speedY;
      p.opacity -= 0.0008;

      // reset when faded out or off top
      if (p.opacity <= 0 || p.y < -10) {
        p.x       = Math.random() * canvas.width;
        p.y       = canvas.height + 10;
        p.opacity = Math.random() * 0.5 + 0.1;
        p.size    = Math.random() * 2.5 + 0.3;
        p.isEmber = Math.random() < 0.12;
      }
    });

    requestAnimationFrame(draw);
  }

  draw();
}

function App() {
  useEffect(() => {
    initAshParticles();
  }, []);

  return (
    <Router>
      <canvas id="ash-canvas" />
      <div className="app">
        <nav className="navbar">
          <div className="container">
            <Link to="/" className="logo">
              ✦ Celebrare
            </Link>
            <div className="nav-links">
              <Link to="/">Events</Link>
              <Link to="/admin">Admin</Link>
              <Link to="/test">Test Panel</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/"                      element={<Home />} />
          <Route path="/event/:eventId"        element={<EventGallery />} />
          <Route path="/payment/:requestId"    element={<PaymentPage />} />
          <Route path="/admin"                 element={<AdminDashboard />} />
          <Route path="/test"                  element={<TestPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
