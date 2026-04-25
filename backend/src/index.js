// backend/src/index.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const http    = require('http');

const { initWebSocket }     = require('./websocket');
const { startAutoConfirmer} = require('./autoConfirmer');
const { seedDatabase }      = require('./seed');

const authRoutes     = require('./routes/auth');
const walletRoutes   = require('./routes/wallet');
const transferRoutes = require('./routes/transfer');
const daoRoutes      = require('./routes/dao');
const flagRoutes     = require('./routes/flag');
const freezeRoutes   = require('./routes/freeze');
const ledgerRoutes   = require('./routes/ledger');
const agentRoutes    = require('./routes/agent');

const app    = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

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
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Bangla Coin API  →  http://localhost:${PORT}`);
  console.log(`🔗 Transfer:        ${process.env.TRANSFER_CONTRACT}`);
  console.log(`🏛️  DAO:             ${process.env.DAO_CONTRACT}`);
  console.log(`⛓️  Chain RPC:       ${process.env.CHAIN_RPC}\n`);

  // Seed agent + DAO on first run
  seedDatabase();

  // Start background auto-confirmer (SQLite-first, no provider needed)
  startAutoConfirmer();
});
