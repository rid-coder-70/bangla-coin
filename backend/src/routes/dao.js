// backend/src/routes/dao.js
// Community membership system with join requests, remove polls, and majority voting
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

// ─── Helper: check membership ────────────────────────────────
function isMember(groupId, wallet) {
  return !!db.prepare('SELECT 1 FROM dao_members WHERE group_id = ? AND address = ?').get(groupId, wallet);
}

function memberCount(groupId) {
  return db.prepare('SELECT COUNT(*) as c FROM dao_members WHERE group_id = ?').get(groupId).c;
}

// ═══════════════════════════════════════════════════════════════
// COMMUNITY CRUD
// ═══════════════════════════════════════════════════════════════

// POST /dao/create — Create a new community (creator is auto-member)
router.post('/create', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Community name required' });
  const owner = req.user.wallet;
  const info = db.prepare('INSERT INTO dao_groups (name, owner, contract) VALUES (?, ?, ?)')
    .run(name.trim(), owner, process.env.DAO_CONTRACT || '');
  const groupId = info.lastInsertRowid;
  db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?, ?)').run(groupId, owner);
  res.json({ message: 'Community created', groupId, communityId: `#${groupId}` });
});

// GET /dao/my-groups — List communities the user belongs to
router.get('/my-groups', authenticateToken, (req, res) => {
  const groups = db.prepare(`
    SELECT g.id, g.name, g.owner, g.treasury,
      (SELECT COUNT(*) FROM dao_members WHERE group_id = g.id) as member_count
    FROM dao_groups g
    JOIN dao_members m ON m.group_id = g.id AND m.address = ?
    ORDER BY g.id DESC
  `).all(req.user.wallet);
  res.json(groups);
});

// GET /dao/info/:groupId — Community details + members
router.get('/info/:groupId', authenticateToken, (req, res) => {
  const gid = req.params.groupId;
  const group = db.prepare('SELECT * FROM dao_groups WHERE id = ?').get(gid);
  if (!group) return res.status(404).json({ error: 'Community not found' });
  const members = db.prepare(`
    SELECT m.address, u.name, u.phone
    FROM dao_members m
    LEFT JOIN users u ON u.wallet_address = m.address
    WHERE m.group_id = ?
  `).all(gid);
  const spent = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM dao_proposals WHERE group_id = ? AND executed = 1"
  ).get(gid).total;
  res.json({
    ...group,
    communityId: `#${group.id}`,
    member_count: members.length,
    members,
    available_treasury: Math.max(0, group.treasury - spent),
  });
});

// GET /dao/members/:groupId — List members
router.get('/members/:groupId', authenticateToken, (req, res) => {
  const members = db.prepare(`
    SELECT m.address, u.name, u.phone
    FROM dao_members m
    LEFT JOIN users u ON u.wallet_address = m.address
    WHERE m.group_id = ?
  `).all(req.params.groupId);
  res.json(members);
});

// ═══════════════════════════════════════════════════════════════
// JOIN REQUESTS
// ═══════════════════════════════════════════════════════════════

// POST /dao/join — Request to join a community by ID
router.post('/join', authenticateToken, (req, res) => {
  const { groupId } = req.body;
  const gid = Number(String(groupId).replace('#', ''));
  if (!gid) return res.status(400).json({ error: 'Community ID required' });

  const group = db.prepare('SELECT id FROM dao_groups WHERE id = ?').get(gid);
  if (!group) return res.status(404).json({ error: 'Community not found. Check the ID.' });

  if (isMember(gid, req.user.wallet)) {
    return res.status(409).json({ error: 'You are already a member' });
  }

  const existing = db.prepare(
    "SELECT id FROM dao_join_requests WHERE group_id = ? AND requester_wallet = ? AND status = 'pending'"
  ).get(gid, req.user.wallet);
  if (existing) return res.status(409).json({ error: 'You already have a pending request' });

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const total = memberCount(gid);

  db.prepare(`
    INSERT INTO dao_join_requests (group_id, requester_wallet, requester_name, total_members)
    VALUES (?, ?, ?, ?)
  `).run(gid, req.user.wallet, user?.name || '', total);

  res.json({ message: 'Join request sent! Members will vote on your request.' });
});

// GET /dao/join-requests/:groupId — Pending join requests (members only)
router.get('/join-requests/:groupId', authenticateToken, (req, res) => {
  const gid = req.params.groupId;
  if (!isMember(gid, req.user.wallet)) return res.status(403).json({ error: 'Not a member' });

  const requests = db.prepare(
    "SELECT * FROM dao_join_requests WHERE group_id = ? AND status = 'pending' ORDER BY created_at DESC"
  ).all(gid);
  res.json(requests);
});

// POST /dao/vote-join — Vote on a join request
router.post('/vote-join', authenticateToken, (req, res) => {
  const { requestId, approve } = req.body;

  const request = db.prepare('SELECT * FROM dao_join_requests WHERE id = ?').get(requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request already decided' });
  if (!isMember(request.group_id, req.user.wallet)) return res.status(403).json({ error: 'Not a member' });

  const already = db.prepare('SELECT 1 FROM dao_join_votes WHERE request_id = ? AND voter = ?').get(requestId, req.user.wallet);
  if (already) return res.status(409).json({ error: 'Already voted' });

  db.prepare('INSERT INTO dao_join_votes (request_id, voter, approve) VALUES (?, ?, ?)').run(requestId, req.user.wallet, approve ? 1 : 0);

  if (approve) {
    db.prepare('UPDATE dao_join_requests SET yes_votes = yes_votes + 1 WHERE id = ?').run(requestId);
  } else {
    db.prepare('UPDATE dao_join_requests SET no_votes = no_votes + 1 WHERE id = ?').run(requestId);
  }

  // Update total
  const total = memberCount(request.group_id);
  db.prepare('UPDATE dao_join_requests SET total_members = ? WHERE id = ?').run(total, requestId);

  // Check majority
  const updated = db.prepare('SELECT * FROM dao_join_requests WHERE id = ?').get(requestId);
  if (updated.yes_votes * 2 > updated.total_members) {
    db.prepare("UPDATE dao_join_requests SET status = 'accepted' WHERE id = ?").run(requestId);
    db.prepare('INSERT OR IGNORE INTO dao_members (group_id, address) VALUES (?, ?)').run(request.group_id, request.requester_wallet);
  } else if (updated.no_votes * 2 > updated.total_members) {
    db.prepare("UPDATE dao_join_requests SET status = 'rejected' WHERE id = ?").run(requestId);
  }

  res.json({ message: 'Vote recorded' });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE MEMBER POLLS
// ═══════════════════════════════════════════════════════════════

// POST /dao/remove-poll — Propose removing a member
router.post('/remove-poll', authenticateToken, (req, res) => {
  const { groupId, targetWallet } = req.body;
  if (!groupId || !targetWallet) return res.status(400).json({ error: 'groupId and targetWallet required' });
  if (!isMember(groupId, req.user.wallet)) return res.status(403).json({ error: 'Not a member' });
  if (!isMember(groupId, targetWallet)) return res.status(400).json({ error: 'Target is not a member' });
  if (targetWallet === req.user.wallet) return res.status(400).json({ error: 'Cannot remove yourself' });

  // Check for existing pending poll
  const existing = db.prepare(
    "SELECT id FROM dao_remove_polls WHERE group_id = ? AND target_wallet = ? AND status = 'pending'"
  ).get(groupId, targetWallet);
  if (existing) return res.status(409).json({ error: 'A remove poll for this member is already active' });

  const target = db.prepare('SELECT name FROM users WHERE wallet_address = ?').get(targetWallet);
  const total = memberCount(groupId);

  db.prepare(`
    INSERT INTO dao_remove_polls (group_id, target_wallet, target_name, proposer_wallet, total_members)
    VALUES (?, ?, ?, ?, ?)
  `).run(groupId, targetWallet, target?.name || '', req.user.wallet, total);

  res.json({ message: `Remove poll created for ${target?.name || targetWallet}` });
});

// GET /dao/remove-polls/:groupId — Active remove polls
router.get('/remove-polls/:groupId', authenticateToken, (req, res) => {
  if (!isMember(req.params.groupId, req.user.wallet)) return res.status(403).json({ error: 'Not a member' });
  const polls = db.prepare(
    "SELECT * FROM dao_remove_polls WHERE group_id = ? AND status = 'pending' ORDER BY created_at DESC"
  ).all(req.params.groupId);
  res.json(polls);
});

// POST /dao/vote-remove — Vote on a remove poll
router.post('/vote-remove', authenticateToken, (req, res) => {
  const { pollId, approve } = req.body;

  const poll = db.prepare('SELECT * FROM dao_remove_polls WHERE id = ?').get(pollId);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.status !== 'pending') return res.status(400).json({ error: 'Poll already decided' });
  if (!isMember(poll.group_id, req.user.wallet)) return res.status(403).json({ error: 'Not a member' });
  if (req.user.wallet === poll.target_wallet) return res.status(400).json({ error: 'Cannot vote on your own removal' });

  const already = db.prepare('SELECT 1 FROM dao_remove_votes WHERE poll_id = ? AND voter = ?').get(pollId, req.user.wallet);
  if (already) return res.status(409).json({ error: 'Already voted' });

  db.prepare('INSERT INTO dao_remove_votes (poll_id, voter, approve) VALUES (?, ?, ?)').run(pollId, req.user.wallet, approve ? 1 : 0);

  if (approve) {
    db.prepare('UPDATE dao_remove_polls SET yes_votes = yes_votes + 1 WHERE id = ?').run(pollId);
  } else {
    db.prepare('UPDATE dao_remove_polls SET no_votes = no_votes + 1 WHERE id = ?').run(pollId);
  }

  // Update total (exclude the target from voting count)
  const total = memberCount(poll.group_id) - 1; // target can't vote
  db.prepare('UPDATE dao_remove_polls SET total_members = ? WHERE id = ?').run(total, pollId);

  // Check majority
  const updated = db.prepare('SELECT * FROM dao_remove_polls WHERE id = ?').get(pollId);
  if (updated.yes_votes * 2 > updated.total_members) {
    db.prepare("UPDATE dao_remove_polls SET status = 'accepted' WHERE id = ?").run(pollId);
    db.prepare('DELETE FROM dao_members WHERE group_id = ? AND address = ?').run(poll.group_id, poll.target_wallet);
  } else if (updated.no_votes * 2 > updated.total_members) {
    db.prepare("UPDATE dao_remove_polls SET status = 'rejected' WHERE id = ?").run(pollId);
  }

  res.json({ message: 'Vote recorded' });
});

// ═══════════════════════════════════════════════════════════════
// PROPOSALS (spending) — now membership-enforced
// ═══════════════════════════════════════════════════════════════

// POST /dao/propose
router.post('/propose', authenticateToken, async (req, res) => {
  const { groupId, recipient, amount, description } = req.body;
  if (!recipient || !amount) return res.status(400).json({ error: 'recipient and amount required' });
  if (!isMember(groupId, req.user.wallet)) return res.status(403).json({ error: 'Not a member of this community' });

  const totalMembers = memberCount(groupId);
  const propInfo = db.prepare('INSERT INTO dao_proposals (group_id, proposer, recipient, amount, description, total_members) VALUES (?,?,?,?,?,?)')
    .run(groupId, req.user.wallet, recipient, amount, description || '', totalMembers);
  const proposalId = propInfo.lastInsertRowid;

  // Try on-chain (fire-and-forget)
  try {
    const user = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
    const wallet = new ethers.Wallet(user.encrypted_key, provider);
    const contract = new ethers.Contract(process.env.DAO_CONTRACT, daoAbi, wallet);
    contract.propose(recipient, amount, description || '').catch(() => {});
  } catch { /* ignore */ }

  res.json({ message: 'Proposal created', proposalId });
});

// POST /dao/vote
router.post('/vote', authenticateToken, async (req, res) => {
  const { proposalId, approve } = req.body;

  const proposal = db.prepare('SELECT * FROM dao_proposals WHERE id = ?').get(proposalId);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  if (proposal.executed) return res.status(400).json({ error: 'Proposal already executed' });
  if (!isMember(proposal.group_id, req.user.wallet)) return res.status(403).json({ error: 'Not a member' });

  const alreadyVoted = db.prepare('SELECT 1 FROM dao_votes WHERE proposal_id = ? AND voter = ?').get(proposalId, req.user.wallet);
  if (alreadyVoted) return res.status(409).json({ error: 'Already voted' });

  db.prepare('INSERT INTO dao_votes (proposal_id, voter, approve) VALUES (?,?,?)').run(proposalId, req.user.wallet, approve ? 1 : 0);

  if (approve) {
    db.prepare('UPDATE dao_proposals SET yes_votes = yes_votes + 1 WHERE id = ?').run(proposalId);
  } else {
    db.prepare('UPDATE dao_proposals SET no_votes = no_votes + 1 WHERE id = ?').run(proposalId);
  }

  const total = memberCount(proposal.group_id);
  db.prepare('UPDATE dao_proposals SET total_members = ? WHERE id = ?').run(total, proposalId);

  // Check majority
  const updated = db.prepare('SELECT yes_votes, total_members, recipient, amount FROM dao_proposals WHERE id = ?').get(proposalId);
  if (updated.yes_votes * 2 > updated.total_members) {
    db.prepare('UPDATE dao_proposals SET executed = 1 WHERE id = ?').run(proposalId);
    db.prepare(
      "INSERT INTO transactions (tx_id, sender, recipient, amount, status, executed_at) VALUES (?, ?, ?, ?, 'executed', ?)"
    ).run(-1, process.env.DAO_CONTRACT || 'DAO Treasury', updated.recipient, updated.amount, Date.now());
  }

  // Try on-chain (fire-and-forget)
  try {
    const user = db.prepare('SELECT encrypted_key FROM users WHERE id = ?').get(req.user.id);
    const wallet = new ethers.Wallet(user.encrypted_key, provider);
    const contract = new ethers.Contract(process.env.DAO_CONTRACT, daoAbi, wallet);
    contract.vote(proposalId, approve).catch(() => {});
  } catch { /* ignore */ }

  res.json({ message: 'Vote recorded' });
});

// GET /dao/treasury/:groupId
router.get('/treasury/:groupId', authenticateToken, (req, res) => {
  const group = db.prepare('SELECT treasury FROM dao_groups WHERE id = ?').get(req.params.groupId);
  if (!group) return res.json({ treasury: 0 });
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
