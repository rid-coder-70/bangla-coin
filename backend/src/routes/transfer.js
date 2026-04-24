// backend/src/routes/transfer.js — real balance check using initial_credit
const express  = require('express');
const db       = require('../db');
const { authenticateToken } = require('./auth');
const { scoreTransaction }  = require('../riskEngine');
const { notifyTxUpdate }    = require('../websocket');
const { getOffChainBalance } = require('./wallet');
const router   = express.Router();

// POST /transfer/send
router.post('/send', authenticateToken, async (req, res) => {
  let { recipient, amount } = req.body;
  const sender = req.user.wallet;
  const amt    = Number(amount);

  if (!recipient || isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Invalid recipient or amount' });
  }

  // Resolve phone number → wallet address
  if (!recipient.startsWith('0x')) {
    const user = db.prepare('SELECT wallet_address, name FROM users WHERE phone = ?').get(recipient);
    if (!user) return res.status(404).json({ error: `No user found with phone number ${recipient}` });
    recipient = user.wallet_address;
  }


  try {
    // Check frozen
    const isFrozen = db.prepare(
      'SELECT 1 FROM frozen_wallets WHERE wallet_address = ? AND unfrozen_at IS NULL'
    ).get(sender);
    if (isFrozen) return res.status(403).json({ error: 'Wallet is frozen' });

    // Real balance check
    const balance = getOffChainBalance(sender);
    if (amt > balance) {
      return res.status(400).json({
        error: `Insufficient balance — you have ${balance.toLocaleString()} BDT, tried to send ${amt.toLocaleString()} BDT`
      });
    }

    const { score, delay, reasons } = scoreTransaction({ sender, recipient, amount: amt, db });

    // Insert pending tx
    const info = db.prepare(`
      INSERT INTO transactions (tx_id, sender, recipient, amount, delay_seconds, risk_score, risk_reasons, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(-1, sender, recipient, amt, delay, score, JSON.stringify(reasons), 'pending');

    const localId = info.lastInsertRowid;

    // Notify UI
    notifyTxUpdate(sender,    { txId: localId, status: 'pending', amount: amt, recipient });
    notifyTxUpdate(recipient, { txId: localId, status: 'pending', amount: amt, sender });

    // Fire-and-forget on-chain (optional)
    try {
      const { ethers } = require('ethers');
      const provider   = new ethers.JsonRpcProvider(process.env.CHAIN_RPC || 'http://127.0.0.1:8545');
      const user       = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
      if (user?.encrypted_key) {
        const wallet   = new ethers.Wallet(user.encrypted_key, provider);
        const contract = new ethers.Contract(
          process.env.TRANSFER_CONTRACT,
          ['function sendWithDelay(address to, uint256 amount, uint256 riskDelay) returns (uint256)'],
          wallet
        );
        contract.sendWithDelay(recipient, amt, delay).catch(() => {});
      }
    } catch { /* ignore */ }

    res.json({ message: 'Transfer queued', txId: localId, delay, score, reasons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Transfer failed' });
  }
});

// POST /transfer/cancel
router.post('/cancel', authenticateToken, async (req, res) => {
  const { txId } = req.body;
  try {
    const result = db.prepare(
      'UPDATE transactions SET status = ?, cancelled_at = ? WHERE id = ? AND sender = ? AND status = ?'
    ).run('cancelled', Date.now(), txId, req.user.wallet, 'pending');

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Transaction not found or already settled' });
    }
    notifyTxUpdate(req.user.wallet, { txId, status: 'cancelled' });
    res.json({ message: 'Transfer cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancel failed' });
  }
});

module.exports = router;
