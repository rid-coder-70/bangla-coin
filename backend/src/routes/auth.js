// backend/src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper: Authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(401).json({ error: 'Session expired' });
    
    // Check if user actually exists in the DB (handles DB resets)
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(decodedUser.id);
    if (!exists) return res.status(401).json({ error: 'User not found. Please log out and log in again.' });
    
    req.user = decodedUser;
    next();
  });
}

// POST /auth/login - Mock OTP generation
router.post('/login', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const otp = '123456'; // Mock OTP
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  db.prepare('INSERT INTO otp_sessions (phone, otp, expires_at) VALUES (?, ?, ?)')
    .run(phone, otp, expiresAt);

  res.json({ message: 'OTP sent (mock: 123456)' });
});

// POST /auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;

  const session = db.prepare('SELECT id FROM otp_sessions WHERE phone = ? AND otp = ? AND expires_at > ? AND used = 0 ORDER BY id DESC LIMIT 1')
    .get(phone, otp, Date.now());

  if (!session) return res.status(400).json({ error: 'Invalid or expired OTP' });

  db.prepare('UPDATE otp_sessions SET used = 1 WHERE id = ?').run(session.id);

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (!user) {
    // Create new wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = wallet.privateKey; // MVP: plain text for now, encrypt in Phase 2
    const userName = req.body.name || '';
    
    const info = db.prepare('INSERT INTO users (phone, name, wallet_address, encrypted_key) VALUES (?, ?, ?, ?)')
      .run(phone, userName, wallet.address, encryptedKey);
      
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, wallet: user.wallet_address, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      phone:          user.phone,
      name:           user.name,
      wallet:         user.wallet_address,
      role:           user.role || 'user',
      initial_credit: user.initial_credit || 0,
    }
  });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
