const pool = require('../config/database');

async function seed() {
  try {
    console.log('Seeding database...');

    // Create two photographers
    const photographer1 = await pool.query(
      `INSERT INTO photographers (name, email, upi_id, bank_email) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, upi_id = EXCLUDED.upi_id, bank_email = EXCLUDED.bank_email
       RETURNING id`,
      ['Shreyash Singh', 'shreyashsingh205@gmail.com', '7983695049@ptsbi', 'shreyashsingh205@gmail.com']
    );

    const photographer2 = await pool.query(
      `INSERT INTO photographers (name, email, upi_id, bank_email) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, upi_id = EXCLUDED.upi_id, bank_email = EXCLUDED.bank_email
       RETURNING id`,
      ['Priya Singh', 'priya@example.com', 'priyasingh@paytm', 'priya@example.com']
    );

    const p1Id = photographer1.rows[0].id;
    const p2Id = photographer2.rows[0].id;

    console.log(`Created photographers with IDs: ${p1Id}, ${p2Id}`);

    // Create events
    const event1 = await pool.query(
      `INSERT INTO events (photographer_id, name, date) 
       VALUES ($1, $2, $3) RETURNING id`,
      [p1Id, 'My Photography Event 2024', '2024-12-01']
    );

    const event2 = await pool.query(
      `INSERT INTO events (photographer_id, name, date) 
       VALUES ($1, $2, $3) RETURNING id`,
      [p2Id, 'Mumbai Marathon 2024', '2024-01-21']
    );

    const e1Id = event1.rows[0].id;
    const e2Id = event2.rows[0].id;

    console.log(`Created events with IDs: ${e1Id}, ${e2Id}`);

    // Create sample photos for event 1
    const photoPromises1 = [];
    for (let i = 1; i <= 10; i++) {
      photoPromises1.push(
        pool.query(
          `INSERT INTO photos (event_id, filename, price, thumbnail_url, full_url) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            e1Id,
            `navratri_${i}.jpg`,
            1.00,
            `https://picsum.photos/seed/nav${i}/300/200`,
            `https://picsum.photos/seed/nav${i}/1920/1080`
          ]
        )
      );
    }

    // Create sample photos for event 2
    const photoPromises2 = [];
    for (let i = 1; i <= 10; i++) {
      photoPromises2.push(
        pool.query(
          `INSERT INTO photos (event_id, filename, price, thumbnail_url, full_url) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            e2Id,
            `marathon_${i}.jpg`,
            1.00,
            `https://picsum.photos/seed/mar${i}/300/200`,
            `https://picsum.photos/seed/mar${i}/1920/1080`
          ]
        )
      );
    }

    await Promise.all([...photoPromises1, ...photoPromises2]);
    console.log('Created sample photos');

    console.log('Database seeded successfully!');
    console.log('\nPhotographer 1:');
    console.log(`  Name: Shreyash Singh`);
    console.log(`  Email: shreyashsingh205@gmail.com`);
    console.log(`  UPI: 7983695049@ptsbi`);
    console.log(`  Event: My Photography Event 2024`);
    console.log('\nPhotographer 2:');
    console.log(`  Name: Priya Singh`);
    console.log(`  Email: priya@example.com`);
    console.log(`  UPI: priyasingh@paytm`);
    console.log(`  Event: Mumbai Marathon 2024`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seed();
