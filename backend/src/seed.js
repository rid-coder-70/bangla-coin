// backend/src/seed.js
// Seeds the initial Agent account and DAO treasury on first run.
// Safe to call multiple times — uses INSERT OR IGNORE.

const { ethers } = require('ethers');
const db = require('./db');

const AGENT_PHONE  = '01000000000';
const AGENT_NAME   = 'Bangla Coin Agent';
const AGENT_CREDIT = 50000; // BDT
const DAO_TREASURY = 300;   // BDT

function seedDatabase() {
  // ── Agent account ─────────────────────────────────────────────
  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(AGENT_PHONE);
  if (!existing) {
    const wallet = ethers.Wallet.createRandom();
    db.prepare(
      'INSERT INTO users (phone, name, role, wallet_address, encrypted_key, initial_credit) VALUES (?,?,?,?,?,?)'
    ).run(AGENT_PHONE, AGENT_NAME, 'agent', wallet.address, wallet.privateKey, AGENT_CREDIT);
    console.log(`🏦 Agent seeded  → phone: ${AGENT_PHONE}  wallet: ${wallet.address}`);
  } else {
    // Ensure credit is set even on old databases
    db.prepare(
      "UPDATE users SET role = 'agent', initial_credit = ? WHERE phone = ? AND initial_credit = 0"
    ).run(AGENT_CREDIT, AGENT_PHONE);
  }

  // ── DAO group (id = 1) ────────────────────────────────────────
  const agentUser = db.prepare('SELECT wallet_address FROM users WHERE phone = ?').get(AGENT_PHONE);
  const daoExists = db.prepare('SELECT id FROM dao_groups WHERE id = 1').get();
  if (!daoExists && agentUser) {
    db.prepare(
      'INSERT INTO dao_groups (id, name, owner, treasury, contract) VALUES (?,?,?,?,?)'
    ).run(1, 'Bangla Coin DAO', agentUser.wallet_address, DAO_TREASURY, process.env.DAO_CONTRACT || '');
    db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?,?)').run(1, agentUser.wallet_address);
    console.log('🏛️  DAO group seeded  → treasury: 300 BDT');
  }

  console.log(`✅ DB ready  —  Agent login: phone ${AGENT_PHONE}  OTP 123456`);
}

module.exports = { seedDatabase, AGENT_PHONE };
