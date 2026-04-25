// api-gateway/src/autoConfirmer.js
// SQLite-first: auto-executes pending transactions after their friction delay elapses.
// Uses FallbackProvider for on-chain confirmations.
const db = require('./db');

async function runAutoConfirmer() {
  let pending;
  try {
    pending = db.prepare(`
      SELECT id, tx_id, sender, recipient, amount, delay_seconds, created_at
      FROM transactions
      WHERE status = 'pending'
    `).all();
  } catch (err) {
    return; // DB not ready yet
  }

  const now = Date.now();

  for (const row of pending) {
    const unlockAt = row.created_at + row.delay_seconds * 1000;
    if (now < unlockAt) continue; // delay hasn't elapsed yet

    // ── Off-chain execution (always works) ──────────────────────────────────
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${row.sender}${row.recipient}${row.amount}${row.created_at}`)
      .digest('hex');

    db.prepare(`
      UPDATE transactions
      SET status = 'executed', executed_at = ?, hash = ?
      WHERE id = ? AND status = 'pending'
    `).run(now, hash, row.id);

    console.log(`✅ [SQLite] Auto-executed tx #${row.id} — ${row.amount} BDT ${row.sender.substring(0,8)}… → ${row.recipient.substring(0,8)}…`);

    // ── Broadcast on-chain confirmTransfer to ALL 3 nodes ─────────────────
    try {
      if (process.env.TRANSFER_CONTRACT && row.tx_id >= 0) {
        const { broadcastToAllNodes } = require('./provider');
        const { ethers } = require('ethers');
        broadcastToAllNodes(async (wallet) => {
          const contract = new ethers.Contract(
            process.env.TRANSFER_CONTRACT,
            ['function confirmTransfer(uint256 txId)'],
            wallet
          );
          const tx = await contract.confirmTransfer(row.tx_id);
          return await tx.wait();
        }).catch(() => {});
      }
    } catch { /* node offline — SQLite state is already correct */ }
  }
}

function startAutoConfirmer() {
  console.log('🔄 Auto-confirmer started (every 15s) — SQLite-first mode');
  // Run once immediately, then every 15 seconds
  runAutoConfirmer();
  setInterval(runAutoConfirmer, 15000);
}

module.exports = { startAutoConfirmer };
