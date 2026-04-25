// backend/src/riskEngine.js — 6-rule off-chain risk scorer (synchronous better-sqlite3)
const MAX_DELAY = 60;

/**
 * Score a transaction using 6 risk rules.
 * Uses better-sqlite3 synchronous API.
 *
 * @param {object} params
 * @param {string} params.sender
 * @param {string} params.recipient
 * @param {number} params.amount
 * @param {object} params.db  - better-sqlite3 database instance
 * @returns {{ score: number, delay: number, reasons: string[] }}
 */
function scoreTransaction({ sender, recipient, amount, db }) {
  let score = 0;
  const reasons = [];

  // R1: First-time recipient
  const prevTx = db
    .prepare("SELECT id FROM transactions WHERE sender=? AND recipient=? LIMIT 1")
    .get(sender, recipient);
  if (!prevTx) {
    score += 10;
    reasons.push("R1: First-time recipient (+10)");
  }

  // R2: Medium value (1,000–5,000 BDT)
  if (amount >= 1000 && amount <= 5000) {
    score += 20;
    reasons.push("R2: Medium amount 1,000–5,000 BDT (+20)");
  }

  // R3: High value (> 5,000 BDT)
  if (amount > 5000) {
    score += 30;
    reasons.push("R3: High amount > 5,000 BDT (+30)");
  }

  // R4: Recipient flagged by 3+ users
  const flags = db
    .prepare("SELECT COUNT(*) as cnt FROM flags WHERE flagged_address=?")
    .get(recipient);
  if (flags && flags.cnt >= 3) {
    score += 40;
    reasons.push("R4: Recipient flagged by 3+ users (+40)");
  }

  // R5: Velocity — 5+ transfers in last 60 minutes
  const oneHourAgo = Date.now() - 3600000;
  const recent = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM transactions WHERE sender=? AND created_at > ?"
    )
    .get(sender, oneHourAgo);
  if (recent && recent.cnt >= 5) {
    score += 50;
    reasons.push("R5: High velocity — 5+ transfers in last hour (+50)");
  }

  // R6: escalate if score > 70 (already handled by delay mapping below)
  if (score > 70) {
    reasons.push("R6: Score > 70 — maximum delay applied");
  }

  // Delay mapping
  let delay = 0;
  if (score > 70)        delay = 60;
  else if (score >= 50)  delay = 50;
  else if (score >= 40)  delay = 40;
  else if (score >= 30)  delay = 30;
  else if (score >= 20)  delay = 20;
  else if (score >= 10)  delay = 10;

  delay = Math.min(delay, MAX_DELAY);

  return { score, delay, reasons };
}

module.exports = { scoreTransaction };
