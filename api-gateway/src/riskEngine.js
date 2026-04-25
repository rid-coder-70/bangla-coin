// api-gateway/src/riskEngine.js — 6-rule off-chain risk scorer
const MAX_DELAY = 60;  // Hard cap: 60 seconds
const MIN_DELAY = 5;   // Minimum: every transaction gets at least 5s friction

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

  // R1: First-time recipient (+20 pts)
  const prevTx = db
    .prepare("SELECT id FROM transactions WHERE sender=? AND recipient=? LIMIT 1")
    .get(sender, recipient);
  if (!prevTx) {
    score += 20;
    reasons.push("R1: First-time recipient (+20)");
  }

  // R2: Medium value (1,000–5,000 BDT) (+25 pts)
  if (amount >= 1000 && amount <= 5000) {
    score += 25;
    reasons.push("R2: Medium amount 1,000–5,000 BDT (+25)");
  }

  // R3: High value (> 5,000 BDT) (+40 pts)
  if (amount > 5000) {
    score += 40;
    reasons.push("R3: High amount > 5,000 BDT (+40)");
  }

  // R4: Recipient flagged by 3+ users (+45 pts)
  const flags = db
    .prepare("SELECT COUNT(*) as cnt FROM flags WHERE flagged_address=?")
    .get(recipient);
  if (flags && flags.cnt >= 3) {
    score += 45;
    reasons.push("R4: Recipient flagged by 3+ users (+45)");
  }

  // R5: Velocity — 5+ transfers in last 60 minutes (+35 pts)
  const oneHourAgo = Date.now() - 3600000;
  const recent = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM transactions WHERE sender=? AND created_at > ?"
    )
    .get(sender, oneHourAgo);
  if (recent && recent.cnt >= 5) {
    score += 35;
    reasons.push("R5: High velocity — 5+ transfers in last hour (+35)");
  }

  // R6: escalate if score > 70
  if (score > 70) {
    reasons.push("R6: Score > 70 — maximum delay applied");
  }

  // Delay mapping (scaled to 60s max)
  let delay = MIN_DELAY; // Every transaction gets at least 5s friction
  if (score >= 70)       delay = 60;  // hard cap
  else if (score >= 45)  delay = 45;
  else if (score >= 40)  delay = 30;
  else if (score >= 25)  delay = 20;
  else if (score >= 20)  delay = 10;

  delay = Math.min(delay, MAX_DELAY);

  return { score, delay, reasons };
}

module.exports = { scoreTransaction };
