// backend/src/routes/dao.js
// MVP: votes and proposals are handled off-chain (SQLite only)
// On-chain calls are attempted but failures are silently ignored for the demo
const express = require('express');
const { ethers } = require('ethers');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

const provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC || 'http://127.0.0.1:8545');
const daoAbi = [
  'function propose(address to, uint256 amount, string description) returns (uint256)',
  'function vote(uint256 id, bool approve)',
  'function addMember(address member)',
];

// POST /dao/create
router.post('/create', authenticateToken, (req, res) => {
  const { name, members = [] } = req.body;
  const owner = req.user.wallet;
  const info  = db.prepare('INSERT INTO dao_groups (name, owner, contract) VALUES (?, ?, ?)').run(name, owner, process.env.DAO_CONTRACT || '');
  const groupId = info.lastInsertRowid;
  const stmt    = db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?, ?)');
  db.transaction(() => {
    for (const m of [...new Set([...members, owner])]) stmt.run(groupId, m);
  })();
  res.json({ message: 'DAO created', groupId });
});

// POST /dao/propose
router.post('/propose', authenticateToken, async (req, res) => {
  const { groupId, recipient, amount, description } = req.body;
  if (!recipient || !amount) return res.status(400).json({ error: 'recipient and amount required' });

  // Ensure the DAO group exists (use default group 1 if missing)
  const group = db.prepare('SELECT id FROM dao_groups WHERE id = ?').get(groupId);
  if (!group) {
    db.prepare('INSERT OR IGNORE INTO dao_groups (id, name, owner, treasury, contract) VALUES (?,?,?,?,?)')
      .run(groupId, 'Default DAO', req.user.wallet, 300, process.env.DAO_CONTRACT || '');
    db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?,?)').run(groupId, req.user.wallet);
  }

  const totalMembers = Math.max(1, db.prepare('SELECT COUNT(*) as c FROM dao_members WHERE group_id = ?').get(groupId).c);

  const propInfo = db.prepare('INSERT INTO dao_proposals (group_id, proposer, recipient, amount, description, total_members) VALUES (?,?,?,?,?,?)')
    .run(groupId, req.user.wallet, recipient, amount, description || '', totalMembers);
  const proposalId = propInfo.lastInsertRowid;

  // Try on-chain (fire-and-forget for demo)
  try {
    const user     = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
    const wallet   = new ethers.Wallet(user.encrypted_key, provider);
    const contract = new ethers.Contract(process.env.DAO_CONTRACT, daoAbi, wallet);
    contract.propose(recipient, amount, description || '').catch(() => {});
  } catch { /* ignore chain failures in demo */ }

  res.json({ message: 'Proposal created', proposalId });
});

// POST /dao/vote
router.post('/vote', authenticateToken, async (req, res) => {
  const { proposalId, approve } = req.body;

  const proposal = db.prepare('SELECT * FROM dao_proposals WHERE id = ?').get(proposalId);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  if (proposal.executed) return res.status(400).json({ error: 'Proposal already executed' });

  // Prevent double-voting
  const alreadyVoted = db.prepare('SELECT proposal_id FROM dao_votes WHERE proposal_id = ? AND voter = ?').get(proposalId, req.user.wallet);
  if (alreadyVoted) return res.status(409).json({ error: 'Already voted on this proposal' });

  // Add voter as member if not already (demo-friendly)
  db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?,?)').run(proposal.group_id, req.user.wallet);

  // Record vote in SQLite
  db.prepare('INSERT INTO dao_votes (proposal_id, voter, approve) VALUES (?,?,?)').run(proposalId, req.user.wallet, approve ? 1 : 0);

  if (approve) {
    db.prepare('UPDATE dao_proposals SET yes_votes = yes_votes + 1 WHERE id = ?').run(proposalId);
  } else {
    db.prepare('UPDATE dao_proposals SET no_votes = no_votes + 1 WHERE id = ?').run(proposalId);
  }

  // Refresh member count
  const memberCount = db.prepare('SELECT COUNT(*) as c FROM dao_members WHERE group_id = ?').get(proposal.group_id).c;
  db.prepare('UPDATE dao_proposals SET total_members = ? WHERE id = ?').run(memberCount, proposalId);

  // Check majority
  const updated = db.prepare('SELECT yes_votes, total_members, recipient, amount FROM dao_proposals WHERE id = ?').get(proposalId);
  if (updated.yes_votes * 2 > updated.total_members) {
    db.prepare('UPDATE dao_proposals SET executed = 1 WHERE id = ?').run(proposalId);
    
    // Credit the recipient's off-chain balance so they receive the funds
    db.prepare(
      "INSERT INTO transactions (tx_id, sender, recipient, amount, status, executed_at) VALUES (?, ?, ?, ?, 'executed', ?)"
    ).run(-1, process.env.DAO_CONTRACT || 'DAO Treasury', updated.recipient, updated.amount, Date.now());
  }

  // Try on-chain (fire-and-forget)
  try {
    const user     = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
    const wallet   = new ethers.Wallet(user.encrypted_key, provider);
    const contract = new ethers.Contract(process.env.DAO_CONTRACT, daoAbi, wallet);
    contract.vote(proposalId, approve).catch(() => {});
  } catch { /* ignore */ }

  res.json({ message: 'Vote recorded' });
});

// GET /dao/treasury/:groupId — real-time treasury balance
router.get('/treasury/:groupId', authenticateToken, (req, res) => {
  const group = db.prepare('SELECT treasury FROM dao_groups WHERE id = ?').get(req.params.groupId);
  if (!group) return res.json({ treasury: 300 }); // fallback seed
  const spent = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM dao_proposals WHERE group_id = ? AND executed = 1"
  ).get(req.params.groupId).total;
  res.json({ treasury: Math.max(0, group.treasury - spent) });
});

// GET /dao/proposals/:groupId
router.get('/proposals/:groupId', authenticateToken, (req, res) => {
  const proposals = db.prepare('SELECT * FROM dao_proposals WHERE group_id = ? ORDER BY id DESC').all(req.params.groupId);
  res.json(proposals);
});

module.exports = router;
