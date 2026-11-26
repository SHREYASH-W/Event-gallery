const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyBankEmail, generateUPIReference } = require('../utils/emailVerifier');

/**
 * Webhook endpoint to receive bank transaction emails
 * This would be called by Cloudflare Email Workers
 */
router.post('/bank-email', async (req, res) => {
  try {
    const { from, to, subject, text, html, headers } = req.body;
    
    console.log('Received email webhook:', { from, to, subject });

    // Verify webhook secret (in production)
    const webhookSecret = req.headers['x-webhook-secret'];
    if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Prepare email data for verification
    const emailData = {
      from,
      subject,
      text,
      html,
      headers: headers || [],
      receivedHeaders: headers ? headers.filter(h => h.key === 'Received') : []
    };

    // Verify bank email authenticity
    const verification = verifyBankEmail(emailData);
    
    console.log('Email verification result:', verification);

    if (!verification.isValid) {
      console.log('Invalid email:', verification.errors);
      return res.status(200).json({ 
        success: false, 
        message: 'Email validation failed',
        errors: verification.errors 
      });
    }

    const { transactionDetails } = verification;
    const { transactionId, amount } = transactionDetails;

    // Check if transaction already exists (prevent duplicate processing)
    const existingTxn = await pool.query(
      'SELECT * FROM transactions WHERE bank_transaction_id = $1',
      [transactionId]
    );

    if (existingTxn.rows.length > 0) {
      console.log('Duplicate transaction detected:', transactionId);
      return res.status(200).json({ 
        success: false, 
        message: 'Transaction already processed',
        transactionId 
      });
    }

    // Find matching payment request
    // We need to match by amount and photographer's email (to)
    const photographerResult = await pool.query(
      'SELECT * FROM photographers WHERE bank_email = $1',
      [to]
    );

    if (photographerResult.rows.length === 0) {
      console.log('No photographer found for email:', to);
      return res.status(200).json({ 
        success: false, 
        message: 'Photographer not found' 
      });
    }

    const photographer = photographerResult.rows[0];

    // Find pending payment requests for this photographer with matching amount
    // that are not expired
    const now = new Date();
    const paymentRequestResult = await pool.query(`
      SELECT * FROM payment_requests 
      WHERE photographer_id = $1 
        AND amount = $2 
        AND status = 'pending' 
        AND expires_at > $3
      ORDER BY created_at ASC
      LIMIT 1
    `, [photographer.id, amount, now]);

    if (paymentRequestResult.rows.length === 0) {
      console.log('No matching payment request found');
      
      // Check if there was an expired request
      const expiredResult = await pool.query(`
        SELECT * FROM payment_requests 
        WHERE photographer_id = $1 
          AND amount = $2 
          AND expires_at <= $3
        ORDER BY created_at DESC
        LIMIT 1
      `, [photographer.id, amount, now]);

      if (expiredResult.rows.length > 0) {
        // Record transaction but mark as expired
        await pool.query(`
          INSERT INTO transactions 
            (payment_request_id, bank_transaction_id, amount, from_account, to_account, 
             email_received_at, email_from, email_verified, status) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          expiredResult.rows[0].id,
          transactionId,
          amount,
          transactionDetails.fromAccount,
          transactionDetails.toAccount || photographer.upi_id,
          new Date(),
          from,
          verification.isTrusted && verification.hasDKIM,
          'expired'
        ]);

        return res.status(200).json({ 
          success: false, 
          message: 'Payment arrived after 5-minute expiry',
          status: 'expired'
        });
      }

      return res.status(200).json({ 
        success: false, 
        message: 'No matching payment request found' 
      });
    }

    const paymentRequest = paymentRequestResult.rows[0];

    // Create transaction record
    const transactionResult = await pool.query(`
      INSERT INTO transactions 
        (payment_request_id, bank_transaction_id, amount, from_account, to_account, 
         email_received_at, email_from, email_verified, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *
    `, [
      paymentRequest.id,
      transactionId,
      amount,
      transactionDetails.fromAccount,
      transactionDetails.toAccount || photographer.upi_id,
      new Date(),
      from,
      verification.isTrusted && verification.hasDKIM,
      'confirmed'
    ]);

    // Update payment request status to confirmed
    await pool.query(
      'UPDATE payment_requests SET status = $1 WHERE id = $2',
      ['confirmed', paymentRequest.id]
    );

    console.log('Payment confirmed:', {
      requestId: paymentRequest.request_id,
      transactionId,
      amount
    });

    res.json({ 
      success: true, 
      message: 'Payment confirmed',
      requestId: paymentRequest.request_id,
      transactionId,
      amount
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Test endpoint to simulate bank email (for demonstration)
 */
router.post('/test-bank-email', async (req, res) => {
  try {
    const { 
      photographerEmail, 
      amount, 
      transactionId,
      isTrusted = true 
    } = req.body;

    if (!photographerEmail || !amount || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Simulate bank email
    const simulatedEmail = {
      from: isTrusted ? 'no-reply@sbi.co.in' : 'fake@scammer.com',
      to: photographerEmail,
      subject: `You have received Rs. ${amount}`,
      text: `
        Dear Customer,
        
        Your account has been credited with Rs. ${amount}
        
        Transaction ID: ${transactionId}
        Amount: Rs. ${amount}
        Date: ${new Date().toLocaleString()}
        
        Thank you for banking with us.
      `,
      html: null,
      headers: isTrusted ? [
        { key: 'DKIM-Signature', value: 'v=1; a=rsa-sha256; d=sbi.co.in;' }
      ] : []
    };

    // Forward to main webhook handler
    req.body = simulatedEmail;
    
    // Call the webhook processing logic
    const verification = verifyBankEmail(simulatedEmail);
    
    if (!verification.isValid) {
      return res.json({ 
        success: false, 
        message: 'Email validation failed',
        errors: verification.errors 
      });
    }

    const { transactionDetails } = verification;

    // Check for duplicates
    const existingTxn = await pool.query(
      'SELECT * FROM transactions WHERE bank_transaction_id = $1',
      [transactionId]
    );

    if (existingTxn.rows.length > 0) {
      return res.json({ 
        success: false, 
        message: 'Duplicate transaction detected',
        transactionId 
      });
    }

    // Find photographer
    const photographerResult = await pool.query(
      'SELECT * FROM photographers WHERE bank_email = $1',
      [photographerEmail]
    );

    if (photographerResult.rows.length === 0) {
      return res.json({ 
        success: false, 
        message: 'Photographer not found' 
      });
    }

    const photographer = photographerResult.rows[0];
    const now = new Date();

    // Find matching payment request
    const paymentRequestResult = await pool.query(`
      SELECT * FROM payment_requests 
      WHERE photographer_id = $1 
        AND amount = $2 
        AND status = 'pending' 
        AND expires_at > $3
      ORDER BY created_at ASC
      LIMIT 1
    `, [photographer.id, amount, now]);

    if (paymentRequestResult.rows.length === 0) {
      // Check for expired requests
      const expiredResult = await pool.query(`
        SELECT * FROM payment_requests 
        WHERE photographer_id = $1 
          AND amount = $2 
          AND expires_at <= $3
        ORDER BY created_at DESC
        LIMIT 1
      `, [photographer.id, amount, now]);

      if (expiredResult.rows.length > 0) {
        await pool.query(`
          INSERT INTO transactions 
            (payment_request_id, bank_transaction_id, amount, email_received_at, 
             email_from, email_verified, status) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          expiredResult.rows[0].id,
          transactionId,
          amount,
          new Date(),
          simulatedEmail.from,
          verification.isTrusted,
          'expired'
        ]);

        return res.json({ 
          success: false, 
          message: 'Payment arrived after 5-minute expiry',
          status: 'expired'
        });
      }

      return res.json({ 
        success: false, 
        message: 'No matching payment request found' 
      });
    }

    const paymentRequest = paymentRequestResult.rows[0];

    // Create transaction
    await pool.query(`
      INSERT INTO transactions 
        (payment_request_id, bank_transaction_id, amount, email_received_at, 
         email_from, email_verified, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      paymentRequest.id,
      transactionId,
      amount,
      new Date(),
      simulatedEmail.from,
      verification.isTrusted,
      'confirmed'
    ]);

    // Update payment request
    await pool.query(
      'UPDATE payment_requests SET status = $1 WHERE id = $2',
      ['confirmed', paymentRequest.id]
    );

    res.json({ 
      success: true, 
      message: 'Payment confirmed',
      requestId: paymentRequest.request_id,
      transactionId,
      amount
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Failed to process test email' });
  }
});

module.exports = router;
