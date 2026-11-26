# Quick Start Guide

Get the Celebrare Direct UPI Payment system running in 10 minutes.

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check npm
npm --version

# Check PostgreSQL (need 14+)
psql --version
```

If missing, install:
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Database (1 minute)

Edit `.env` file with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=celebrare_upi
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
```

### 3. Setup Database (1 minute)

```bash
# Create database and tables
npm run setup-db

# Seed with demo data (2 photographers, 2 events, 20 photos)
npm run seed
```

You should see:
```
✓ Database created
✓ Tables created
✓ Demo data seeded
Photographer 1: Rajesh Kumar (rajesh@example.com)
Photographer 2: Priya Singh (priya@example.com)
```

### 4. Start the Application (1 minute)

**Option A: Start both together**
```bash
npm run dev
```

**Option B: Start separately**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 5. Open Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Test the System (5 minutes)

### Test 1: Browse Events

1. Go to http://localhost:5173
2. See two events: "Navratri Festival" and "Mumbai Marathon"
3. Click on "Navratri Festival"

### Test 2: Create Payment Request

1. Select 1-3 photos by clicking them
2. They should highlight with blue border
3. See total amount update at bottom
4. Enter email: `guest@test.com`
5. Click "Proceed to Payment"
6. See payment page with QR code placeholder and 5-minute timer

### Test 3: Simulate Successful Payment

1. Note the payment amount (e.g., ₹150.00)
2. Go to http://localhost:5173/test
3. Verify settings:
   - Photographer Email: `rajesh@example.com`
   - Amount: `150.00` (match your payment)
   - "From Trusted Bank Email" is checked
4. Click "Generate" to create transaction ID
5. Click "✓ Successful Payment"
6. See success response in Result box
7. Go back to payment page (or it updates automatically)
8. Status changes to "CONFIRMED" ✅
9. See download buttons for your photos

### Test 4: Simulate Untrusted Email

1. Create a new payment request (different photos)
2. Go to Test Panel
3. Match the amount
4. **Uncheck** "From Trusted Bank Email"
5. Generate new transaction ID
6. Click "⚠️ Untrusted Email"
7. See rejection: "Email validation failed"
8. Payment page remains "PENDING"

### Test 5: Simulate Duplicate Transaction

1. Keep the same transaction ID from Test 3
2. Update amount to match a new payment request
3. Click "🔁 Duplicate Transaction"
4. See rejection: "Transaction already processed"

### Test 6: Simulate Late Payment

1. Create payment request
2. Copy the request ID from URL: `/payment/[REQUEST_ID]`
3. Expire it manually with curl:
   ```bash
   curl -X POST http://localhost:3000/api/payments/request/[REQUEST_ID]/expire
   ```
4. Go to Test Panel
5. Simulate payment with matching details
6. See: "Payment arrived after 5-minute expiry"
7. Transaction recorded but marked as expired

## Verify All Features

### ✅ Multi-Photographer Support

- Two photographers seeded: Rajesh and Priya
- Each has own UPI ID and events
- Payments route to correct photographer

### ✅ Payment Generation

- UPI string created with photographer UPI ID
- QR code generated (placeholder shown)
- Unique reference ID in transaction note

### ✅ Email Verification

- Checks if from trusted bank domain
- Tests show rejection of untrusted emails
- DKIM/SPF verification implemented

### ✅ 5-Minute Time Limit

- Timer shown on payment page
- Requests expire automatically
- Late payments detected and marked

### ✅ Duplicate Prevention

- Same transaction ID rejected
- Database constraint ensures uniqueness

### ✅ Correct Matching

- Matches by photographer + amount + expiry
- Multiple simultaneous payments handled
- First-come-first-served for same amount

### ✅ Guest Experience

- Clear status: Pending / Confirmed / Expired
- Photos unlock only after confirmation
- Download buttons appear on success

## Common Issues & Solutions

### Issue: Database connection failed

**Solution**: Check PostgreSQL is running
```bash
# Windows
net start postgresql-x64-14

# Mac
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Issue: Port 3000 already in use

**Solution**: Change port in `.env`
```env
PORT=3001
```

### Issue: Port 5173 already in use

**Solution**: Kill the process or change Vite port
```bash
# In frontend/vite.config.js
server: {
  port: 5174
}
```

### Issue: npm install fails

**Solution**: Clear cache and retry
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Seed script fails

**Solution**: Drop and recreate database
```bash
# PostgreSQL command line
dropdb celebrare_upi
npm run setup-db
npm run seed
```

## API Testing with curl

### Create Payment Request
```bash
curl -X POST http://localhost:3000/api/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "guest_email": "guest@test.com",
    "photo_ids": [1, 2, 3]
  }'
```

### Check Payment Status
```bash
curl http://localhost:3000/api/payments/request/[REQUEST_ID]
```

### Simulate Bank Email
```bash
curl -X POST http://localhost:3000/api/webhook/test-bank-email \
  -H "Content-Type: application/json" \
  -d '{
    "photographerEmail": "rajesh@example.com",
    "amount": 150.00,
    "transactionId": "TXN123456789",
    "isTrusted": true
  }'
```

### List All Events
```bash
curl http://localhost:3000/api/events
```

### List All Photographers
```bash
curl http://localhost:3000/api/photographers
```

## Next Steps

### For Demonstration

1. **Show Multiple Photographers**: 
   - Create payment for Priya's event (Mumbai Marathon)
   - Test with `priya@example.com` in test panel

2. **Show All Edge Cases**:
   - Run each test scenario
   - Show results in test panel
   - Explain the security measures

3. **Show Real-Time Updates**:
   - Keep payment page open
   - Trigger payment in test panel
   - Watch status update automatically (3-second polling)

### For Production Deployment

1. **Setup Cloudflare Email Workers**:
   - Follow `cloudflare-worker/` instructions
   - Configure email routing
   - Deploy worker script

2. **Deploy Backend**:
   - Heroku, Railway, or Render
   - Set environment variables
   - Connect to managed PostgreSQL

3. **Deploy Frontend**:
   - Vercel or Netlify
   - Configure API endpoint
   - Enable CDN

4. **Configure DNS**:
   - Add MX records for email routing
   - Add SPF/DKIM records
   - Point to Cloudflare

5. **Testing**:
   - Create test photographer account
   - Forward bank emails to system
   - Test real UPI payments
   - Verify photo unlock works

## Resources

- **Main README**: Complete documentation
- **ARCHITECTURE.md**: Design decisions and system architecture
- **Backend API**: http://localhost:3000/api/
- **Frontend**: http://localhost:5173
- **Test Panel**: http://localhost:5173/test
- **Admin Dashboard**: http://localhost:5173/admin

## Support

For issues or questions:
1. Check this guide first
2. Review README.md for detailed docs
3. Check ARCHITECTURE.md for design decisions
4. Verify all prerequisites are installed
5. Ensure database is running and seeded

---

**You're all set!** 🎉

The system is now running and ready for demonstration. Test all scenarios using the Test Panel to show how the system handles various edge cases.
