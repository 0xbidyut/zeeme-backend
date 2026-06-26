const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for wallet connect
const connectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many connection attempts.' },
});

// Tx recording limiter
const txLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 100 txns + some buffer
  message: { error: 'Too many transaction records.' },
});

module.exports = { apiLimiter, connectLimiter, txLimiter };
