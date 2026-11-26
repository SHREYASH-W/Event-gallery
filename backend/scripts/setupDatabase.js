const { Pool } = require('pg');
require('dotenv').config();

// Connect without database to create it
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: 'postgres'
});

async function setupDatabase() {
  try {
    console.log('Creating database if not exists...');
    await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'celebrare_upi'}`);
    console.log('Database created successfully');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database already exists');
    } else {
      console.error('Error creating database:', error);
    }
  }

  await adminPool.end();

  // Now connect to the new database to create tables
  const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'celebrare_upi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('Creating tables...');

    // Photographers table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS photographers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        upi_id VARCHAR(255) NOT NULL,
        bank_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created photographers table');

    // Events table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        photographer_id INTEGER REFERENCES photographers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created events table');

    // Photos table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        thumbnail_url TEXT,
        full_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created photos table');

    // Payment requests table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(100) UNIQUE NOT NULL,
        photographer_id INTEGER REFERENCES photographers(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        guest_email VARCHAR(255) NOT NULL,
        photo_ids INTEGER[] NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        upi_string TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created payment_requests table');

    // Transactions table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        payment_request_id INTEGER REFERENCES payment_requests(id) ON DELETE CASCADE,
        bank_transaction_id VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        from_account VARCHAR(255),
        to_account VARCHAR(255),
        email_received_at TIMESTAMP NOT NULL,
        email_from VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bank_transaction_id)
      )
    `);
    console.log('Created transactions table');

    // Create indexes for better performance
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_payment_requests_request_id ON payment_requests(request_id)');
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)');
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_transactions_bank_transaction_id ON transactions(bank_transaction_id)');
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_at ON payment_requests(expires_at)');
    
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up tables:', error);
  } finally {
    await dbPool.end();
  }
}

setupDatabase();
