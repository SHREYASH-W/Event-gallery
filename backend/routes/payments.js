const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { generatePaymentQR } = require('../utils/upiGenerator');

// Create payment request
router.post('/request', async (req, res) => {
  try {
    const { event_id, guest_email, photo_ids } = req.body;
    
    if (!event_id || !guest_email || !photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get event and photographer details
    const eventResult = await pool.query(`
      SELECT e.*, p.id as photographer_id, p.name as photographer_name, p.upi_id 
      FROM events e 
      JOIN photographers p ON e.photographer_id = p.id 
      WHERE e.id = $1
    `, [event_id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = eventResult.rows[0];

    // Get photos and calculate total amount
    const photosResult = await pool.query(
      'SELECT * FROM photos WHERE id = ANY($1) AND event_id = $2',
      [photo_ids, event_id]
    );
    
    if (photosResult.rows.length !== photo_ids.length) {
      return res.status(400).json({ error: 'Some photos not found or do not belong to this event' });
    }
    
    const totalAmount = photosResult.rows.reduce((sum, photo) => sum + parseFloat(photo.price), 0);

    // Generate unique request ID
    const requestId = uuidv4();
    
    // Generate UPI payment string and QR code
    const paymentData = await generatePaymentQR(
      event.upi_id,
      event.photographer_name,
      totalAmount,
      requestId
    );

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Insert payment request
    const result = await pool.query(`
      INSERT INTO payment_requests 
        (request_id, photographer_id, event_id, guest_email, photo_ids, amount, upi_string, expires_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `, [
      requestId,
      event.photographer_id,
      event_id,
      guest_email,
      photo_ids,
      totalAmount,
      paymentData.upiString,
      expiresAt
    ]);

    res.status(201).json({
      paymentRequest: result.rows[0],
      qrCode: paymentData.qrCode,
      upiString: paymentData.upiString,
      reference: paymentData.reference,
      expiresAt: expiresAt.toISOString(),
      photos: photosResult.rows
    });

  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

// Get payment request status
router.get('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await pool.query(`
      SELECT pr.*, 
             e.name as event_name,
             p.name as photographer_name,
             p.upi_id,
             t.id as transaction_id,
             t.bank_transaction_id,
             t.status as transaction_status,
             t.email_verified
      FROM payment_requests pr
      JOIN events e ON pr.event_id = e.id
      JOIN photographers p ON pr.photographer_id = p.id
      LEFT JOIN transactions t ON t.payment_request_id = pr.id
      WHERE pr.request_id = $1
    `, [requestId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    const paymentRequest = result.rows[0];
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(paymentRequest.expires_at);
    
    if (now > expiresAt && paymentRequest.status === 'pending') {
      // Update status to expired
      await pool.query(
        'UPDATE payment_requests SET status = $1 WHERE request_id = $2',
        ['expired', requestId]
      );
      paymentRequest.status = 'expired';
    }
    
    res.json(paymentRequest);
    
  } catch (error) {
    console.error('Error fetching payment request:', error);
    res.status(500).json({ error: 'Failed to fetch payment request' });
  }
});

// Get photos for a confirmed payment request
router.get('/request/:requestId/photos', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Get payment request
    const paymentResult = await pool.query(
      'SELECT * FROM payment_requests WHERE request_id = $1',
      [requestId]
    );
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    const paymentRequest = paymentResult.rows[0];
    
    // Check if payment is confirmed
    if (paymentRequest.status !== 'confirmed') {
      return res.status(403).json({ 
        error: 'Payment not confirmed',
        status: paymentRequest.status
      });
    }
    
    // Get photos
    const photosResult = await pool.query(
      'SELECT * FROM photos WHERE id = ANY($1)',
      [paymentRequest.photo_ids]
    );
    
    res.json(photosResult.rows);
    
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Mark payment as expired (manual trigger for testing)
router.post('/request/:requestId/expire', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await pool.query(
      'UPDATE payment_requests SET status = $1 WHERE request_id = $2 AND status = $3 RETURNING *',
      ['expired', requestId, 'pending']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment request not found or already processed' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error expiring payment request:', error);
    res.status(500).json({ error: 'Failed to expire payment request' });
  }
});

module.exports = router;
