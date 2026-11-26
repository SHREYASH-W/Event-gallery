/**
 * Cloudflare Email Worker
 * Receives bank transaction emails and forwards them to the backend webhook
 * 
 * Setup Instructions:
 * 1. Create a Cloudflare account and enable Email Routing
 * 2. Add a custom email address for each photographer (e.g., photographer@yourdomain.com)
 * 3. Set up Email Workers to process incoming emails
 * 4. Deploy this worker script
 * 5. Configure photographer's bank to send transaction alerts to their custom email
 */

export default {
  async email(message, env, ctx) {
    // Extract email data
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get('subject') || '';
    
    // Get email body
    const rawEmail = await new Response(message.raw).text();
    
    // Extract text and HTML content
    let textContent = '';
    let htmlContent = '';
    
    try {
      // Simple text extraction (in production, use a proper email parser)
      textContent = await message.text();
      htmlContent = await message.html();
    } catch (error) {
      console.error('Error extracting email content:', error);
    }

    // Extract all headers
    const headers = [];
    for (const [key, value] of message.headers) {
      headers.push({ key, value });
    }

    // Prepare webhook payload
    const webhookPayload = {
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent,
      headers: headers,
      receivedAt: new Date().toISOString()
    };

    // Forward to backend webhook
    try {
      const response = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': env.WEBHOOK_SECRET
        },
        body: JSON.stringify(webhookPayload)
      });

      const result = await response.json();
      console.log('Webhook response:', result);

      // Optionally forward the email to the photographer
      if (env.FORWARD_TO_PHOTOGRAPHER) {
        await message.forward(to);
      }

    } catch (error) {
      console.error('Error forwarding to webhook:', error);
      // Still forward email to photographer on error
      await message.forward(to);
    }
  }
};

/**
 * Configuration via wrangler.toml:
 * 
 * [vars]
 * WEBHOOK_URL = "https://your-backend-domain.com/api/webhook/bank-email"
 * FORWARD_TO_PHOTOGRAPHER = "true"
 * 
 * [secrets]
 * WEBHOOK_SECRET = "your-webhook-secret-here"
 */
