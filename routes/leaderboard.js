const express = require('express');
const router = express.Router();
const { User, Leaderboard } = require('../models');

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
// Get top 100 wallets by WTU score
router.get('/', async (req, res) => {
  try {
    const { type = 'alltime', limit = 50 } = req.query;

    let sortField = 'wtuScore';
    if (type === 'weekly') sortField = 'weeklyTx';

    const users = await User.find({ totalTxSent: { $gt: 0 } })
      .sort({ [sortField]: -1 })
      .limit(Math.min(parseInt(limit), 100))
      .select('wallet totalTxSent totalSuccess wtuScore weeklyTx totalSessions lastActive');

    const leaderboard = users.map((u, i) => ({
      rank:          i + 1,
      wallet:        u.wallet,
      shortWallet:   u.wallet.slice(0, 6) + '...' + u.wallet.slice(-4),
      totalTx:       u.totalTxSent,
      successTx:     u.totalSuccess,
      wtuScore:      u.wtuScore,
      weeklyTx:      u.weeklyTx,
      sessions:      u.totalSessions,
      lastActive:    u.lastActive,
    }));

    res.json({
      type,
      updatedAt: new Date(),
      count: leaderboard.length,
      leaderboard,
    });

  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/leaderboard/rank/:wallet ─────────────────────────────────────────
// Get specific wallet rank
router.get('/rank/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const user = await User.findOne({ wallet });

    if (!user) {
      return res.json({ rank: null, message: 'Wallet not on leaderboard yet' });
    }

    // Count how many wallets have higher score
    const rank = await User.countDocuments({ wtuScore: { $gt: user.wtuScore } }) + 1;

    res.json({
      wallet:   user.wallet,
      rank,
      wtuScore: user.wtuScore,
      weeklyTx: user.weeklyTx,
      totalTx:  user.totalTxSent,
    });

  } catch (err) {
    console.error('Rank error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/leaderboard/stats ─────────────────────────────────────────────────
// Global app stats
router.get('/stats/global', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const agg = await User.aggregate([
      {
        $group: {
          _id: null,
          totalTx:      { $sum: '$totalTxSent' },
          totalSuccess: { $sum: '$totalSuccess' },
          totalWTU:     { $sum: '$wtuScore' },
        }
      }
    ]);

    const stats = agg[0] || { totalTx: 0, totalSuccess: 0, totalWTU: 0 };

    res.json({
      totalUsers,
      totalTransactions: stats.totalTx,
      totalSuccess:      stats.totalSuccess,
      totalWTUGenerated: stats.totalWTU,
      appName:           'zeeme_base.app',
      builderCode:       process.env.BUILDER_CODE,
    });

  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
