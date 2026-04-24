// backend/src/autoConfirmer.js
// SQLite-first: auto-executes pending transactions after their friction delay elapses.
// On-chain confirmations are attempted as a fire-and-forget bonus — never blocking.
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

    // ── Fire-and-forget on-chain (optional — only if node is up) ──────────
    try {
      const { ethers } = require('ethers');
      const provider   = new ethers.JsonRpcProvider(
        process.env.CHAIN_RPC || 'http://127.0.0.1:8545'
      );
      const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (!deployerKey || !process.env.TRANSFER_CONTRACT) continue;

      // Short health-check so we don't block on a dead node
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 1000))
      ]);

      const wallet   = new ethers.Wallet(deployerKey, provider);
      const contract = new ethers.Contract(
        process.env.TRANSFER_CONTRACT,
        ['function confirmTransfer(uint256 txId)'],
        wallet
      );
      if (row.tx_id >= 0) {
        contract.confirmTransfer(row.tx_id).catch(() => {});
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
