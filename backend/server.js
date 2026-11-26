const express = require('express');
const cors = require('cors');
require('dotenv').config();

const photographersRoutes = require('./routes/photographers');
const eventsRoutes = require('./routes/events');
const photosRoutes = require('./routes/photos');
const paymentsRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    db: process.env.DATABASE_URL ? 'DATABASE_URL set' : 'No DATABASE_URL',
    env: process.env.NODE_ENV
  });
});

// One-time seed endpoint (protected by secret)
app.post('/api/setup', async (req, res) => {
  const { secret } = req.body;
  if (secret !== (process.env.WEBHOOK_SECRET || 'celebrare_secret_key_2024')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { execSync } = require('child_process');
    execSync('node backend/scripts/setupDatabase.js', { stdio: 'inherit' });
    execSync('node backend/scripts/seed.js', { stdio: 'inherit' });
    res.json({ success: true, message: 'Database setup and seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.use('/api/photographers', photographersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/webhook', webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

module.exports = app;
