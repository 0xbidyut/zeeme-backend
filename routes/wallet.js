const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { User, Session } = require('../models');
const { v4: uuidv4 } = require('uuid');

// ── POST /api/wallet/connect ──────────────────────────────────────────────────
// Called when user connects wallet on frontend
router.post('/connect', async (req, res) => {
  try {
    const { wallet, signature, message } = req.body;

    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const normalizedWallet = wallet.toLowerCase();

    // Optional: verify signature to prove wallet ownership
    if (signature && message) {
      try {
        const recovered = ethers.verifyMessage(message, signature);
        if (recovered.toLowerCase() !== normalizedWallet) {
          return res.status(401).json({ error: 'Signature verification failed' });
        }
      } catch {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Upsert user
    let user = await User.findOneAndUpdate(
      { wallet: normalizedWallet },
      {
        $set:  { lastActive: new Date() },
        $setOnInsert: { wallet: normalizedWallet, firstSeen: new Date() },
      },
      { upsert: true, new: true }
    );

    // Create a new session for this run
    const sessionId = uuidv4();
    await Session.create({
      sessionId,
      wallet: normalizedWallet,
    });

    res.json({
      success: true,
      wallet: normalizedWallet,
      sessionId,
      stats: {
        totalSessions: user.totalSessions,
        totalTxSent:   user.totalTxSent,
        totalSuccess:  user.totalSuccess,
        wtuScore:      user.wtuScore,
      },
    });

  } catch (err) {
    console.error('Connect error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/wallet/:address ──────────────────────────────────────────────────
// Get user profile & stats
router.get('/:address', async (req, res) => {
  try {
    const wallet = req.params.address.toLowerCase();

    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const user = await User.findOne({ wallet });
    if (!user) return res.status(404).json({ error: 'Wallet not found' });

    // Get recent sessions
    const sessions = await Session.find({ wallet })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('sessionId status completed success failed startedAt completedAt');

    res.json({
      wallet: user.wallet,
      firstSeen:     user.firstSeen,
      lastActive:    user.lastActive,
      totalSessions: user.totalSessions,
      totalTxSent:   user.totalTxSent,
      totalSuccess:  user.totalSuccess,
      totalFailed:   user.totalFailed,
      wtuScore:      user.wtuScore,
      weeklyTx:      user.weeklyTx,
      sessions,
    });

  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
