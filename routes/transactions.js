const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ethers } = require('ethers');
const { User, Transaction, Session } = require('../models');

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);

// ── POST /api/transactions/record ─────────────────────────────────────────────
// Frontend calls this immediately after sending each tx
router.post('/record', async (req, res) => {
  try {
    const { wallet, txHash, missionNum, sessionId, status } = req.body;

    if (!wallet || !sessionId || !missionNum) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedWallet = wallet.toLowerCase();

    // Save transaction record
    const tx = await Transaction.findOneAndUpdate(
      { txHash: txHash || `failed_${sessionId}_${missionNum}` },
      {
        wallet:      normalizedWallet,
        txHash:      txHash || null,
        missionNum:  parseInt(missionNum),
        sessionId,
        status:      txHash ? 'pending' : 'failed',
        builderCode: process.env.BUILDER_CODE,
      },
      { upsert: true, new: true }
    );

    // Update session progress
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $inc: {
          completed: 1,
          success:   txHash ? 1 : 0,
          failed:    txHash ? 0 : 1,
        },
      }
    );

    // Update user totals
    await User.findOneAndUpdate(
      { wallet: normalizedWallet },
      {
        $inc: {
          totalTxSent:   1,
          totalSuccess:  txHash ? 1 : 0,
          totalFailed:   txHash ? 0 : 1,
          wtuScore:      txHash ? 1 : 0,
          weeklyTx:      txHash ? 1 : 0,
        },
        $set: { lastActive: new Date() },
      }
    );

    res.json({ success: true, txId: tx._id });

  } catch (err) {
    console.error('Record tx error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/transactions/session-complete ───────────────────────────────────
// Called when all 100 missions are done
router.post('/session-complete', async (req, res) => {
  try {
    const { sessionId, wallet } = req.body;

    const session = await Session.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          status:      'completed',
          completedAt: new Date(),
        }
      },
      { new: true }
    );

    // Increment session count on user
    await User.findOneAndUpdate(
      { wallet: wallet.toLowerCase() },
      { $inc: { totalSessions: 1 } }
    );

    res.json({ success: true, session });

  } catch (err) {
    console.error('Session complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/transactions/:wallet ─────────────────────────────────────────────
// Get transaction history for a wallet
router.get('/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const { page = 1, limit = 20, sessionId } = req.query;

    const query = { wallet };
    if (sessionId) query.sessionId = sessionId;

    const txs = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('txHash status missionNum sessionId builderCode createdAt confirmedAt');

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions: txs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error('Get txs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/transactions/confirm ───────────────────────────────────────────
// Confirm a tx hash on-chain via Basescan
router.post('/confirm', async (req, res) => {
  try {
    const { txHash } = req.body;
    if (!txHash) return res.status(400).json({ error: 'txHash required' });

    // Fetch from Basescan API
    const url = `https://api.basescan.org/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${process.env.BASESCAN_API_KEY}`;
    const { data } = await axios.get(url, { timeout: 8000 });

    let status = 'pending';
    let blockNumber = null;

    if (data?.result?.status === '1') {
      status = 'confirmed';
      // Also get block info
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) blockNumber = receipt.blockNumber;
      } catch {}
    } else if (data?.result?.status === '0') {
      status = 'failed';
    }

    // Update in DB
    await Transaction.findOneAndUpdate(
      { txHash },
      {
        $set: {
          status,
          blockNumber,
          confirmedAt: status === 'confirmed' ? new Date() : null,
        }
      }
    );

    res.json({ txHash, status, blockNumber });

  } catch (err) {
    console.error('Confirm tx error:', err);
    res.status(500).json({ error: 'Could not confirm transaction' });
  }
});

module.exports = router;
