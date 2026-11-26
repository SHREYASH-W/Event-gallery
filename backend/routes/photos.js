const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get photo by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM photos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// Get multiple photos by IDs
router.post('/batch', async (req, res) => {
  try {
    const { photo_ids } = req.body;
    
    if (!photo_ids || !Array.isArray(photo_ids)) {
      return res.status(400).json({ error: 'Invalid photo_ids' });
    }
    
    const result = await pool.query(
      'SELECT * FROM photos WHERE id = ANY($1)',
      [photo_ids]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Create new photo
router.post('/', async (req, res) => {
  try {
    const { event_id, filename, price, thumbnail_url, full_url } = req.body;
    
    if (!event_id || !filename || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO photos (event_id, filename, price, thumbnail_url, full_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event_id, filename, price, thumbnail_url, full_url]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating photo:', error);
    res.status(500).json({ error: 'Failed to create photo' });
  }
});

module.exports = router;
