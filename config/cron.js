const cron = require('node-cron');
const { User } = require('../models');

// ── Reset weekly TX count every Monday at midnight UTC ───────────────────────
const weeklyReset = cron.schedule('0 0 * * 1', async () => {
  try {
    console.log('⏰ Running weekly WTU reset...');
    await User.updateMany({}, {
      $set: {
        weeklyTx:  0,
        weekStart: new Date(),
      }
    });
    console.log('✅ Weekly reset complete');
  } catch (err) {
    console.error('❌ Weekly reset failed:', err.message);
  }
}, { timezone: 'UTC' });

// ── Log active users every hour ───────────────────────────────────────────────
const hourlyStats = cron.schedule('0 * * * *', async () => {
  try {
    const totalUsers = await User.countDocuments();
    const activeToday = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    console.log(`📊 Stats — Total users: ${totalUsers} | Active 24h: ${activeToday}`);
  } catch (err) {
    console.error('Hourly stats error:', err.message);
  }
});

module.exports = { weeklyReset, hourlyStats };
