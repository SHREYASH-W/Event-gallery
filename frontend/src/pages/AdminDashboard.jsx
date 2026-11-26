import React, { useState, useEffect } from 'react';
import api from '../api';

function AdminDashboard() {
  const [photographers, setPhotographers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [photographersResponse, eventsResponse] = await Promise.all([
        api.get('/api/photographers'),
        api.get('/api/events')
      ]);
      setPhotographers(photographersResponse.data);
      setEvents(eventsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '4rem', color: 'white' }}>
          <div style={{ fontSize: '2rem' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem' }}>
          Manage photographers and events
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Photographers</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>UPI ID</th>
              </tr>
            </thead>
            <tbody>
              {photographers.map((photographer) => (
                <tr key={photographer.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{photographer.name}</td>
                  <td style={{ padding: '1rem' }}>{photographer.email}</td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                    {photographer.upi_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Events</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Event Name</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Photographer</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{event.name}</td>
                  <td style={{ padding: '1rem' }}>
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>{event.photographer_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

