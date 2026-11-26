/**
 * Production startup script
 * Runs DB setup → seed → starts server
 */

const { execSync } = require('child_process');
const path = require('path');

async function start() {
  console.log('=== Celebrare Startup ===');

  // 1. Setup DB tables
  console.log('\n[1/3] Setting up database tables...');
  try {
    execSync('node backend/scripts/setupDatabase.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('DB setup failed:', err.message);
    process.exit(1);
  }

  // 2. Seed data
  console.log('\n[2/3] Seeding database...');
  try {
    execSync('node backend/scripts/seed.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('Seed failed:', err.message);
    // Don't exit — seed may fail if data already exists, that's fine
  }

  // 3. Start server
  console.log('\n[3/3] Starting server...');
  require('../server.js');
}

start();
