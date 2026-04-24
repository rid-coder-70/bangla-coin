// backend/src/routes/flag.js
const express = require('express');
const { ethers } = require('ethers');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

const provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC || 'http://127.0.0.1:8545');
const flagAbi  = ['function flagAccount(address account, string reason)'];

// GET /flag/count/:address — public, used by Send page to show warnings
router.get('/count/:address', (req, res) => {
  const { address } = req.params;
  const row = db.prepare('SELECT COUNT(*) as cnt FROM flags WHERE flagged_address = ?').get(address);
  res.json({ count: row?.cnt || 0 });
});

// POST /flag/report — authenticated
router.post('/report', authenticateToken, async (req, res) => {
  const { account, reason } = req.body;
  if (!account || !reason) return res.status(400).json({ error: 'account and reason required' });

  // Prevent self-flagging
  if (account.toLowerCase() === req.user.wallet.toLowerCase())
    return res.status(400).json({ error: 'Cannot flag yourself' });

  // Prevent duplicate
  const existing = db.prepare('SELECT id FROM flags WHERE flagged_address = ? AND reporter = ?').get(account, req.user.wallet);
  if (existing) return res.status(409).json({ error: 'You already flagged this account' });

  try {
    const user    = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
    const wallet  = new ethers.Wallet(user.encrypted_key, provider);
    const contract = new ethers.Contract(process.env.FLAG_CONTRACT, flagAbi, wallet);

    const tx = await contract.flagAccount(account, reason);
    await tx.wait();

    db.prepare('INSERT INTO flags (flagged_address, reporter, reason) VALUES (?, ?, ?)')
      .run(account, req.user.wallet, reason);

    const total = db.prepare('SELECT COUNT(*) as cnt FROM flags WHERE flagged_address = ?').get(account);
    res.json({ message: 'Account flagged', totalFlags: total.cnt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Flagging failed' });
  }
});

module.exports = router;
