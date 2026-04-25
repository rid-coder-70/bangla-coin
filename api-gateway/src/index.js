// api-gateway/src/index.js — Central API Gateway (port 5000)
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const http    = require('http');

const { initWebSocket }     = require('./websocket');
const { startAutoConfirmer } = require('./autoConfirmer');
const { seedDatabase }      = require('./seed');
const { RPC_URLS, QUORUM }  = require('./provider');

const authRoutes     = require('./routes/auth');
const walletRoutes   = require('./routes/wallet');
const transferRoutes = require('./routes/transfer');
const daoRoutes      = require('./routes/dao');
const flagRoutes     = require('./routes/flag');
const freezeRoutes   = require('./routes/freeze');
const ledgerRoutes   = require('./routes/ledger');
const agentRoutes    = require('./routes/agent');

const db = require('./db');

const app    = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// GET /gateway/status — node health for admin UI
app.get('/gateway/status', async (req, res) => {
  const { ethers } = require('ethers');
  const nodes = [];
  for (let i = 0; i < RPC_URLS.length; i++) {
    try {
      const p = new ethers.JsonRpcProvider(RPC_URLS[i]);
      const start = Date.now();
      const block = await Promise.race([
        p.getBlockNumber(),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000))
      ]);
      nodes.push({ id: i + 1, url: RPC_URLS[i], status: 'online', blockHeight: block, latencyMs: Date.now() - start });
    } catch {
      nodes.push({ id: i + 1, url: RPC_URLS[i], status: 'offline', blockHeight: null, latencyMs: null });
    }
  }

  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalTxs   = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
  const pendingTxs = db.prepare("SELECT COUNT(*) as c FROM transactions WHERE status = 'pending'").get().c;
  const flaggedAccounts = db.prepare('SELECT flagged_address, COUNT(*) as cnt FROM flags GROUP BY flagged_address').all();

  res.json({ quorum: QUORUM, nodes, stats: { totalUsers, totalTxs, pendingTxs }, flaggedAccounts });
});

// GET /gateway/transactions — all transactions for admin view
app.get('/gateway/transactions', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const txs = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(txs);
});

// POST /gateway/validator-vote — validators forward their votes here
app.post('/gateway/validator-vote', async (req, res) => {
  const { txId, validatorId, action, reason } = req.body;
  if (!txId || !validatorId || !['ban', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'txId, validatorId, and action (ban/reject) required' });
  }

  try {
    // Record vote (UNIQUE constraint prevents double-voting)
    db.prepare(
      'INSERT OR IGNORE INTO validator_votes (tx_id, validator_id, action, reason) VALUES (?, ?, ?, ?)'
    ).run(txId, validatorId, action, reason || '');

    // Count ban votes for this tx
    const banCount = db.prepare(
      "SELECT COUNT(*) as c FROM validator_votes WHERE tx_id = ? AND action = 'ban'"
    ).get(txId).c;

    const quorumReached = banCount >= 2; // 2 of 3 validators

    if (quorumReached) {
      // Auto-cancel the pending transaction
      const result = db.prepare(
        "UPDATE transactions SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status = 'pending'"
      ).run(Date.now(), txId);

      if (result.changes > 0) {
        console.log(`🛡️ QUORUM REACHED: TX #${txId} Rejected by ${banCount}/3 validators`);

        // Get sender for WebSocket notification
        const tx = db.prepare('SELECT sender, recipient FROM transactions WHERE id = ?').get(txId);
        if (tx) {
          const { notifyTxUpdate } = require('./websocket');
          notifyTxUpdate(tx.sender, { txId, status: 'cancelled', reason: 'Rejected by validator quorum (2/3 ban votes)' });
          notifyTxUpdate(tx.recipient, { txId, status: 'cancelled', reason: 'Rejected by validator quorum' });
        }

        // Broadcast cancelPending on-chain to all nodes
        try {
          if (process.env.TRANSFER_CONTRACT) {
            const { broadcastToAllNodes } = require('./provider');
            const { ethers } = require('ethers');
            const onChainTxId = db.prepare('SELECT tx_id FROM transactions WHERE id = ?').get(txId)?.tx_id;
            if (onChainTxId >= 0) {
              broadcastToAllNodes(async (wallet) => {
                const contract = new ethers.Contract(
                  process.env.TRANSFER_CONTRACT,
                  ['function cancelPending(uint256 txId)'],
                  wallet
                );
                const tx = await contract.cancelPending(onChainTxId);
                return await tx.wait();
              }).catch(err => console.warn('Cancel broadcast error:', err.message));
            }
          }
        } catch { /* chain offline is fine */ }
      }
    }

    res.json({
      message: 'Vote recorded',
      txId,
      validatorId,
      action,
      banVotes: banCount,
      quorumReached,
    });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.json({ message: 'Already voted', txId, validatorId });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /gateway/validator-votes/:txId — vote tally for a transaction
app.get('/gateway/validator-votes/:txId', (req, res) => {
  const txId = parseInt(req.params.txId);
  const votes = db.prepare('SELECT * FROM validator_votes WHERE tx_id = ? ORDER BY created_at').all(txId);
  const banCount = votes.filter(v => v.action === 'ban').length;
  res.json({ txId, votes, banCount, quorumReached: banCount >= 2 });
});
// GET /gateway/node-earnings/:nodeId — fee income for a specific node
app.get('/gateway/node-earnings/:nodeId', (req, res) => {
  const nodeId = parseInt(req.params.nodeId);
  const earnings = db.prepare('SELECT * FROM node_earnings WHERE node_id = ? ORDER BY created_at DESC LIMIT 50').all(nodeId);
  const total = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM node_earnings WHERE node_id = ?').get(nodeId).total;
  res.json({ nodeId, total: Math.round(total * 1000) / 1000, earnings });
});

// GET /gateway/node-earnings — total earnings for all nodes
app.get('/gateway/node-earnings', (req, res) => {
  const nodes = [1, 2, 3].map(id => {
    const total = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM node_earnings WHERE node_id = ?').get(id).total;
    return { nodeId: id, total: Math.round(total * 1000) / 1000 };
  });
  const grandTotal = nodes.reduce((s, n) => s + n.total, 0);
  res.json({ nodes, grandTotal: Math.round(grandTotal * 1000) / 1000 });
});

app.use('/auth',     authRoutes);
app.use('/wallet',   walletRoutes);
app.use('/transfer', transferRoutes);
app.use('/dao',      daoRoutes);
app.use('/flag',     flagRoutes);
app.use('/freeze',   freezeRoutes);
app.use('/ledger',   ledgerRoutes);
app.use('/agent',    agentRoutes);

// ─── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ─── WebSocket ───────────────────────────────────────────────
initWebSocket(server);

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Bangla Coin API Gateway  →  http://localhost:${PORT}`);
  console.log(`🔗 RPC Nodes: ${RPC_URLS.join(', ')}`);
  console.log(`🛡️  Quorum: ${QUORUM} of ${RPC_URLS.length}`);
  console.log(`🔗 Transfer:  ${process.env.TRANSFER_CONTRACT}`);
  console.log(`🏛️  DAO:       ${process.env.DAO_CONTRACT}\n`);

  seedDatabase();
  startAutoConfirmer();
});
