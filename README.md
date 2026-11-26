# Celebrare - Direct UPI Payments for Event Photos

A complete system for photographers to receive direct UPI payments for event photos, with automatic payment verification via bank emails.

## 🎯 Problem Statement

Photographers at large events (Navratri, marathons, etc.) take thousands of photos and sell them to guests. Traditional payment gateways like Razorpay or PhonePe add costs through gateway charges, onboarding requirements, and GST compliance - especially burdensome for small, local photographers.

## 💡 Solution

This system allows guests to pay photographers directly to their UPI ID. Celebrare recognizes payment arrival through bank transaction emails and automatically unlocks photos - without using a payment gateway to collect money.

## 🏗️ Architecture

### Components

1. **Backend API** (Node.js + Express + PostgreSQL)
   - Manages photographers, events, photos, and payment requests
   - Generates UPI payment QR codes with unique references
   - Processes bank email webhooks
   - Verifies email authenticity (DKIM/SPF)
   - Matches payments to requests within 5-minute window

2. **Frontend** (React + Vite)
   - Guest interface for browsing photos and creating payment requests
   - Real-time payment status updates
   - Admin dashboard for photographers
   - Test panel for demonstration

3. **Cloudflare Email Worker**
   - Receives bank transaction emails
   - Validates and forwards to backend webhook
   - Provides secure email routing

4. **PostgreSQL Database**
   - Stores photographers, events, photos
   - Tracks payment requests and transactions
   - Prevents duplicate transaction processing

## 🔐 Security Features

### Email Verification
- **DKIM Signature Validation**: Verifies email authenticity
- **SPF Checks**: Ensures sender is authorized
- **Bank Domain Whitelist**: Only accepts emails from known bank domains
- **Transaction ID Validation**: Prevents replay attacks

### Payment Matching
- **Unique Reference IDs**: Each payment request has a unique ID embedded in UPI string
- **5-Minute Expiry**: Payment requests expire to prevent late matching
- **Amount Verification**: Matches exact payment amount
- **Photographer Verification**: Confirms payment went to correct photographer
- **Duplicate Prevention**: Transaction IDs are unique in database

### Edge Cases Handled

1. **Late Payments**: Payments arriving after 5-minute expiry are recorded but marked as expired
2. **Duplicate Transactions**: Same transaction ID cannot be used twice
3. **Untrusted Emails**: Fake/spoofed emails are rejected
4. **Multiple Simultaneous Payments**: Proper matching using photographer ID + amount + timestamp
5. **Same Amount from Different Guests**: First-come-first-served with unique reference tracking

## 📋 Requirements Checklist

- ✅ **Multi-photographer support**: Each has own UPI ID
- ✅ **UPI QR Generation**: Generates payment QR codes with correct amount
- ✅ **Email-based verification**: Uses bank transaction emails (Cloudflare integration)
- ✅ **Email trust verification**: DKIM/SPF validation, bank domain whitelist
- ✅ **5-minute time limit**: Requests expire after 5 minutes
- ✅ **Correct matching**: Handles multiple photographers/events/guests simultaneously
- ✅ **Duplicate prevention**: Transaction IDs tracked to prevent reuse
- ✅ **Guest experience**: Shows pending/confirmed/expired status
- ✅ **Photo unlocking**: Automatic unlock on payment confirmation

## 🚀 Setup Instructions

### Prerequisites

**Option 1: Local Setup**
- Node.js 18+ and npm
- PostgreSQL 14+
- Cloudflare account (for Email Workers)

**Option 2: Docker Setup** (Recommended for easy setup)
- Docker Desktop
- Node.js 18+ (for frontend only)
- 10GB free disk space

### Quick Start with Docker (Easiest)

```bash
# 1. Start backend + PostgreSQL with Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Start frontend locally
cd frontend
npm install
npm run dev
```

**Done!** Visit http://localhost:5173

For detailed Docker setup including disk cleanup, see **[DOCKER_SETUP.md](DOCKER_SETUP.md)**

### Backend Setup (Local - Without Docker)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Setup database**
   ```bash
   npm run setup-db
   npm run seed
   ```

4. **Start backend server**
   ```bash
   npm run server
   ```
   Server runs on http://localhost:3000

### Frontend Setup

1. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend runs on http://localhost:5173

### Cloudflare Email Worker Setup

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Configure Cloudflare**
   - Enable Email Routing in Cloudflare Dashboard
   - Add your domain and verify DNS
   - Create custom email addresses for photographers

3. **Deploy Worker**
   ```bash
   cd cloudflare-worker
   wrangler secret put WEBHOOK_SECRET
   wrangler deploy
   ```

4. **Configure Email Routes**
   - In Cloudflare Dashboard → Email Routing → Routes
   - Add routes to trigger the worker
   - Example: photographer1@yourdomain.com → email-worker

## 🧪 Testing & Demonstration

### Test Panel

Access http://localhost:5173/test to demonstrate all scenarios:

#### 1. Successful Payment
1. Go to Events page and select an event
2. Select photos and create payment request
3. Note the amount and photographer email
4. Go to Test Panel
5. Enter matching details and click "Successful Payment"
6. Payment page should update to "Confirmed"
7. Photos should unlock for download

#### 2. Untrusted Email
1. Create payment request
2. In Test Panel, uncheck "From Trusted Bank Email"
3. Click "Untrusted Email"
4. Should be rejected with error message

#### 3. Duplicate Transaction
1. Run successful payment first
2. Without changing transaction ID, click "Duplicate Transaction"
3. Should be rejected as duplicate

#### 4. Late Payment (After 5 Minutes)
1. Create payment request
2. Expire it manually: `POST /api/payments/request/:requestId/expire`
3. In Test Panel, simulate payment
4. Should be recorded but marked as "expired"

### Manual Testing with cURL

```bash
# Create payment request
curl -X POST http://localhost:3000/api/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "guest_email": "guest@example.com",
    "photo_ids": [1, 2, 3]
  }'

# Simulate bank email (successful)
curl -X POST http://localhost:3000/api/webhook/test-bank-email \
  -H "Content-Type: application/json" \
  -d '{
    "photographerEmail": "rajesh@example.com",
    "amount": 150.00,
    "transactionId": "TXN123456789",
    "isTrusted": true
  }'

# Check payment status
curl http://localhost:3000/api/payments/request/{requestId}
```

## 📊 Database Schema

### Photographers
- id, name, email, upi_id, bank_email

### Events
- id, photographer_id, name, date

### Photos
- id, event_id, filename, price, thumbnail_url, full_url

### Payment Requests
- id, request_id (UUID), photographer_id, event_id, guest_email
- photo_ids (array), amount, upi_string, status, expires_at

### Transactions
- id, payment_request_id, bank_transaction_id (unique)
- amount, from_account, to_account
- email_received_at, email_from, email_verified, status

## 🔄 Payment Flow

1. **Guest selects photos** → Creates payment request
2. **System generates**:
   - Unique request ID
   - UPI payment string with reference
   - QR code
   - 5-minute expiry timestamp
3. **Guest scans QR** → Pays via any UPI app
4. **Bank sends email** → To photographer's registered email
5. **Cloudflare Worker** → Receives email, forwards to webhook
6. **Backend verifies**:
   - Email is from trusted bank (DKIM/SPF)
   - Transaction ID is unique
   - Amount matches pending request
   - Request not expired
7. **On success**:
   - Create transaction record
   - Update request status to "confirmed"
   - Unlock photos for guest
8. **Guest downloads** → Full resolution photos

## 🎨 UPI String Format

```
upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&tn=Photo Payment <REF>&cu=INR
```

- `pa`: Photographer's UPI ID
- `pn`: Photographer's name
- `am`: Total amount
- `tn`: Transaction note with unique reference (CEL + hash)
- `cu`: Currency (INR)

## 🔧 Extending the System

### Adding More Banks

Edit `backend/utils/emailVerifier.js`:

```javascript
const BANK_EMAIL_PATTERNS = {
  NEWBANK: [
    /alerts@newbank\.com$/i,
    /.*@newbank\.com$/i
  ]
};
```

### Adding Bank-Specific Parsers

Each bank has different email formats. Create bank-specific parsers:

```javascript
function parseSBIEmail(emailText) {
  // Extract transaction details specific to SBI format
}

function parseHDFCEmail(emailText) {
  // Extract transaction details specific to HDFC format
}
```

### Scaling to More Photographers

The system is designed to handle multiple photographers:

1. **Unique UPI IDs**: Each photographer has their own
2. **Separate Email Addresses**: Each gets their own forwarding email
3. **Independent Payment Requests**: No conflicts between photographers
4. **Database Indexing**: Optimized for fast lookups
5. **Cloudflare Workers**: Scales automatically

### Production Considerations

1. **Email Parsing**: Implement bank-specific email parsers
2. **DKIM Verification**: Use proper DKIM library (e.g., dkim-verify)
3. **Rate Limiting**: Prevent webhook abuse
4. **Monitoring**: Log all payment verifications
5. **Backup Matching**: Manual review dashboard for edge cases
6. **Refund Handling**: Process for late payments
7. **Photo Storage**: Use CDN (Cloudflare R2, AWS S3)
8. **Database**: Connection pooling, read replicas
9. **Caching**: Redis for payment status checks
10. **Queue**: Background job processing for email verification

## 🤔 Design Decisions

### Why Email-Based Verification?

1. **No Gateway Integration**: Avoids KYC, compliance, fees
2. **Universal**: Works with any bank/UPI app
3. **Reliable**: Bank emails are trusted sources
4. **Automatic**: No manual verification needed
5. **Auditable**: Email trail for disputes

### Why 5-Minute Expiry?

1. **Prevents Ambiguity**: Clear matching window
2. **Reduces Conflicts**: Minimizes chance of wrong matching
3. **User Urgency**: Encourages immediate payment
4. **Reasonable Time**: Enough for QR scan and payment

### Why Cloudflare Workers?

1. **Email Routing**: Built-in email forwarding
2. **Serverless**: Auto-scaling, no server management
3. **Fast**: Edge network processing
4. **Reliable**: 99.9% uptime
5. **Free Tier**: Generous limits

## 📝 API Documentation

### Payment Request
`POST /api/payments/request`

Creates a new payment request with QR code.

### Payment Status
`GET /api/payments/request/:requestId`

Check current status of a payment request.

### Bank Email Webhook
`POST /api/webhook/bank-email`

Receives bank transaction emails from Cloudflare Worker.

### Test Endpoint
`POST /api/webhook/test-bank-email`

Simulate bank email for testing (development only).

## 👥 Demo Data

The system includes seeded data for demonstration:

**Photographer 1:**
- Name: Rajesh Kumar
- Email: rajesh@example.com
- UPI: rajeshkumar@okaxis
- Event: Navratri Festival 2024 (10 photos @ ₹50 each)

**Photographer 2:**
- Name: Priya Singh
- Email: priya@example.com
- UPI: priyasingh@paytm
- Event: Mumbai Marathon 2024 (10 photos @ ₹75 each)

## 🚨 Known Limitations

1. **Email Delay**: Bank emails may take 1-30 seconds to arrive
2. **Email Format Variance**: Each bank has different email formats
3. **UPI Reference**: Not all banks include full transaction notes in emails
4. **Manual Fallback**: Late payments need manual photographer review
5. **Internet Requirement**: Both photographer and backend need connectivity

## 📄 License

This is a probation assignment project for Celebrare.

## 👨‍💻 Author

Built as an engineering assignment demonstrating:
- System design thinking
- Edge case handling
- Security considerations
- Production-ready code structure
- Clear documentation

---

**Note**: This is a demonstration system. For production use, implement additional security measures, proper email parsing libraries, comprehensive error handling, monitoring, and testing.
