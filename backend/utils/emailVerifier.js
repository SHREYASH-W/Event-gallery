/**
 * Email Verification Utility
 * Validates bank emails for authenticity and extracts transaction details
 */

const crypto = require('crypto');

// Known bank email patterns
const BANK_EMAIL_PATTERNS = {
  SBI: [
    /no-?reply@sbi\.co\.in$/i,
    /alerts@sbi\.co\.in$/i,
    /.*@sbi\.co\.in$/i
  ],
  HDFC: [
    /alerts@hdfcbank\.net$/i,
    /.*@hdfcbank\.net$/i
  ],
  ICICI: [
    /no-?reply@icicibank\.com$/i,
    /.*@icicibank\.com$/i
  ],
  AXIS: [
    /alerts@axisbank\.com$/i,
    /.*@axisbank\.com$/i
  ],
  PAYTM: [
    /alerts@paytm\.com$/i,
    /.*@paytm\.com$/i
  ],
  GPAY: [
    /.*@google\.com$/i,
    /.*@gpay\.com$/i
  ],
  PHONEPE: [
    /.*@phonepe\.com$/i
  ]
};

/**
 * Verify if email is from a trusted bank domain
 */
function isTrustedBankEmail(emailAddress) {
  if (!emailAddress) return { trusted: false, bank: null };

  const normalizedEmail = emailAddress.toLowerCase().trim();
  
  for (const [bank, patterns] of Object.entries(BANK_EMAIL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedEmail)) {
        return { trusted: true, bank };
      }
    }
  }
  
  return { trusted: false, bank: null };
}

/**
 * Extract transaction details from email content
 * This is a simplified parser - in production, you'd have bank-specific parsers
 */
function extractTransactionDetails(emailText, emailSubject) {
  const details = {
    transactionId: null,
    amount: null,
    fromAccount: null,
    toAccount: null,
    upiRef: null,
    timestamp: null
  };

  // Extract transaction ID (various patterns)
  const txnPatterns = [
    /(?:Transaction ID|Txn ID|Reference No|UTR|UPI Ref)[\s:]+([A-Z0-9]+)/i,
    /(?:Transaction|Txn)[\s:#]+([0-9]{12,})/i,
    /UTR[\s:]+([A-Z0-9]+)/i
  ];

  for (const pattern of txnPatterns) {
    const match = emailText.match(pattern) || emailSubject.match(pattern);
    if (match) {
      details.transactionId = match[1];
      break;
    }
  }

  // Extract amount
  const amountPatterns = [
    /(?:Amount|Rs\.?|INR)[\s:]+(?:Rs\.?)?[\s]*([\d,]+\.?\d*)/i,
    /(?:Credited|Debited|Paid|Received)[\s]+(?:Rs\.?|INR)?[\s]*([\d,]+\.?\d*)/i,
    /Rs\.?\s*([\d,]+\.?\d*)/i
  ];

  for (const pattern of amountPatterns) {
    const match = emailText.match(pattern);
    if (match) {
      details.amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract UPI reference from text
  const upiRefMatch = emailText.match(/([A-Z0-9]{12,})/);
  if (upiRefMatch) {
    details.upiRef = upiRefMatch[1];
  }

  // Extract account info
  const accountMatch = emailText.match(/(?:to|from)\s+([A-Za-z0-9@._-]+)/i);
  if (accountMatch) {
    details.toAccount = accountMatch[1];
  }

  return details;
}

/**
 * Verify DKIM signature (simplified version)
 * In production, use a proper DKIM verification library
 */
function verifyDKIMSignature(emailHeaders) {
  // This is a placeholder for DKIM verification
  // In a real system, you'd:
  // 1. Extract the DKIM-Signature header
  // 2. Parse the signature parameters (d=, s=, h=, b=)
  // 3. Fetch the public key from DNS
  // 4. Verify the signature
  
  if (!emailHeaders) return false;
  
  // For demo purposes, we'll check if DKIM-Signature header exists
  const dkimHeader = emailHeaders.find(h => 
    h.key && h.key.toLowerCase() === 'dkim-signature'
  );
  
  return !!dkimHeader;
}

/**
 * Verify SPF (Sender Policy Framework)
 * Simplified check
 */
function verifySPF(receivedHeaders, fromEmail) {
  // In production, you'd check if the sending IP is authorized
  // by the domain's SPF record in DNS
  
  // For demo, we'll do a basic check
  if (!receivedHeaders || !fromEmail) return false;
  
  // Check if Received headers contain authentication results
  const authResult = receivedHeaders.find(h => 
    h.includes('spf=pass') || h.includes('Authentication-Results')
  );
  
  return !!authResult;
}

/**
 * Complete email verification
 */
function verifyBankEmail(emailData) {
  const {
    from,
    subject,
    text,
    html,
    headers,
    receivedHeaders
  } = emailData;

  const verification = {
    isValid: false,
    isTrusted: false,
    bank: null,
    hasDKIM: false,
    hasSPF: false,
    transactionDetails: null,
    errors: []
  };

  // Check if from a trusted bank
  const bankCheck = isTrustedBankEmail(from);
  verification.isTrusted = bankCheck.trusted;
  verification.bank = bankCheck.bank;

  if (!verification.isTrusted) {
    verification.errors.push('Email not from trusted bank domain');
  }

  // Verify DKIM
  verification.hasDKIM = verifyDKIMSignature(headers);
  if (!verification.hasDKIM) {
    verification.errors.push('DKIM signature missing or invalid');
  }

  // Verify SPF
  verification.hasSPF = verifySPF(receivedHeaders, from);
  if (!verification.hasSPF) {
    verification.errors.push('SPF verification failed');
  }

  // Extract transaction details
  const emailText = text || html || '';
  verification.transactionDetails = extractTransactionDetails(emailText, subject || '');

  if (!verification.transactionDetails.transactionId) {
    verification.errors.push('Could not extract transaction ID');
  }

  if (!verification.transactionDetails.amount) {
    verification.errors.push('Could not extract transaction amount');
  }

  // Email is valid if it's from trusted bank and has transaction details
  verification.isValid = verification.isTrusted && 
                        verification.transactionDetails.transactionId &&
                        verification.transactionDetails.amount;

  return verification;
}

/**
 * Generate a unique reference ID for UPI transactions
 * This will be included in the UPI string
 */
function generateUPIReference(paymentRequestId) {
  // Create a short, unique reference that can be matched
  const hash = crypto.createHash('sha256')
    .update(paymentRequestId)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
  
  return `CEL${hash}`;
}

module.exports = {
  isTrustedBankEmail,
  extractTransactionDetails,
  verifyDKIMSignature,
  verifySPF,
  verifyBankEmail,
  generateUPIReference
};
