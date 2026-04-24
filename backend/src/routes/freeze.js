// backend/src/routes/freeze.js — SQLite-first, chain optional
const express = require('express');
const db      = require('../db');
const { authenticateToken } = require('./auth');
const router  = express.Router();

// POST /freeze/lock
router.post('/lock', authenticateToken, (req, res) => {
  try {
    db.prepare(
      'INSERT OR REPLACE INTO frozen_wallets (wallet_address, frozen_at, unfrozen_at) VALUES (?, ?, NULL)'
    ).run(req.user.wallet, Date.now());

    // Fire-and-forget on-chain (needs ETH for gas — optional in demo)
    try {
      const { ethers } = require('ethers');
      const provider   = new ethers.JsonRpcProvider(process.env.CHAIN_RPC || 'http://127.0.0.1:8545');
      const user       = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
      if (user?.encrypted_key) {
        const wallet   = new ethers.Wallet(user.encrypted_key, provider);
        const contract = new ethers.Contract(
          process.env.FREEZE_CONTRACT,
          ['function freeze(address wallet)'],
          wallet
        );
        contract.freeze(req.user.wallet).catch(() => {});
      }
    } catch { /* ignore — demo works without gas */ }

    res.json({ message: 'Wallet frozen' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Freeze failed' });
  }
});

// POST /freeze/unlock
router.post('/unlock', authenticateToken, (req, res) => {
  const { pin } = req.body;
  if (pin !== '1234') return res.status(403).json({ error: 'Invalid PIN' });

  try {
    db.prepare(
      'UPDATE frozen_wallets SET unfrozen_at = ? WHERE wallet_address = ?'
    ).run(Date.now(), req.user.wallet);

    // Fire-and-forget on-chain
    try {
      const { ethers } = require('ethers');
      const provider   = new ethers.JsonRpcProvider(process.env.CHAIN_RPC || 'http://127.0.0.1:8545');
      const user       = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
      if (user?.encrypted_key) {
        const wallet   = new ethers.Wallet(user.encrypted_key, provider);
        const contract = new ethers.Contract(
          process.env.FREEZE_CONTRACT,
          ['function unfreeze(address wallet)'],
          wallet
        );
        contract.unfreeze(req.user.wallet).catch(() => {});
      }
    } catch { /* ignore */ }

    res.json({ message: 'Wallet unfrozen' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Unfreeze failed' });
  }
});

module.exports = router;
