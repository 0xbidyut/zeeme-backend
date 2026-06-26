const mongoose = require('mongoose');

// ─── User / Wallet Model ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstSeen:    { type: Date, default: Date.now },
  lastActive:   { type: Date, default: Date.now },
  totalSessions:{ type: Number, default: 0 },
  totalTxSent:  { type: Number, default: 0 },
  totalSuccess: { type: Number, default: 0 },
  totalFailed:  { type: Number, default: 0 },
  // WTU score for leaderboard
  wtuScore:     { type: Number, default: 0 },
  // Weekly tracking
  weeklyTx:     { type: Number, default: 0 },
  weekStart:    { type: Date, default: null },
}, { timestamps: true });

// ─── Transaction Model ────────────────────────────────────────────────────────
const transactionSchema = new mongoose.Schema({
  wallet:      { type: String, required: true, lowercase: true, index: true },
  txHash:      { type: String, unique: true, sparse: true },
  status:      { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  blockNumber: { type: Number, default: null },
  gasUsed:     { type: String, default: null },
  missionNum:  { type: Number, required: true },   // 1–100
  sessionId:   { type: String, required: true },   // groups 100 txns together
  builderCode: { type: String, default: 'bc_3apktcmn' },
  confirmedAt: { type: Date, default: null },
}, { timestamps: true });

// ─── Session Model ────────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema({
  sessionId:    { type: String, required: true, unique: true },
  wallet:       { type: String, required: true, lowercase: true },
  totalMissions:{ type: Number, default: 100 },
  completed:    { type: Number, default: 0 },
  success:      { type: Number, default: 0 },
  failed:       { type: Number, default: 0 },
  status:       { type: String, enum: ['running', 'completed', 'stopped'], default: 'running' },
  startedAt:    { type: Date, default: Date.now },
  completedAt:  { type: Date, default: null },
}, { timestamps: true });

// ─── Leaderboard cache (refreshed by cron) ────────────────────────────────────
const leaderboardSchema = new mongoose.Schema({
  rank:        { type: Number, required: true },
  wallet:      { type: String, required: true },
  totalTx:     { type: Number, default: 0 },
  weeklyTx:    { type: Number, default: 0 },
  wtuScore:    { type: Number, default: 0 },
  sessions:    { type: Number, default: 0 },
  updatedAt:   { type: Date, default: Date.now },
});

module.exports = {
  User:        mongoose.model('User', userSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
  Session:     mongoose.model('Session', sessionSchema),
  Leaderboard: mongoose.model('Leaderboard', leaderboardSchema),
};
