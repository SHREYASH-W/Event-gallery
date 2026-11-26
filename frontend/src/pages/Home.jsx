import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Gathering remnants...
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-up">
      {/* Hero */}
      <div style={{ marginBottom: '3rem', paddingTop: '1rem' }}>
        <p style={{
          color: '#555',
          fontSize: '0.75rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem'
        }}>
          ✦ &nbsp; Direct UPI · No Gateway · Instant Unlock
        </p>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: '700',
          color: '#e8e8e8',
          lineHeight: 1.15,
          marginBottom: '1rem',
          letterSpacing: '0.02em'
        }}>
          Event Photo Gallery
        </h1>
        <p style={{ color: '#666', fontSize: '1rem', maxWidth: '500px', lineHeight: 1.7 }}>
          Browse, select, and pay directly with UPI. Photos unlock the moment payment is confirmed.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.3 }}>◈</div>
          <p style={{ color: '#555' }}>No events available</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {events.map((event, i) => (
            <Link
              to={`/event/${event.id}`}
              key={event.id}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  animationDelay: `${i * 0.08}s`,
                  cursor: 'pointer'
                }}
              >
                {/* Thumbnail area */}
                <div style={{
                  height: '180px',
                  background: `linear-gradient(160deg, #1a1a1a 0%, #111 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  borderBottom: '1px solid #2a2a2a'
                }}>
                  {/* Subtle grid pattern */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                  }} />
                  <span style={{ fontSize: '3rem', opacity: 0.25, position: 'relative' }}>◈</span>
                  {/* Ember glow bottom */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '60px',
                    background: 'linear-gradient(to top, rgba(120, 30, 20, 0.12), transparent)'
                  }} />
                </div>

                {/* Info */}
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <h3 style={{
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: '#e8e8e8',
                    marginBottom: '0.5rem',
                    letterSpacing: '0.01em'
                  }}>
                    {event.name}
                  </h3>
                  <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    {new Date(event.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p style={{ color: '#b8860b', fontSize: '0.85rem', fontWeight: '500' }}>
                    {event.photographer_name}
                  </p>
                </div>

                {/* Footer strip */}
                <div style={{
                  padding: '0.75rem 1.5rem',
                  borderTop: '1px solid #1e1e1e',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#444', fontSize: '0.8rem' }}>View photos</span>
                  <span style={{ color: '#555', fontSize: '0.9rem' }}>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
