import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SCENARIOS = [
  { id: 'success',   label: 'Successful Payment',    icon: '✓', color: 'btn-success', desc: 'Trusted bank email, valid amount, within window' },
  { id: 'untrusted', label: 'Untrusted Email',        icon: '⚠', color: 'btn-danger',  desc: 'Spoofed sender — rejected by DKIM/SPF check' },
  { id: 'duplicate', label: 'Duplicate Transaction',  icon: '⟳', color: 'btn-warning', desc: 'Same transaction ID sent twice' },
  { id: 'late',      label: 'Late Payment',           icon: '⌛', color: 'btn-secondary', desc: 'Payment arrives after 5-min expiry' },
];

function TestPanel() {
  // Step 1 — pick event & photos
  const [events, setEvents]           = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [photos, setPhotos]           = useState([]);
  const [selectedPhotos, setSelected] = useState([]);
  const [guestEmail, setGuestEmail]   = useState('test@example.com');

  // Step 2 — payment request created
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [qrCode, setQrCode]           = useState('');
  const [upiId, setUpiId]             = useState('');

  // Step 3 — simulation
  const [txnId, setTxnId]             = useState('');
  const [lastSuccessTxnId, setLastSuccessTxnId] = useState(''); // for duplicate test
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [activeScenario, setActive]   = useState(null);
  const [requestConfirmed, setRequestConfirmed] = useState(false); // lock after success

  // Step 4 — unlocked photos
  const [unlockedPhotos, setUnlocked] = useState([]);

  const [step, setStep]               = useState(1); // 1=select, 2=pay, 3=done

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (selectedEvent) fetchPhotos(selectedEvent);
    setSelected([]);
    setPhotos([]);
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/api/events');
      setEvents(res.data);
      if (res.data.length > 0) setSelectedEvent(String(res.data[0].id));
    } catch (e) { console.error(e); }
  };

  const fetchPhotos = async (eventId) => {
    try {
      const res = await axios.get(`/api/events/${eventId}/photos`);
      setPhotos(res.data);
    } catch (e) { console.error(e); }
  };

  const togglePhoto = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const total = () =>
    photos.filter(p => selectedPhotos.includes(p.id))
          .reduce((s, p) => s + parseFloat(p.price), 0);

  const createPaymentRequest = async () => {
    if (selectedPhotos.length === 0) return alert('Select at least one photo');
    try {
      const res = await axios.post('/api/payments/request', {
        event_id:    parseInt(selectedEvent),
        guest_email: guestEmail,
        photo_ids:   selectedPhotos,
      });
      setPaymentRequest(res.data.paymentRequest);
      setUpiId(res.data.paymentRequest.upi_id ||
               events.find(e => String(e.id) === String(selectedEvent))?.upi_id ||
               '7983695049@ptsbi');

      // Generate QR
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(res.data.upiString, {
        errorCorrectionLevel: 'M', margin: 2, width: 220,
        color: { dark: '#e8e8e8', light: '#111111' }
      });
      setQrCode(url);
      setRequestConfirmed(false);
      setLastSuccessTxnId('');
      setStep(2);
    } catch (e) {
      console.error(e);
      alert('Failed to create payment request');
    }
  };

  const genTxnId = () => {
    const id = 'TXN' + Date.now() + Math.random().toString(36).substring(2, 7).toUpperCase();
    setTxnId(id);
    return id;
  };

  const simulate = async (scenario) => {
    if (!paymentRequest) return alert('Create a payment request first (Step 1)');

    // Don't allow running success/untrusted/late on an already-confirmed request
    if (requestConfirmed && scenario !== 'duplicate') {
      setResult({ success: false, message: 'This request is already confirmed. Click "Run Another Test" to start fresh, or click Duplicate to test duplicate prevention.' });
      return;
    }

    // Duplicate needs a saved txnId
    if (scenario === 'duplicate' && !lastSuccessTxnId) {
      setResult({ success: false, message: 'Run Successful Payment first — that saves a transaction ID. Then click Duplicate to reuse it.' });
      return;
    }

    setLoading(true);
    setResult(null);
    setActive(scenario);
    setUnlocked([]);

    try {
      let id      = '';
      let trusted = true;

      if (scenario === 'success') {
        id      = genTxnId();
        trusted = true;
      } else if (scenario === 'untrusted') {
        id      = genTxnId();
        trusted = false;
      } else if (scenario === 'duplicate') {
        id      = lastSuccessTxnId; // intentionally reuse
        trusted = true;
      } else if (scenario === 'late') {
        // Expire the current pending request first
        try {
          await axios.post(`/api/payments/request/${paymentRequest.request_id}/expire`);
        } catch (e) { /* ignore — may already be expired */ }
        id      = genTxnId();
        trusted = true;
      }

      const event = events.find(e => String(e.id) === String(selectedEvent));
      const photographerEmail = event?.photographer_email || 'shreyashsingh205@gmail.com';

      const res = await axios.post('/api/webhook/test-bank-email', {
        photographerEmail,
        amount:        total(),
        transactionId: id,
        isTrusted:     trusted,
      });

      setResult(res.data);

      if (scenario === 'success' && res.data.success) {
        setLastSuccessTxnId(id);  // save for duplicate test
        setRequestConfirmed(true); // lock further success/untrusted/late clicks
      }

      // If confirmed, fetch unlocked photos and advance to step 3
      if (res.data.success) {
        const ph = await axios.get(`/api/payments/request/${res.data.requestId}/photos`);
        setUnlocked(ph.data);
        setStep(3);
      }
    } catch (e) {
      setResult({ error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPaymentRequest(null);
    setQrCode('');
    setUpiId('');
    setResult(null);
    setUnlocked([]);
    setTxnId('');
    setLastSuccessTxnId('');
    setRequestConfirmed(false);
    setSelected([]);
    setStep(1);
    setActive(null);
  };

  const resultBg     = !result ? '#1a1a1a' : result.error ? '#1a0808' : result.success ? '#081a0e' : '#1a1a08';
  const resultBorder = !result ? '#2a2a2a' : result.error ? '#3a1515' : result.success ? '#154a25' : '#3a3a15';
  const resultLabel  = !result ? '' : result.error ? '✕ Error' : result.success ? '✓ Confirmed' : '⚠ Rejected';
  const resultColor  = !result ? '' : result.error ? '#f87171' : result.success ? '#4ade80' : '#fbbf24';

  return (
    <div className="container fade-up" style={{ maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#555', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          ✦ &nbsp; Developer Tools
        </p>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#e8e8e8', marginBottom: '0.4rem' }}>
          Test Panel
        </h1>
        <p style={{ color: '#555', fontSize: '0.88rem' }}>
          End-to-end payment simulation — select photos, create a request, verify, download.
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
        {['Select Photos', 'Simulate Payment', 'Download'].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done   = step > n;
          return (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: done ? '#1a3a2a' : active ? '#2a2a1a' : '#111',
                  border: `1px solid ${done ? '#2d6a4a' : active ? '#5a5a2d' : '#2a2a2a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: '700',
                  color: done ? '#4ade80' : active ? '#fbbf24' : '#444',
                  flexShrink: 0
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize: '0.8rem', color: active ? '#888' : done ? '#4ade80' : '#333', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: '1px', background: step > n ? '#1a3a2a' : '#1e1e1e', maxWidth: '60px' }} />}
            </React.Fragment>
          );
        })}
        {step > 1 && (
          <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #2a2a2a', color: '#444', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>
            ↺ Reset
          </button>
        )}
      </div>

      {/* ── STEP 1: Select Photos ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <p style={{ color: '#444', fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
              Select Photos to Test
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Event</label>
                <select className="input" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Your Email</label>
                <input
                  type="email"
                  className="input"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
            </div>

            {/* Photo grid */}
            {photos.length > 0 && (
              <>
                <p style={{ color: '#333', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                  {selectedPhotos.length === 0 ? 'Click photos to select' : `${selectedPhotos.length} selected · ₹${total().toFixed(2)}`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  {photos.slice(0, 8).map(photo => {
                    const sel = selectedPhotos.includes(photo.id);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => togglePhoto(photo.id)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: `2px solid ${sel ? '#b8860b' : '#1e1e1e'}`,
                          position: 'relative',
                          boxShadow: sel ? '0 0 12px rgba(184,134,11,0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <img
                          src={photo.thumbnail_url}
                          alt=""
                          style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block', opacity: sel ? 1 : 0.55 }}
                        />
                        {sel && (
                          <div style={{
                            position: 'absolute', top: '5px', right: '5px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#b8860b', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.6rem', color: '#000', fontWeight: '700'
                          }}>✓</div>
                        )}
                        <div style={{ padding: '0.3rem 0.5rem', background: '#0e0e0e', textAlign: 'center' }}>
                          <span style={{ color: sel ? '#d4a017' : '#444', fontSize: '0.75rem', fontWeight: '600' }}>
                            ₹{parseFloat(photo.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <button
              className="btn btn-primary"
              onClick={createPaymentRequest}
              disabled={selectedPhotos.length === 0}
              style={{ width: '100%', opacity: selectedPhotos.length === 0 ? 0.4 : 1 }}
            >
              Create Payment Request →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Simulate Payment ── */}
      {step === 2 && paymentRequest && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* QR + details */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#444', fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Payment Request Created
            </p>
            {qrCode && (
              <img src={qrCode} alt="QR" style={{ width: '180px', height: '180px', borderRadius: '8px', marginBottom: '1rem' }} />
            )}
            <div style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', textAlign: 'left' }}>
              <Row label="Amount"  value={`₹${total().toFixed(2)}`} gold />
              <Row label="Photos"  value={`${selectedPhotos.length} selected`} />
              <Row label="UPI ID"  value={upiId} />
              <Row label="Request" value={paymentRequest.request_id?.slice(0, 16) + '…'} mono last />
            </div>
            <p style={{ color: '#333', fontSize: '0.75rem' }}>Now pick a scenario →</p>
          </div>

          {/* Scenarios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: '#444', fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.1rem' }}>
              Scenarios
            </p>
            {SCENARIOS.map(s => {
              const isDisabled = loading || (requestConfirmed && s.id !== 'duplicate');
              return (
                <button
                  key={s.id}
                  className={`btn ${s.color}`}
                  onClick={() => simulate(s.id)}
                  disabled={isDisabled}
                  style={{
                    textAlign: 'left', padding: '0.9rem 1.1rem',
                    height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem',
                    opacity: isDisabled ? 0.3 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{s.icon}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{s.label}</span>
                    {loading && activeScenario === s.id && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', opacity: 0.6 }}>Running…</span>
                    )}
                    {requestConfirmed && s.id === 'duplicate' && !loading && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#fbbf24', opacity: 0.8 }}>← try this</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.74rem', opacity: 0.55, fontWeight: '400' }}>{s.desc}</span>
                </button>
              );
            })}

            {/* Result inline */}
            {result && (
              <div style={{
                background: resultBg, border: `1px solid ${resultBorder}`,
                borderRadius: '8px', padding: '1rem',
                animation: 'fadeUp 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Result</span>
                  <span style={{ color: resultColor, fontSize: '0.78rem', fontWeight: '600' }}>{resultLabel}</span>
                </div>
                <p style={{ color: '#555', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  {result.message || result.error || (result.success ? 'Payment confirmed!' : 'Check response')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Download Unlocked Photos ── */}
      {step === 3 && unlockedPhotos.length > 0 && (
        <div>
          {/* Success banner */}
          <div style={{
            background: '#081a0e', border: '1px solid #154a25', borderRadius: '12px',
            padding: '1.25rem 1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #4ade80, transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: '#1a3a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>✓</div>
              <div>
                <h3 style={{ fontFamily: "'Cinzel', serif", color: '#4ade80', marginBottom: '0.2rem', fontSize: '1.1rem' }}>Payment Verified</h3>
                <p style={{ color: '#2d6a4a', fontSize: '0.84rem' }}>
                  {unlockedPhotos.length} photo{unlockedPhotos.length !== 1 ? 's' : ''} unlocked · click to download
                </p>
              </div>
            </div>
          </div>

          {/* Photo download grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {unlockedPhotos.map(photo => (
              <div key={photo.id} style={{
                background: '#0e0e0e', border: '1px solid #1e1e1e',
                borderRadius: '10px', overflow: 'hidden'
              }}>
                <img
                  src={photo.full_url}
                  alt={photo.filename}
                  style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '0.75rem' }}>
                  <p style={{ color: '#444', fontSize: '0.74rem', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.filename}
                  </p>
                  <a
                    href={photo.full_url}
                    download={photo.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-success"
                    style={{ display: 'block', width: '100%', fontSize: '0.8rem', padding: '0.55rem', textAlign: 'center', textDecoration: 'none' }}
                  >
                    ↓ Download
                  </a>
                </div>
              </div>
            ))}
          </div>

          <button onClick={reset} className="btn btn-secondary" style={{ marginTop: '1.5rem', fontSize: '0.84rem' }}>
            ↺ Run Another Test
          </button>
        </div>
      )}
    </div>
  );
}

// Small helper component for the info rows
function Row({ label, value, gold, mono, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: last ? 0 : '0.5rem', marginBottom: last ? 0 : '0.5rem', borderBottom: last ? 'none' : '1px solid #1a1a1a' }}>
      <span style={{ color: '#444', fontSize: '0.78rem' }}>{label}</span>
      <span style={{ color: gold ? '#d4a017' : '#666', fontSize: '0.78rem', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: gold ? '600' : '400' }}>
        {value}
      </span>
    </div>
  );
}

export default TestPanel;
