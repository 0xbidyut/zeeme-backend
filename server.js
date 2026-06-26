require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const connectDB  = require('./config/db');
const { weeklyReset, hourlyStats } = require('./config/cron');
const { apiLimiter, connectLimiter, txLimiter } = require('./middleware/rateLimiter');

// Routes
const walletRoutes      = require('./routes/wallet');
const transactionRoutes = require('./routes/transactions');
const leaderboardRoutes = require('./routes/leaderboard');

// ── App Setup ─────────────────────────────────────────────────────────────────
const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging & parsing
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/wallet',       connectLimiter, walletRoutes);
app.use('/api/transactions', txLimiter,      transactionRoutes);
app.use('/api/leaderboard',                  leaderboardRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    app:     'zeeme_base.app Backend',
    status:  'online ✅',
    version: '1.0.0',
    chain:   'Base Mainnet',
    builder: process.env.BUILDER_CODE,
    endpoints: {
      wallet:       '/api/wallet',
      transactions: '/api/transactions',
      leaderboard:  '/api/leaderboard',
      stats:        '/api/leaderboard/stats/global',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 zeeme_base.app backend running on port ${PORT}`);
    console.log(`🔵 Chain: Base Mainnet (${process.env.BASE_CHAIN_ID})`);
    console.log(`🏗️  Builder Code: ${process.env.BUILDER_CODE}`);
    console.log(`📡 API: http://localhost:${PORT}\n`);

    // Start cron jobs
    weeklyReset.start();
    hourlyStats.start();
    console.log('⏰ Cron jobs started');
  });
});

module.exports = app;
