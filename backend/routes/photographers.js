const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all photographers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, upi_id FROM photographers ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching photographers:', error);
    res.status(500).json({ error: 'Failed to fetch photographers' });
  }
});

// Get photographer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, upi_id FROM photographers WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photographer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching photographer:', error);
    res.status(500).json({ error: 'Failed to fetch photographer' });
  }
});

// Get photographer's events
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM events WHERE photographer_id = $1 ORDER BY date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new photographer
router.post('/', async (req, res) => {
  try {
    const { name, email, upi_id, bank_email } = req.body;
    
    if (!name || !email || !upi_id || !bank_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO photographers (name, email, upi_id, bank_email) 
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, upi_id`,
      [name, email, upi_id, bank_email]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating photographer:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create photographer' });
  }
});

module.exports = router;
