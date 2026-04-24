// backend/src/routes/ledger.js
const express = require('express');
const crypto  = require('crypto');
const db      = require('../db');
const router  = express.Router();

// GET /ledger/txs — public hash-linked ledger of all executed transactions
router.get('/txs', (req, res) => {
  try {
    // Single quotes for SQLite string literals
    const txs = db.prepare(
      "SELECT * FROM transactions WHERE status = 'executed' ORDER BY created_at ASC"
    ).all();

    let prevHash = '0'.repeat(64);

    const linked = txs.map(tx => {
      const data   = `${tx.tx_id}${tx.sender}${tx.recipient}${tx.amount}${tx.status}${tx.created_at}`;
      const hash   = crypto.createHash('sha256').update(data + prevHash).digest('hex');
      const result = { ...tx, hash, prevHash };
      prevHash = hash;
      return result;
    });

    res.json(linked.reverse()); // newest first
  } catch (err) {
    console.error('Ledger error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
