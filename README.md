# zeeme_base.app — Backend

Node.js + Express backend for Base blockchain transaction tracking, leaderboard & analytics.

---

## 🗂️ Project Structure

```
zeeme-backend/
├── server.js              ← Main entry point
├── package.json
├── .env.example           ← Copy to .env and fill in values
├── config/
│   ├── db.js              ← MongoDB connection
│   └── cron.js            ← Weekly reset & hourly stats
├── models/
│   └── index.js           ← User, Transaction, Session, Leaderboard
├── routes/
│   ├── wallet.js          ← Wallet connect & user stats
│   ├── transactions.js    ← Record & confirm transactions
│   └── leaderboard.js     ← Rankings & global stats
└── middleware/
    └── rateLimiter.js     ← API rate limiting
```

---

## ⚙️ Setup (Local)

### 1. Install dependencies
```bash
npm install
```

### 2. Create .env file
```bash
cp .env.example .env
```
Fill in your values in `.env`

### 3. Get free MongoDB
- Go to https://mongodb.com/atlas
- Create free cluster
- Copy connection string to MONGODB_URI in .env

### 4. Get free Basescan API key
- Go to https://basescan.org/apis
- Register & get free API key
- Add to BASESCAN_API_KEY in .env

### 5. Run locally
```bash
npm run dev
```
Server runs at http://localhost:3001

---

## 🚀 Deploy to Railway (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zeeme-backend.git
git push -u origin main
```

### Step 2 — Deploy on Railway
1. Go to https://railway.app → Sign up free with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `zeeme-backend` repo
4. Click **Add Variables** and add all your .env values:
   - MONGODB_URI
   - BASE_RPC_URL = https://mainnet.base.org
   - BASE_CHAIN_ID = 8453
   - BUILDER_CODE = bc_3apktcmn
   - BASESCAN_API_KEY
   - FRONTEND_URL = your netlify URL
   - NODE_ENV = production
5. Railway auto-deploys → you get a live URL like:
   `https://zeeme-backend-production.up.railway.app`

### Step 3 — Update Frontend
In your `zeeme-base-app.html`, set:
```js
const API_URL = 'https://zeeme-backend-production.up.railway.app';
```

---

## 📡 API Endpoints

### Wallet
```
POST /api/wallet/connect          Connect wallet & create session
GET  /api/wallet/:address         Get user stats & session history
```

### Transactions
```
POST /api/transactions/record     Record a transaction from frontend
POST /api/transactions/confirm    Confirm tx hash on Basescan
POST /api/transactions/session-complete  Mark session as done
GET  /api/transactions/:wallet    Get transaction history
```

### Leaderboard
```
GET  /api/leaderboard             Get top 50 wallets
GET  /api/leaderboard?type=weekly Weekly leaderboard
GET  /api/leaderboard/rank/:wallet  Get a wallet's rank
GET  /api/leaderboard/stats/global  Global app stats
```

### Health
```
GET  /                            App info
GET  /health                      Health check
```

---

## 🔗 Connect Frontend to Backend

Add this to your HTML frontend after wallet connects:

```javascript
const API_URL = 'https://YOUR-RAILWAY-URL.up.railway.app';

// After wallet connects:
async function notifyBackend(wallet, sessionId) {
  const res = await fetch(`${API_URL}/api/wallet/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  });
  const data = await res.json();
  return data.sessionId;
}

// After each transaction:
async function recordTx(wallet, txHash, missionNum, sessionId) {
  await fetch(`${API_URL}/api/transactions/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, txHash, missionNum, sessionId }),
  });
}

// After all 100 done:
async function sessionComplete(wallet, sessionId) {
  await fetch(`${API_URL}/api/transactions/session-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, sessionId }),
  });
}
```

---

## 📊 What Gets Tracked

- ✅ Every wallet that connects
- ✅ Every transaction hash
- ✅ Success / failed counts
- ✅ Session groupings (each run of 100)
- ✅ WTU scores for leaderboard
- ✅ Weekly reset every Monday
- ✅ Builder code attribution on all txns
