// api-gateway/src/routes/transfer.js — uses FallbackProvider for on-chain calls
const express  = require('express');
const { ethers } = require('ethers');
const db       = require('../db');
const { authenticateToken } = require('./auth');
const { scoreTransaction }  = require('../riskEngine');
const { notifyTxUpdate }    = require('../websocket');
const { getOffChainBalance } = require('./wallet');
const { getProvider }        = require('../provider');
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
    if (recipient.startsWith('888') && recipient.length === 11) {
      const dao = db.prepare('SELECT id, phone FROM dao_groups WHERE phone = ?').get(recipient);
      if (!dao) return res.status(404).json({ error: `No community found with number ${recipient}` });
      recipient = `DAO_${dao.id}_${dao.phone}`;
    } else {
      const user = db.prepare('SELECT wallet_address, name FROM users WHERE phone = ?').get(recipient);
      if (!user) return res.status(404).json({ error: `No user found with phone number ${recipient}` });
      recipient = user.wallet_address;
    }
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

    // 1% transaction fee distributed to 3 validator nodes
    const FEE_RATE = 0.01;
    const fee = Math.round(amt * FEE_RATE * 1000) / 1000; // 3 decimal places
    const netAmount = Math.round((amt - fee) * 1000) / 1000;

    // Insert pending tx (recipient gets netAmount, fee goes to nodes)
    const info = db.prepare(`
      INSERT INTO transactions (tx_id, sender, recipient, amount, fee, delay_seconds, risk_score, risk_reasons, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(-1, sender, recipient, netAmount, fee, delay, score, JSON.stringify(reasons), 'pending');

    const localId = info.lastInsertRowid;

    // Distribute fee equally to ACTIVE nodes only
    const { RPC_URLS } = require('../provider');
    const { ethers } = require('ethers');
    const activeNodes = [];
    for (let i = 0; i < RPC_URLS.length; i++) {
      try {
        const p = new ethers.JsonRpcProvider(RPC_URLS[i]);
        await Promise.race([p.getBlockNumber(), new Promise((_, r) => setTimeout(() => r(), 2000))]);
        activeNodes.push(i + 1);
      } catch {}
    }
    const nodeCount = activeNodes.length || 1;
    const perNode = Math.round((fee / nodeCount) * 1000) / 1000;
    for (const nodeId of activeNodes) {
      db.prepare('INSERT INTO node_earnings (node_id, tx_id, amount) VALUES (?, ?, ?)').run(nodeId, localId, perNode);
    }
    if (fee > 0) {
      console.log(`💰 Fee: ${fee} BDT (${perNode} BDT × ${activeNodes.length} active nodes) from tx #${localId}`);
    }

    // Notify UI
    notifyTxUpdate(sender,    { txId: localId, status: 'pending', amount: amt, recipient });
    notifyTxUpdate(recipient, { txId: localId, status: 'pending', amount: amt, sender });

    // Broadcast on-chain to ALL 3 nodes (isolated Hardhat — no P2P sync)
    try {
      if (process.env.TRANSFER_CONTRACT) {
        const { broadcastToAllNodes } = require('../provider');
        broadcastToAllNodes(async (wallet, provider) => {
          const contract = new ethers.Contract(
            process.env.TRANSFER_CONTRACT,
            ['function sendWithDelay(address to, uint256 amount, uint256 riskDelay) returns (uint256)'],
            wallet
          );
          const tx = await contract.sendWithDelay(recipient, amt, delay);
          return await tx.wait();
        }).catch(err => console.warn('Broadcast error (non-fatal):', err.message));
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
