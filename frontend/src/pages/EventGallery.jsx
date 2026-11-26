import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EventGallery() {
  const { eventId }  = useParams();
  const navigate     = useNavigate();

  const [event, setEvent]               = useState(null);
  const [photos, setPhotos]             = useState([]);
  const [selectedPhotos, setSelected]   = useState([]);
  const [guestEmail, setGuestEmail]     = useState('');
  const [loading, setLoading]           = useState(true);
  const [checking, setChecking]         = useState(false);

  useEffect(() => { fetchEventAndPhotos(); }, [eventId]);

  const fetchEventAndPhotos = async () => {
    try {
      const [evRes, phRes] = await Promise.all([
        axios.get(`/api/events/${eventId}`),
        axios.get(`/api/events/${eventId}/photos`)
      ]);
      setEvent(evRes.data);
      setPhotos(phRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const total = () =>
    photos.filter(p => selectedPhotos.includes(p.id))
          .reduce((s, p) => s + parseFloat(p.price), 0);

  const handleCheckout = async () => {
    if (selectedPhotos.length === 0) return alert('Select at least one photo');
    if (!guestEmail.includes('@'))    return alert('Enter a valid email');

    setChecking(true);
    try {
      const res = await axios.post('/api/payments/request', {
        event_id:  parseInt(eventId),
        guest_email: guestEmail,
        photo_ids:  selectedPhotos
      });
      navigate(`/payment/${res.data.paymentRequest.request_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create payment request. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Retrieving fragments...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#555' }}>Event not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-up">
      {/* Event header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#555', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          ✦ &nbsp; Event Gallery
        </p>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
          color: '#e8e8e8',
          marginBottom: '0.5rem'
        }}>
          {event.name}
        </h1>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#555', fontSize: '0.85rem' }}>
            {new Date(event.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span style={{ color: '#b8860b', fontSize: '0.85rem' }}>
            {event.photographer_name}
          </span>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: '#555' }}>No photos available</p>
        </div>
      ) : (
        <>
          {/* Selection hint */}
          <p style={{ color: '#444', fontSize: '0.82rem', marginBottom: '1.25rem', letterSpacing: '0.03em' }}>
            {selectedPhotos.length === 0
              ? 'Tap a photo to select it'
              : `${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''} selected · ₹${total().toFixed(2)}`}
          </p>

          {/* Photo grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: selectedPhotos.length > 0 ? '7rem' : '2rem'
          }}>
            {photos.map((photo) => {
              const sel = selectedPhotos.includes(photo.id);
              return (
                <div
                  key={photo.id}
                  onClick={() => toggle(photo.id)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: sel ? '2px solid #b8860b' : '2px solid #1e1e1e',
                    background: '#111',
                    transition: 'all 0.25s',
                    boxShadow: sel ? '0 0 20px rgba(184,134,11,0.25)' : 'none',
                    transform: sel ? 'scale(1.02)' : 'scale(1)',
                    position: 'relative'
                  }}
                >
                  <img
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', opacity: sel ? 1 : 0.7, transition: 'opacity 0.25s' }}
                  />

                  {/* Selected overlay */}
                  {sel && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      width: '24px', height: '24px',
                      background: '#b8860b',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', color: '#000', fontWeight: '700'
                    }}>
                      ✓
                    </div>
                  )}

                  <div style={{
                    padding: '0.6rem 0.9rem',
                    background: '#111',
                    borderTop: '1px solid #1e1e1e',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: sel ? '#d4a017' : '#555', fontWeight: '600', fontSize: '0.9rem' }}>
                      ₹{parseFloat(photo.price).toFixed(2)}
                    </span>
                    <span style={{ color: '#333', fontSize: '0.75rem' }}>
                      #{photo.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky checkout bar */}
          {selectedPhotos.length > 0 && (
            <div style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              background: 'rgba(14, 14, 14, 0.97)',
              borderTop: '1px solid #2a2a2a',
              backdropFilter: 'blur(16px)',
              padding: '1rem 2rem',
              zIndex: 50
            }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <p style={{ color: '#555', fontSize: '0.78rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} · Total
                  </p>
                  <p style={{ color: '#d4a017', fontFamily: "'Cinzel', serif", fontSize: '1.4rem', fontWeight: '700' }}>
                    ₹{total().toFixed(2)}
                  </p>
                </div>

                <input
                  type="email"
                  placeholder="Your email address"
                  className="input"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  style={{ flex: 2, minWidth: '220px', maxWidth: '340px' }}
                />

                <button
                  className="btn btn-primary"
                  onClick={handleCheckout}
                  disabled={checking}
                  style={{ minWidth: '180px', opacity: checking ? 0.6 : 1 }}
                >
                  {checking ? 'Creating...' : 'Proceed to Payment →'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EventGallery;
