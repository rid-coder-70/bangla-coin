// backend/src/routes/agent.js — Agent Portal: mint, cash-in, location, nearby agents, chat
const express = require('express');
const db      = require('../db');
const { authenticateToken } = require('./auth');
const { notifyTxUpdate }    = require('../websocket');
const router  = express.Router();

// ─── Middleware: require agent role ──────────────────────────
function requireAgent(req, res, next) {
  if (req.user.role !== 'agent') return res.status(403).json({ error: 'Agent access only' });
  next();
}


// ─── POST /agent/cash-in — Instant 0-delay transfer to user ─
router.post('/cash-in', authenticateToken, requireAgent, (req, res) => {
  let { phone, amount } = req.body;
  const amt = Number(amount);
  if (!phone || isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Valid phone and amount required' });
  }

  // Resolve phone → wallet
  const target = db.prepare('SELECT wallet_address, name FROM users WHERE phone = ?').get(phone);
  if (!target) return res.status(404).json({ error: `No user found with phone ${phone}` });

  const sender = req.user.wallet;
  const recipient = target.wallet_address;

  // Check agent balance
  const { getOffChainBalance } = require('./wallet');
  const balance = getOffChainBalance(sender);
  if (amt > balance) {
    return res.status(400).json({ error: `Insufficient balance — ${balance.toLocaleString()} BDT available` });
  }

  // Insert executed transaction immediately (0 delay = instant)
  const info = db.prepare(`
    INSERT INTO transactions (tx_id, sender, recipient, amount, delay_seconds, risk_score, risk_reasons, status, executed_at)
    VALUES (?, ?, ?, ?, 0, 0, '["agent_cash_in"]', 'executed', ?)
  `).run(-1, sender, recipient, amt, Date.now());

  notifyTxUpdate(sender,    { txId: info.lastInsertRowid, status: 'executed', amount: amt, recipient });
  notifyTxUpdate(recipient, { txId: info.lastInsertRowid, status: 'executed', amount: amt, sender });

  res.json({
    message: `Cash-in successful: ${amt.toLocaleString()} BDT → ${target.name || phone}`,
    txId: info.lastInsertRowid,
    recipientName: target.name,
  });
});

// ─── GET /agent/history — Agent transaction log ─────────────
router.get('/history', authenticateToken, requireAgent, (req, res) => {
  const txs = db.prepare(`
    SELECT t.*, u1.phone as sender_phone, u2.phone as recipient_phone 
    FROM transactions t
    LEFT JOIN users u1 ON lower(u1.wallet_address) = lower(t.sender)
    LEFT JOIN users u2 ON lower(u2.wallet_address) = lower(t.recipient)
    WHERE t.sender = ? OR t.recipient = ? 
    ORDER BY t.created_at DESC LIMIT 100
  `).all(req.user.wallet, req.user.wallet);
  res.json(txs);
});

// ─── POST /agent/location — Update agent GPS/city/division ──
router.post('/location', authenticateToken, requireAgent, (req, res) => {
  const { latitude, longitude, city, division } = req.body;
  if (!city || !division) return res.status(400).json({ error: 'City and division required' });

  db.prepare(`
    INSERT INTO agent_locations (user_id, latitude, longitude, city, division, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      city = excluded.city,
      division = excluded.division,
      updated_at = excluded.updated_at
  `).run(req.user.id, latitude || 0, longitude || 0, city, division, Date.now());

  res.json({ message: 'Location updated' });
});

// ─── GET /agent/nearby — Find agents by range ───────────────
router.get('/nearby', authenticateToken, requireAgent, (req, res) => {
  const range = req.query.range || 'near'; // near | medium | big

  // Get current agent's location
  const myLoc = db.prepare('SELECT * FROM agent_locations WHERE user_id = ?').get(req.user.id);
  if (!myLoc) return res.status(400).json({ error: 'Set your location first' });

  let agents;
  if (range === 'big') {
    // Same division
    agents = db.prepare(`
      SELECT u.id, u.name, u.phone, al.city, al.division, al.latitude, al.longitude
      FROM agent_locations al
      JOIN users u ON u.id = al.user_id
      WHERE u.role = 'agent' AND al.division = ? AND u.id != ?
      ORDER BY al.updated_at DESC
    `).all(myLoc.division, req.user.id);
  } else if (range === 'medium') {
    // Same division, same or nearby city
    agents = db.prepare(`
      SELECT u.id, u.name, u.phone, al.city, al.division, al.latitude, al.longitude
      FROM agent_locations al
      JOIN users u ON u.id = al.user_id
      WHERE u.role = 'agent' AND al.division = ? AND u.id != ?
      ORDER BY al.city = ? DESC, al.updated_at DESC
    `).all(myLoc.division, req.user.id, myLoc.city);
  } else {
    // Near — same city only
    agents = db.prepare(`
      SELECT u.id, u.name, u.phone, al.city, al.division, al.latitude, al.longitude
      FROM agent_locations al
      JOIN users u ON u.id = al.user_id
      WHERE u.role = 'agent' AND al.city = ? AND al.division = ? AND u.id != ?
      ORDER BY al.updated_at DESC
    `).all(myLoc.city, myLoc.division, req.user.id);
  }

  res.json({ range, myLocation: { city: myLoc.city, division: myLoc.division }, agents });
});

// ─── POST /agent/chat/send — Broadcast message to range ─────
router.post('/chat/send', authenticateToken, requireAgent, (req, res) => {
  const { message, range } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
  const validRange = ['near', 'medium', 'big'].includes(range) ? range : 'near';

  const myLoc = db.prepare('SELECT * FROM agent_locations WHERE user_id = ?').get(req.user.id);
  if (!myLoc) return res.status(400).json({ error: 'Set your location first' });

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

  db.prepare(`
    INSERT INTO agent_chat_messages (sender_id, sender_name, message, range, city, division)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, user?.name || 'Agent', message.trim(), validRange, myLoc.city, myLoc.division);

  res.json({ message: 'Sent' });
});

// ─── GET /agent/chat/messages — Fetch chat by range ─────────
router.get('/chat/messages', authenticateToken, requireAgent, (req, res) => {
  const range = req.query.range || 'near';

  const myLoc = db.prepare('SELECT * FROM agent_locations WHERE user_id = ?').get(req.user.id);
  if (!myLoc) return res.json([]);

  let messages;
  if (range === 'big') {
    messages = db.prepare(`
      SELECT * FROM agent_chat_messages
      WHERE division = ? AND (range = 'near' OR range = 'medium' OR range = 'big')
      ORDER BY created_at DESC LIMIT 100
    `).all(myLoc.division);
  } else if (range === 'medium') {
    messages = db.prepare(`
      SELECT * FROM agent_chat_messages
      WHERE division = ? AND (range = 'near' OR range = 'medium')
      ORDER BY created_at DESC LIMIT 100
    `).all(myLoc.division);
  } else {
    messages = db.prepare(`
      SELECT * FROM agent_chat_messages
      WHERE city = ? AND division = ? AND range = 'near'
      ORDER BY created_at DESC LIMIT 100
    `).all(myLoc.city, myLoc.division);
  }

  res.json(messages.reverse());
});

module.exports = router;
