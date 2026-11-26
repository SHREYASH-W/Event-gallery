const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all events
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, p.name as photographer_name, p.upi_id, p.email as photographer_email
      FROM events e 
      JOIN photographers p ON e.photographer_id = p.id 
      ORDER BY e.date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, p.name as photographer_name, p.upi_id, p.id as photographer_id
      FROM events e 
      JOIN photographers p ON e.photographer_id = p.id 
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get photos for an event
router.get('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM photos WHERE event_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Create new event
router.post('/', async (req, res) => {
  try {
    const { photographer_id, name, date } = req.body;
    
    if (!photographer_id || !name || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO events (photographer_id, name, date) 
       VALUES ($1, $2, $3) RETURNING *`,
      [photographer_id, name, date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

module.exports = router;
