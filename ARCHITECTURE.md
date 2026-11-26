# Architecture & Design Documentation

## System Overview

The Celebrare Direct UPI Payment system is designed to solve the problem of expensive payment gateway fees for small photographers by enabling direct UPI payments with automatic verification through bank transaction emails.

## Core Design Principles

1. **No Payment Gateway**: Money flows directly from guest to photographer
2. **Automated Verification**: Bank emails serve as payment proof
3. **Security First**: Multiple layers of verification prevent fraud
4. **Time-Bounded**: 5-minute window prevents ambiguous matching
5. **Scalable**: Handles multiple photographers and concurrent payments

## System Components

### 1. Frontend (React SPA)

**Purpose**: Guest and photographer interface

**Key Features**:
- Event browsing and photo selection
- Payment request creation
- Real-time payment status monitoring
- Photo download after confirmation
- Admin dashboard for photographers
- Test panel for demonstration

**Technology Stack**:
- React 18 with Hooks
- React Router for navigation
- Axios for API calls
- CSS3 with custom styling
- Vite for fast development

### 2. Backend API (Node.js/Express)

**Purpose**: Business logic and payment processing

**Key Responsibilities**:
- Manage photographers, events, and photos
- Generate UPI payment strings and QR codes
- Create and track payment requests
- Verify bank emails (DKIM/SPF)
- Match payments to requests
- Prevent duplicate transactions
- Enforce 5-minute expiry

**Technology Stack**:
- Node.js with Express
- PostgreSQL with pg driver
- UUID for unique identifiers
- QRCode library for QR generation
- Email verification utilities

**API Endpoints**:

```
GET  /api/photographers           - List all photographers
GET  /api/photographers/:id       - Get photographer details
POST /api/photographers           - Create photographer

GET  /api/events                  - List all events
GET  /api/events/:id              - Get event details
GET  /api/events/:id/photos       - Get event photos

GET  /api/photos/:id              - Get photo by ID
POST /api/photos/batch            - Get multiple photos

POST /api/payments/request        - Create payment request
GET  /api/payments/request/:id    - Get payment status
GET  /api/payments/request/:id/photos - Get unlocked photos

POST /api/webhook/bank-email      - Receive bank email (from Cloudflare)
POST /api/webhook/test-bank-email - Test endpoint (development)
```

### 3. Database (PostgreSQL)

**Purpose**: Persistent storage with ACID guarantees

**Schema Design**:

```sql
photographers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  upi_id VARCHAR(255),
  bank_email VARCHAR(255),
  created_at TIMESTAMP
)

events (
  id SERIAL PRIMARY KEY,
  photographer_id INTEGER REFERENCES photographers,
  name VARCHAR(255),
  date DATE,
  created_at TIMESTAMP
)

photos (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events,
  filename VARCHAR(255),
  price DECIMAL(10,2),
  thumbnail_url TEXT,
  full_url TEXT,
  created_at TIMESTAMP
)

payment_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(100) UNIQUE,  -- UUID
  photographer_id INTEGER REFERENCES photographers,
  event_id INTEGER REFERENCES events,
  guest_email VARCHAR(255),
  photo_ids INTEGER[],              -- Array of photo IDs
  amount DECIMAL(10,2),
  upi_string TEXT,
  status VARCHAR(50),               -- pending/confirmed/expired
  expires_at TIMESTAMP,
  created_at TIMESTAMP
)

transactions (
  id SERIAL PRIMARY KEY,
  payment_request_id INTEGER REFERENCES payment_requests,
  bank_transaction_id VARCHAR(255) UNIQUE,  -- Prevents duplicates
  amount DECIMAL(10,2),
  from_account VARCHAR(255),
  to_account VARCHAR(255),
  email_received_at TIMESTAMP,
  email_from VARCHAR(255),
  email_verified BOOLEAN,
  status VARCHAR(50),               -- pending/confirmed/expired
  created_at TIMESTAMP
)
```

**Indexes for Performance**:
- `payment_requests.request_id` (lookup by UUID)
- `payment_requests.status` (find pending requests)
- `payment_requests.expires_at` (expiry checks)
- `transactions.bank_transaction_id` (duplicate prevention)

### 4. Cloudflare Email Worker

**Purpose**: Secure email routing and webhook forwarding

**Flow**:
1. Photographer's bank sends transaction email
2. Email arrives at photographer@yourdomain.com
3. Cloudflare Email Routing triggers Worker
4. Worker extracts email data
5. Worker forwards to backend webhook with secret
6. Worker optionally forwards original email to photographer

**Configuration**:
```javascript
{
  WEBHOOK_URL: "https://backend.com/api/webhook/bank-email",
  WEBHOOK_SECRET: "secret_key",
  FORWARD_TO_PHOTOGRAPHER: true
}
```

## Payment Flow (Detailed)

### Step 1: Payment Request Creation

```
Guest → Frontend: Select photos
Frontend → Backend: POST /api/payments/request
Backend:
  1. Validate event and photos
  2. Calculate total amount
  3. Generate UUID request_id
  4. Create UPI string: upi://pay?pa=...&tn=CEL<hash>
  5. Generate QR code from UPI string
  6. Set expires_at = now + 5 minutes
  7. Insert payment_request (status: pending)
  8. Return QR code + request details
Frontend: Show QR code + timer
```

### Step 2: Guest Payment

```
Guest: Scan QR with UPI app (GPay, PhonePe, Paytm, etc.)
UPI App: Show payment confirmation screen
Guest: Confirm payment
UPI System: Process payment
Money: Transferred directly to photographer's account
```

### Step 3: Bank Email

```
Photographer's Bank:
  - Generate transaction alert email
  - Include: amount, transaction ID, timestamp
  - Send to photographer's registered email

Email Routing:
  - Email arrives at photographer@yourdomain.com
  - Cloudflare intercepts and triggers Worker
  - Worker extracts: from, to, subject, body, headers
  - Worker forwards to backend webhook
```

### Step 4: Email Verification

```
Backend Webhook:
  1. Verify webhook secret
  2. Check email from trusted bank domain
  3. Validate DKIM signature
  4. Check SPF record
  5. Extract transaction details:
     - Transaction ID
     - Amount
     - Timestamp
  6. If verification fails → reject
  7. If passes → continue to matching
```

### Step 5: Payment Matching

```
Backend Matching Logic:
  1. Check if transaction ID already exists
     - If yes → reject as duplicate
  2. Find photographer by bank email (to field)
  3. Query payment_requests WHERE:
     - photographer_id = photographer.id
     - amount = extracted_amount
     - status = 'pending'
     - expires_at > now
     - ORDER BY created_at ASC
     - LIMIT 1
  4. If no match found:
     - Check if expired request exists
     - If yes → record transaction but mark expired
     - If no → no matching request found
  5. If match found:
     - Insert transaction record
     - Update payment_request.status = 'confirmed'
     - Return success
```

### Step 6: Photo Unlock

```
Frontend (polling every 3 seconds):
  GET /api/payments/request/:requestId
  
If status = 'confirmed':
  1. Show success message
  2. Display "Download Photos" buttons
  3. GET /api/payments/request/:requestId/photos
  4. Backend verifies status = 'confirmed'
  5. Return full resolution photo URLs
  6. Guest downloads photos
```

## Security Architecture

### Email Authentication

**DKIM (DomainKeys Identified Mail)**:
- Cryptographic signature by sending domain
- Public key in DNS records
- Verifies email not tampered
- Proves email from claimed sender

**SPF (Sender Policy Framework)**:
- DNS record lists authorized sending IPs
- Receiving server checks IP against SPF
- Prevents email spoofing

**Bank Domain Whitelist**:
```javascript
BANK_EMAIL_PATTERNS = {
  SBI: [/no-reply@sbi\.co\.in$/i],
  HDFC: [/alerts@hdfcbank\.net$/i],
  ICICI: [/no-reply@icicibank\.com$/i],
  // ... more banks
}
```

### Transaction Security

**Unique Transaction IDs**:
- Database constraint: `UNIQUE(bank_transaction_id)`
- Prevents same payment used twice
- Each bank transaction has unique ID

**Time-Based Expiry**:
- Payment requests valid only 5 minutes
- After expiry, payments recorded but not matched
- Prevents ambiguous late matching

**Amount Verification**:
- Exact amount match required
- ₹50.00 ≠ ₹50.01
- Prevents wrong payment matching

**Photographer Verification**:
- Payment must arrive at photographer's registered email
- Cannot match payment to wrong photographer
- Each photographer has unique email

### Reference ID System

**UPI Transaction Note**:
```
"Photo Payment CEL<hash>"
```

Where `<hash>` is:
- First 12 chars of SHA-256(request_id)
- Unique per payment request
- Could be used for additional matching (future)
- Some banks include in email, some don't

## Edge Cases & Solutions

### 1. Same Amount, Same Time

**Scenario**: Two guests pay same photographer ₹100 at same time

**Solution**:
- First-come-first-served based on email arrival
- Both payment requests logged
- First email matches first request (created_at ASC)
- Second email matches second request
- If only one request exists → second payment unmatched

### 2. Late Payment (After 5 Minutes)

**Scenario**: Guest pays but bank email arrives after expiry

**Solution**:
- System finds expired request with matching amount
- Records transaction with status = 'expired'
- Photographer can manually verify and issue refund or new request
- Guest notified payment was late

### 3. Duplicate Email

**Scenario**: Bank sends same email twice, or attacker replays email

**Solution**:
- Transaction ID uniqueness constraint
- Database rejects duplicate inserts
- System returns "already processed" error
- No double credit

### 4. Fake Email

**Scenario**: Attacker sends fake bank email

**Solution**:
- DKIM verification fails → reject
- SPF verification fails → reject
- Domain not in whitelist → reject
- Multi-layer security prevents acceptance

### 5. Wrong Amount

**Scenario**: Guest pays ₹49 instead of ₹50

**Solution**:
- No matching request found (amount mismatch)
- Payment not confirmed
- Guest remains at "pending" state
- Manual intervention needed

### 6. Partial Payment

**Scenario**: Guest creates request for ₹150, pays ₹100 and ₹50 separately

**Solution**:
- System only accepts exact amount match
- First ₹100 payment → no match
- Second ₹50 payment → no match
- Both remain unmatched
- Design choice: Keep it simple, avoid complexity

### 7. Network Delays

**Scenario**: Frontend polling doesn't see update immediately

**Solution**:
- Frontend polls every 3 seconds
- Maximum delay: 3 seconds
- Acceptable for user experience
- Could upgrade to WebSockets for instant updates

## Scaling Considerations

### Database Optimization

**Indexing**:
```sql
CREATE INDEX idx_payment_requests_matching 
ON payment_requests(photographer_id, amount, status, expires_at);

CREATE INDEX idx_transactions_txn_id 
ON transactions(bank_transaction_id);
```

**Query Optimization**:
- Use LIMIT 1 for single match
- Order by created_at ASC for FIFO
- Filter expired requests in query

**Connection Pooling**:
```javascript
const pool = new Pool({
  max: 20,              // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Horizontal Scaling

**Stateless Backend**:
- No session storage in memory
- All state in database
- Can run multiple instances behind load balancer

**Database Read Replicas**:
- Read queries → replicas
- Write queries → primary
- Reduces primary load

**Caching Layer (Redis)**:
```javascript
// Cache payment request status
Redis.setex(`payment:${requestId}`, 300, status);

// Check cache before database
const cached = await Redis.get(`payment:${requestId}`);
if (cached) return cached;
```

### Cloudflare Auto-Scaling

- Workers scale automatically
- Edge network distribution
- DDoS protection included
- No capacity planning needed

## Monitoring & Observability

### Metrics to Track

1. **Payment Success Rate**:
   - Total requests created
   - Total confirmed
   - Percentage = (confirmed / total) * 100

2. **Email Verification Failure Rate**:
   - Total emails received
   - Total rejected (DKIM/SPF fail)
   - Investigate if rate increases

3. **Duplicate Transaction Rate**:
   - Should be near zero
   - Spike indicates issue

4. **Late Payment Rate**:
   - Requests that expire with no payment
   - Requests with late payment
   - Optimize expiry time if high

5. **Average Matching Time**:
   - Time from payment to confirmation
   - Should be < 30 seconds
   - Longer time indicates email delay

### Logging Strategy

```javascript
// Log all payment state changes
logger.info('payment_request_created', {
  requestId,
  photographerId,
  amount,
  expiresAt
});

logger.info('email_received', {
  from,
  to,
  transactionId,
  verified: true/false
});

logger.info('payment_matched', {
  requestId,
  transactionId,
  matchTime: receivedAt - createdAt
});

logger.warn('payment_expired', {
  requestId,
  createdAt,
  expiresAt
});
```

### Alerting

- Alert if email verification failure rate > 5%
- Alert if duplicate transaction attempts spike
- Alert if database connection pool exhausted
- Alert if Cloudflare Worker error rate > 1%

## Future Enhancements

### 1. WebSocket Real-Time Updates

Replace polling with WebSocket:
```javascript
const ws = new WebSocket('wss://backend.com');
ws.on('message', (data) => {
  if (data.requestId === currentRequest) {
    updatePaymentStatus(data.status);
  }
});
```

### 2. Machine Learning for Email Parsing

- Train model on bank email formats
- Automatically adapt to format changes
- Improve extraction accuracy

### 3. Multi-Currency Support

- Support USD, EUR, GBP
- Currency conversion for international events
- Different UPI standards (global payments)

### 4. Partial Payment Support

- Split payments across multiple transactions
- Track cumulative amount
- Confirm when total reached

### 5. Automatic Refunds

- Integration with UPI refund APIs
- Automatic refund for late payments
- Scheduled batch processing

### 6. Mobile Apps

- Native iOS/Android apps
- Push notifications for payment status
- Offline photo preview caching

### 7. Photographer Dashboard Analytics

- Revenue tracking
- Popular photos
- Payment success rates
- Guest demographics

## Testing Strategy

### Unit Tests

```javascript
describe('Email Verifier', () => {
  it('should accept trusted bank email', () => {
    const result = isTrustedBankEmail('no-reply@sbi.co.in');
    expect(result.trusted).toBe(true);
  });

  it('should reject untrusted email', () => {
    const result = isTrustedBankEmail('fake@scammer.com');
    expect(result.trusted).toBe(false);
  });
});
```

### Integration Tests

```javascript
describe('Payment Flow', () => {
  it('should create and confirm payment', async () => {
    // Create payment request
    const request = await createPaymentRequest({
      eventId: 1,
      photoIds: [1, 2],
      guestEmail: 'guest@test.com'
    });

    // Simulate bank email
    const result = await simulateBankEmail({
      photographerEmail: 'photographer@test.com',
      amount: request.amount,
      transactionId: 'TEST123'
    });

    // Verify confirmation
    const status = await getPaymentStatus(request.requestId);
    expect(status).toBe('confirmed');
  });
});
```

### End-to-End Tests

```javascript
describe('Complete User Journey', () => {
  it('guest can purchase and download photos', async () => {
    // 1. Browse event
    await page.goto('/event/1');
    
    // 2. Select photos
    await page.click('.photo[data-id="1"]');
    await page.click('.photo[data-id="2"]');
    
    // 3. Enter email and checkout
    await page.fill('input[type="email"]', 'guest@test.com');
    await page.click('button:text("Proceed to Payment")');
    
    // 4. Verify QR code displayed
    await page.waitForSelector('.qr-code');
    
    // 5. Simulate payment (backend)
    const requestId = page.url().split('/').pop();
    await simulatePayment(requestId);
    
    // 6. Wait for confirmation
    await page.waitForSelector('.status-confirmed');
    
    // 7. Download photos
    const downloads = await Promise.all([
      page.waitForEvent('download'),
      page.click('a:text("Download")')
    ]);
    
    expect(downloads).toHaveLength(1);
  });
});
```

## Deployment Architecture

### Development
```
Localhost:
  - Frontend: Vite dev server (port 5173)
  - Backend: Node.js (port 3000)
  - Database: PostgreSQL (port 5432)
  - Cloudflare: Local testing with curl
```

### Staging
```
Cloud Infrastructure:
  - Frontend: Vercel/Netlify
  - Backend: Heroku/Railway/Render
  - Database: Managed PostgreSQL (AWS RDS/DigitalOcean)
  - Cloudflare: Staging domain email workers
```

### Production
```
High Availability:
  - Frontend: CDN (Cloudflare Pages)
  - Backend: Container orchestration (Kubernetes/ECS)
    - Multiple replicas
    - Health checks
    - Auto-scaling
  - Database: 
    - Primary + Read replicas
    - Automated backups
    - Point-in-time recovery
  - Cloudflare: Production domain email workers
  - Monitoring: Datadog/New Relic/Prometheus
```

## Cost Analysis

### Traditional Gateway (Razorpay)
- Gateway Fee: 2% + GST (18%) = 2.36%
- For ₹10,000 revenue: ₹236 fee
- For 100 photographers, ₹10,000 each: ₹23,600 fees
- Plus onboarding complexity and GST compliance

### Celebrare Direct UPI
- Infrastructure:
  - PostgreSQL: ₹1,000/month (managed)
  - Backend Server: ₹2,000/month (2 instances)
  - Cloudflare: Free (up to 100k emails/month)
  - Domain: ₹1,000/year
- **Total: ~₹3,000/month for unlimited photographers**
- **No per-transaction fees**
- **Saves ₹20,600/month for 100 photographers**

## Conclusion

The Celebrare Direct UPI Payment system successfully demonstrates:

1. **Technical Innovation**: Using bank emails for payment verification
2. **Cost Efficiency**: Eliminating gateway fees
3. **Security**: Multi-layer email and transaction verification
4. **Scalability**: Designed to handle growth
5. **User Experience**: Simple QR code payment flow
6. **Edge Case Handling**: Comprehensive solutions for real-world scenarios

The architecture is production-ready with clear paths for enhancement and scaling.
