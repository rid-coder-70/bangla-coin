// validator-template/backend/src/index.js — Validator Node Backend
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { ethers } = require('ethers');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT          = process.env.VALIDATOR_PORT || 3001;
const VALIDATOR_ID  = process.env.VALIDATOR_ID || '1';
const RPC_URL       = process.env.RPC_URL || 'http://127.0.0.1:10001';
const GATEWAY_URL   = process.env.GATEWAY_URL || 'http://localhost:5000';
const JWT_SECRET    = process.env.JWT_SECRET || 'validator_secret';
const ADMIN_USER    = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS    = process.env.ADMIN_PASS || 'admin';

const TRANSFER_ABI = [
  'event TransferQueued(uint256 indexed txId, address indexed from, address indexed to, uint256 amount, uint256 unlockTime)',
  'event TransferExecuted(uint256 indexed txId)',
  'event TransferCancelled(uint256 indexed txId)',
  'function pendingTxs(uint256) view returns (address sender, address recipient, uint256 amount, uint256 unlockTime, bool executed, bool cancelled)',
  'function txCounter() view returns (uint256)',
];

const FLAG_ABI = [
  'function getFlagCount(address) view returns (uint256)',
  'function isFlagged(address) view returns (bool)',
];

let provider = null;
let transferContract = null;
let flagContract = null;

// In-memory store for events seen by this node
const pendingTransactions = [];
const voteLog = [];

function initContracts() {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    if (process.env.TRANSFER_CONTRACT) {
      transferContract = new ethers.Contract(process.env.TRANSFER_CONTRACT, TRANSFER_ABI, provider);
    }
    if (process.env.FLAG_CONTRACT) {
      flagContract = new ethers.Contract(process.env.FLAG_CONTRACT, FLAG_ABI, provider);
    }
  } catch (e) {
    console.error('Failed to init contracts:', e.message);
  }
}

// ─── Auth middleware ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ─── POST /auth/login ────────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username, validatorId: VALIDATOR_ID }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, validatorId: VALIDATOR_ID });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// ─── GET /node-status ────────────────────────────────────────
app.get('/node-status', async (req, res) => {
  try {
    const start = Date.now();
    const blockNumber = await provider.getBlockNumber();
    const latency = Date.now() - start;
    const network = await provider.getNetwork();

    let txCount = 0;
    if (transferContract) {
      try { txCount = Number(await transferContract.txCounter()); } catch {}
    }

    res.json({
      validatorId: VALIDATOR_ID,
      rpcUrl: RPC_URL,
      status: 'online',
      blockHeight: blockNumber,
      chainId: Number(network.chainId),
      latencyMs: latency,
      txCounter: txCount,
      pendingCount: pendingTransactions.filter(t => !t.executed && !t.cancelled).length,
    });
  } catch (err) {
    res.json({ validatorId: VALIDATOR_ID, rpcUrl: RPC_URL, status: 'offline', error: err.message });
  }
});

// ─── GET /pending-flags — high-risk pending txs ──────────────
app.get('/pending-flags', authMiddleware, async (req, res) => {
  try {
    // Always fetch from gateway for most up-to-date data
    const r = await fetch(`${GATEWAY_URL}/gateway/transactions?limit=100`);
    let gatewayTxs = [];
    if (r.ok) {
      gatewayTxs = await r.json();
    }

    // Merge: use on-chain events first, fall back to gateway pending txs
    const localPending = pendingTransactions.filter(t => !t.executed && !t.cancelled);

    const results = localPending.length > 0
      ? await Promise.all(localPending.map(async tx => {
          let flagged = false, flagCount = 0;
          if (flagContract) {
            try {
              flagged = await flagContract.isFlagged(tx.recipient);
              flagCount = Number(await flagContract.getFlagCount(tx.recipient));
            } catch {}
          }
          return { ...tx, recipientFlagged: flagged, flagCount, source: 'onchain' };
        }))
      : gatewayTxs
          .filter(tx => tx.status === 'pending')
          .map(tx => ({
            txId: tx.id,
            sender: tx.sender,
            recipient: tx.recipient,
            amount: tx.amount,
            unlockTime: 0,
            executed: false,
            cancelled: false,
            timestamp: tx.created_at,
            riskScore: tx.risk_score,
            delay: tx.delay_seconds,
            riskReasons: (() => { try { return JSON.parse(tx.risk_reasons); } catch { return []; } })(),
            recipientFlagged: false,
            flagCount: 0,
            source: 'gateway',
          }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /events — all events seen by this node ──────────────
app.get('/events', authMiddleware, async (req, res) => {
  // If we have local on-chain events, use those
  if (pendingTransactions.length > 0) {
    return res.json(pendingTransactions.slice(-100));
  }
  // Fallback: fetch from Gateway for a populated view
  try {
    const r = await fetch(`${GATEWAY_URL}/gateway/transactions?limit=50`);
    if (r.ok) {
      const txs = await r.json();
      return res.json(txs.map(tx => ({
        txId: tx.id,
        sender: tx.sender,
        recipient: tx.recipient,
        amount: tx.amount,
        fee: tx.fee || 0,
        unlockTime: 0,
        executed: tx.status === 'executed',
        cancelled: tx.status === 'cancelled',
        pending: tx.status === 'pending',
        status: tx.status,
        timestamp: tx.created_at,
        riskScore: tx.risk_score,
        delay: tx.delay_seconds,
        source: 'gateway',
      })));
    }
  } catch {}
  res.json([]);
});

// ─── GET /votes — vote log ───────────────────────────────────
app.get('/votes', authMiddleware, (req, res) => {
  res.json(voteLog);
});

// ─── POST /vote — vote to ban or reject ──────────────────────
app.post('/vote', authMiddleware, async (req, res) => {
  const { txId, action, reason } = req.body; // action: 'ban' or 'reject'
  if (!txId || !['ban', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'txId and action (ban/reject) required' });
  }
  const vote = {
    validatorId: VALIDATOR_ID,
    txId,
    action,
    reason: reason || '',
    timestamp: Date.now(),
    voter: req.user.username,
  };
  voteLog.push(vote);
  console.log(`🗳️  [Validator ${VALIDATOR_ID}] Vote: ${action} on tx #${txId}`);

  // Forward vote to Gateway for cross-validator aggregation
  let gatewayResult = null;
  try {
    const r = await fetch(`${GATEWAY_URL}/gateway/validator-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, validatorId: VALIDATOR_ID, action, reason: reason || '' }),
    });
    if (r.ok) {
      gatewayResult = await r.json();
      console.log(`📡 [Validator ${VALIDATOR_ID}] Vote forwarded → Gateway: ${gatewayResult.banVotes || 0}/3 ban votes${gatewayResult.quorumReached ? ' — QUORUM REACHED!' : ''}`);
    }
  } catch (err) {
    console.warn(`⚠️  [Validator ${VALIDATOR_ID}] Failed to forward vote to Gateway: ${err.message}`);
  }

  res.json({ message: 'Vote recorded', vote, gatewayResult });
});

// ─── EVM Event Listener ──────────────────────────────────────
async function startEventListener() {
  if (!transferContract) {
    console.log('⚠️  No TRANSFER_CONTRACT — skipping event listener');
    return;
  }

  console.log(`👂 Listening for EVM events on ${RPC_URL}...`);

  transferContract.on('TransferQueued', (txId, from, to, amount, unlockTime) => {
    const tx = {
      txId: Number(txId), sender: from, recipient: to,
      amount: Number(amount), unlockTime: Number(unlockTime),
      executed: false, cancelled: false, timestamp: Date.now(),
    };
    pendingTransactions.push(tx);
    console.log(`📥 [Node ${VALIDATOR_ID}] TransferQueued #${tx.txId}: ${from.substring(0,10)}→${to.substring(0,10)} ${tx.amount} BDT`);
  });

  transferContract.on('TransferExecuted', (txId) => {
    const tx = pendingTransactions.find(t => t.txId === Number(txId));
    if (tx) tx.executed = true;
    console.log(`✅ [Node ${VALIDATOR_ID}] TransferExecuted #${Number(txId)}`);
  });

  transferContract.on('TransferCancelled', (txId) => {
    const tx = pendingTransactions.find(t => t.txId === Number(txId));
    if (tx) tx.cancelled = true;
    console.log(`❌ [Node ${VALIDATOR_ID}] TransferCancelled #${Number(txId)}`);
  });
}

// ─── Polling fallback (in case events don't fire on Hardhat) ─
async function pollPendingTxs() {
  if (!transferContract) return;
  try {
    const count = Number(await transferContract.txCounter());
    for (let i = 0; i < count; i++) {
      const existing = pendingTransactions.find(t => t.txId === i);
      if (existing) continue;
      try {
        const tx = await transferContract.pendingTxs(i);
        pendingTransactions.push({
          txId: i, sender: tx.sender, recipient: tx.recipient,
          amount: Number(tx.amount), unlockTime: Number(tx.unlockTime),
          executed: tx.executed, cancelled: tx.cancelled, timestamp: Date.now(),
        });
      } catch {}
    }
  } catch {}
}

// ─── Start ───────────────────────────────────────────────────
initContracts();

app.listen(PORT, () => {
  console.log(`\n🔷 Validator Node ${VALIDATOR_ID}  →  http://localhost:${PORT}`);
  console.log(`🔗 RPC: ${RPC_URL}\n`);
  startEventListener();
  setInterval(pollPendingTxs, 10000);
});
