import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import QRCode from 'qrcode';

function PaymentPage() {
  const { requestId } = useParams();

  const [paymentRequest, setPaymentRequest] = useState(null);
  const [photos, setPhotos]                 = useState([]);
  const [qrCode, setQrCode]                 = useState('');
  const [timeRemaining, setTimeRemaining]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [justConfirmed, setJustConfirmed]   = useState(false);
  const prevStatus = useRef(null);

  useEffect(() => {
    fetchPaymentRequest();
    const interval = setInterval(fetchPaymentRequest, 3000);
    return () => clearInterval(interval);
  }, [requestId]);

  useEffect(() => {
    if (!paymentRequest) return;
    const timer = setInterval(() => {
      const diff = new Date(paymentRequest.expires_at) - new Date();
      setTimeRemaining(diff <= 0 ? 0 : Math.floor(diff / 1000));
      if (diff <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentRequest?.expires_at]);

  const fetchPaymentRequest = async () => {
    try {
      const res = await api.get(`/api/payments/request/${requestId}`);
      const data = res.data;

      // Detect transition to confirmed → trigger snap animation
      if (prevStatus.current === 'pending' && data.status === 'confirmed') {
        setJustConfirmed(true);
      }
      prevStatus.current = data.status;
      setPaymentRequest(data);

      // Generate QR once
      if (data.upi_string && !qrCode) {
        const url = await QRCode.toDataURL(data.upi_string, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 280,
          color: { dark: '#e8e8e8', light: '#111111' }
        });
        setQrCode(url);
      }

      if (data.status === 'confirmed') {
        const ph = await api.get(`/api/payments/request/${requestId}/photos`);
        setPhotos(ph.data);
      } else if (data.photo_ids?.length > 0) {
        const ph = await api.post('/api/photos/batch', { photo_ids: data.photo_ids });
        setPhotos(ph.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => {
    if (s === null) return '--:--';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const timerColor = () => {
    if (timeRemaining === null) return '#555';
    if (timeRemaining > 120) return '#d4a017';
    if (timeRemaining > 60)  return '#c0392b';
    return '#ff4444';
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div style={{ color: '#555', letterSpacing: '0.15em', fontSize: '0.85rem', textTransform: 'uppercase' }}>
          Retrieving payment...
        </div>
      </div>
    );
  }

  if (!paymentRequest) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#555' }}>Payment request not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-up" style={{ maxWidth: '720px' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#555', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          ✦ &nbsp; Payment Request
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.6rem', color: '#e8e8e8' }}>
            {paymentRequest.event_name}
          </h1>
          <span className={`status-badge status-${paymentRequest.status}`}>
            {paymentRequest.status}
          </span>
        </div>
        <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.4rem' }}>
          {paymentRequest.photographer_name} &nbsp;·&nbsp; {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── PENDING ── */}
      {paymentRequest.status === 'pending' && (
        <>
          {/* Timer */}
          <div style={{
            background: '#0e0e0e',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '3.5rem',
              fontWeight: '700',
              color: timerColor(),
              letterSpacing: '0.05em',
              lineHeight: 1,
              textShadow: timeRemaining < 60 ? `0 0 20px ${timerColor()}55` : 'none',
              transition: 'color 0.5s, text-shadow 0.5s'
            }}>
              {formatTime(timeRemaining)}
            </div>
            <div style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
              Time Remaining
            </div>
          </div>

          {/* QR Card */}
          <div style={{
            background: '#0e0e0e',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <p style={{ color: '#555', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              Scan to Pay
            </p>

            <div style={{
              display: 'inline-block',
              padding: '1rem',
              background: '#111',
              borderRadius: '12px',
              border: '1px solid #2a2a2a',
              marginBottom: '1.5rem'
            }}>
              {qrCode ? (
                <img src={qrCode} alt="UPI QR Code" style={{ width: '260px', height: '260px', display: 'block', borderRadius: '6px' }} />
              ) : (
                <div style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#333', fontSize: '0.8rem' }}>Generating...</span>
                </div>
              )}
            </div>

            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              Pay directly to
            </p>
            <p style={{ color: '#d4a017', fontFamily: "'Cinzel', serif", fontSize: '1.05rem', letterSpacing: '0.04em', marginBottom: '1.5rem' }}>
              {paymentRequest.upi_id}
            </p>

            {/* Amount pill */}
            <div style={{
              display: 'inline-block',
              background: '#161616',
              border: '1px solid #2a2a2a',
              borderRadius: '999px',
              padding: '0.5rem 1.5rem'
            }}>
              <span style={{ color: '#555', fontSize: '0.8rem' }}>Amount: </span>
              <span style={{ color: '#e8e8e8', fontWeight: '600' }}>₹{parseFloat(paymentRequest.amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Warning */}
          <div style={{
            background: '#1a1208',
            border: '1px solid #3a2a08',
            borderRadius: '10px',
            padding: '0.9rem 1.2rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            marginBottom: '1.25rem'
          }}>
            <span style={{ color: '#b8860b', marginTop: '1px' }}>⚠</span>
            <p style={{ color: '#7a6020', fontSize: '0.84rem', lineHeight: 1.6 }}>
              Complete payment within <strong style={{ color: '#b8860b' }}>5 minutes</strong>. Late payments cannot be automatically matched.
            </p>
          </div>

          {/* Steps */}
          <div style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ color: '#444', fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>How it works</p>
            {[
              'Scan the QR code with any UPI app (GPay, PhonePe, Paytm…)',
              'Complete the payment within 5 minutes',
              'Payment is verified automatically via bank email',
              'Your photos unlock instantly on confirmation'
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: i < 3 ? '0.75rem' : 0, alignItems: 'flex-start' }}>
                <span style={{
                  minWidth: '22px', height: '22px',
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: '#555', fontWeight: '600', marginTop: '1px'
                }}>
                  {i + 1}
                </span>
                <span style={{ color: '#555', fontSize: '0.85rem', lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CONFIRMED ── */}
      {paymentRequest.status === 'confirmed' && (
        <div style={{ animation: justConfirmed ? 'fadeUp 0.7s ease' : 'none' }}>
          {/* Success banner */}
          <div style={{
            background: '#0a1f12',
            border: '1px solid #1a4a2a',
            borderRadius: '12px',
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* glow */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, #4ade80, transparent)'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '44px', height: '44px',
                background: '#1a3a2a',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h3 style={{ fontFamily: "'Cinzel', serif", color: '#4ade80', marginBottom: '0.3rem' }}>
                  Payment Confirmed
                </h3>
                <p style={{ color: '#2d6a4a', fontSize: '0.85rem' }}>
                  Your photos are now unlocked and ready to download.
                </p>
              </div>
            </div>
            {paymentRequest.bank_transaction_id && (
              <p style={{ color: '#2d4a3a', fontSize: '0.78rem', marginTop: '1rem', letterSpacing: '0.04em' }}>
                Transaction ID: <span style={{ color: '#3d6a4a', fontFamily: 'monospace' }}>{paymentRequest.bank_transaction_id}</span>
              </p>
            )}
          </div>

          {/* Photos */}
          <p style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Your Photos
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {photos.map((photo) => (
              <div key={photo.id} style={{
                background: '#0e0e0e',
                border: '1px solid #1e1e1e',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <img
                  src={photo.full_url}
                  alt={photo.filename}
                  style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '0.75rem' }}>
                  <a
                    href={photo.full_url}
                    download={photo.filename}
                    className="btn btn-success"
                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.6rem' }}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXPIRED ── */}
      {paymentRequest.status === 'expired' && (
        <div style={{
          background: '#1a0a0a',
          border: '1px solid #3a1a1a',
          borderRadius: '12px',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, #c0392b, transparent)'
          }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", color: '#f87171', marginBottom: '0.75rem' }}>
            Request Expired
          </h3>
          <p style={{ color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1rem' }}>
            This payment request has expired. The 5-minute window has passed.
          </p>
          {paymentRequest.transaction_status === 'expired' && (
            <p style={{ color: '#7f1d1d', fontSize: '0.84rem', lineHeight: 1.6 }}>
              A payment was received after the window closed. Please contact the photographer for a refund or create a new request.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentPage;

