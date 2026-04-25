// api-gateway/src/routes/wallet.js — real balance from initial_credit + transactions
const express = require('express');
const db      = require('../db');
const { authenticateToken } = require('./auth');
const router  = express.Router();

// Real off-chain balance: initial_credit + received_executed - sent_executed - sent_pending (in escrow)
function getOffChainBalance(walletAddr) {
  const user = db.prepare('SELECT initial_credit FROM users WHERE wallet_address = ?').get(walletAddr);
  const credit   = user ? (user.initial_credit || 0) : 0;
  const sent     = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE sender = ? AND status = 'executed'"
  ).get(walletAddr).total;
  const pending  = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE sender = ? AND status = 'pending'"
  ).get(walletAddr).total;
  const received = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE recipient = ? AND status = 'executed'"
  ).get(walletAddr).total;
  return Math.max(0, credit + received - sent - pending);
}

// GET /wallet/balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const balance = getOffChainBalance(req.user.wallet);
    res.json({ balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to fetch balance' });
  }
});

// GET /wallet/txs
router.get('/txs', authenticateToken, (req, res) => {
  const txs = db.prepare(
    'SELECT * FROM transactions WHERE sender = ? OR recipient = ? ORDER BY created_at DESC'
  ).all(req.user.wallet, req.user.wallet);
  res.json(txs);
});

module.exports = router;
module.exports.getOffChainBalance = getOffChainBalance;
