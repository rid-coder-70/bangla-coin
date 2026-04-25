// api-gateway/src/routes/ledger.js
const express = require('express');
const crypto  = require('crypto');
const db      = require('../db');
const router  = express.Router();

// GET /ledger/txs — public hash-linked ledger (executed only)
router.get('/txs', (req, res) => {
  try {
    const txs = db.prepare(
      "SELECT * FROM transactions WHERE status = 'executed' ORDER BY created_at ASC"
    ).all();

    let prevHash = '0'.repeat(64);
    const linked = txs.map(tx => {
      const data   = `${tx.tx_id}${tx.sender}${tx.recipient}${tx.amount}${tx.status}${tx.created_at}`;
      const hash   = crypto.createHash('sha256').update(data + prevHash).digest('hex');
      const result = { ...tx, hash, prev_hash: prevHash };
      prevHash = hash;
      return result;
    });

    res.json(linked.reverse());
  } catch (err) {
    console.error('Ledger error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /ledger — all transactions with hashes (for Explorer page)
const { authenticateToken } = require('./auth');
router.get('/', authenticateToken, (req, res) => {
  try {
    const txs = db.prepare(
      'SELECT * FROM transactions ORDER BY created_at ASC'
    ).all();

    let prevHash = '0'.repeat(64);
    const linked = txs.map(tx => {
      const data   = `${tx.tx_id}${tx.sender}${tx.recipient}${tx.amount}${tx.status}${tx.created_at}`;
      const hash   = crypto.createHash('sha256').update(data + prevHash).digest('hex');
      const result = { ...tx, hash, prev_hash: prevHash };
      prevHash = hash;
      return result;
    });

    res.json(linked.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

