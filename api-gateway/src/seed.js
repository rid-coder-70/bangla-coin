// api-gateway/src/seed.js
// Seeds the initial Agent accounts and DAO treasury on first run.
// Safe to call multiple times — uses INSERT OR IGNORE.

const { ethers } = require('ethers');
const db = require('./db');

const AGENTS = [
  { phone: '01000000000', name: 'Bangla Coin Agent',   credit: 50000 },
  { phone: '01000000001', name: 'Agent Dhaka',         credit: 50000 },
  { phone: '01000000002', name: 'Agent Chittagong',    credit: 50000 },
];

const DAO_TREASURY = 300; // BDT

function seedDatabase() {
  // ── Schema migrations (safe for existing DBs) ─────────────────
  try { db.exec("ALTER TABLE transactions ADD COLUMN fee REAL NOT NULL DEFAULT 0"); } catch { /* column exists */ }
  try { db.exec(`CREATE TABLE IF NOT EXISTS node_earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, node_id INTEGER NOT NULL,
    tx_id INTEGER NOT NULL, amount REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`); } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS validator_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tx_id INTEGER NOT NULL,
    validator_id TEXT NOT NULL, action TEXT NOT NULL, reason TEXT DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(tx_id, validator_id)
  )`); } catch {}

  // ── Agent accounts ────────────────────────────────────────────
  for (const agent of AGENTS) {
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(agent.phone);
    if (!existing) {
      const wallet = ethers.Wallet.createRandom();
      db.prepare(
        'INSERT INTO users (phone, name, role, wallet_address, encrypted_key, initial_credit) VALUES (?,?,?,?,?,?)'
      ).run(agent.phone, agent.name, 'agent', wallet.address, wallet.privateKey, agent.credit);
      console.log(`🏦 Agent seeded  → phone: ${agent.phone}  name: ${agent.name}`);
    } else {
      // Ensure role + credit on old databases
      db.prepare(
        "UPDATE users SET role = 'agent', initial_credit = CASE WHEN initial_credit = 0 THEN ? ELSE initial_credit END WHERE phone = ?"
      ).run(agent.credit, agent.phone);
    }
  }

  // ── DAO group (id = 1) ────────────────────────────────────────
  const agentUser = db.prepare('SELECT wallet_address FROM users WHERE phone = ?').get(AGENTS[0].phone);
  const daoExists = db.prepare('SELECT id FROM dao_groups WHERE id = 1').get();
  if (!daoExists && agentUser) {
    db.prepare(
      'INSERT INTO dao_groups (id, name, owner, treasury, contract) VALUES (?,?,?,?,?)'
    ).run(1, 'Bangla Coin DAO', agentUser.wallet_address, DAO_TREASURY, process.env.DAO_CONTRACT || '');
    db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?,?)').run(1, agentUser.wallet_address);
    console.log('🏛️  DAO group seeded  → treasury: 300 BDT');
  }

  // ── Ensure all regular users have at least 5000 BDT ─────────
  const DEFAULT_USER_CREDIT = 5000;
  const patched = db.prepare(
    'UPDATE users SET initial_credit = ? WHERE initial_credit = 0 AND role != ?'
  ).run(DEFAULT_USER_CREDIT, 'agent');
  if (patched.changes > 0) {
    console.log(`💰 Patched ${patched.changes} user(s) → ${DEFAULT_USER_CREDIT} BDT initial credit`);
  }

  console.log(`✅ DB ready  —  Agent logins: ${AGENTS.map(a => a.phone).join(', ')}  OTP 123456`);
}

module.exports = { seedDatabase, AGENTS };
