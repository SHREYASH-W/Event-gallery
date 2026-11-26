/**
 * UPI Payment String Generator
 * Generates UPI payment strings and QR codes
 */

const QRCode = require('qrcode');
const { generateUPIReference } = require('./emailVerifier');

/**
 * Generate UPI payment string
 * Format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&tn=<NOTE>&cu=INR
 */
function generateUPIString(photographerUPI, photographerName, amount, requestId) {
  const reference = generateUPIReference(requestId);
  
  const upiParams = {
    pa: photographerUPI,                    // Payee address (UPI ID)
    pn: encodeURIComponent(photographerName), // Payee name
    am: amount.toFixed(2),                   // Amount
    tn: encodeURIComponent(`Photo Payment ${reference}`), // Transaction note with reference
    cu: 'INR'                                // Currency
  };

  const queryString = Object.entries(upiParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `upi://pay?${queryString}`;
}

/**
 * Generate QR code as data URL
 */
async function generateQRCode(upiString) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Generate complete payment data with QR code
 */
async function generatePaymentQR(photographerUPI, photographerName, amount, requestId) {
  const upiString = generateUPIString(photographerUPI, photographerName, amount, requestId);
  const qrCode = await generateQRCode(upiString);
  const reference = generateUPIReference(requestId);
  
  return {
    upiString,
    qrCode,
    reference,
    amount: amount.toFixed(2),
    photographerName,
    photographerUPI
  };
}

module.exports = {
  generateUPIString,
  generateQRCode,
  generatePaymentQR
};
