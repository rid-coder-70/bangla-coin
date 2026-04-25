// backend/src/db.js — SQLite setup with better-sqlite3
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../bangla-coin.db");

const db = new Database(DB_PATH);

// Enable WAL mode for performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    phone          TEXT UNIQUE NOT NULL,
    name           TEXT NOT NULL DEFAULT '',
    role           TEXT NOT NULL DEFAULT 'user',
    wallet_address TEXT UNIQUE NOT NULL,
    encrypted_key  TEXT NOT NULL,
    pin_hash       TEXT,
    initial_credit REAL NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS otp_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT NOT NULL,
    otp        TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_id           INTEGER NOT NULL DEFAULT -1,
    sender          TEXT NOT NULL,
    recipient       TEXT NOT NULL,
    amount          REAL NOT NULL,
    delay_seconds   INTEGER NOT NULL DEFAULT 0,
    risk_score      INTEGER NOT NULL DEFAULT 0,
    risk_reasons    TEXT NOT NULL DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'pending',
    hash            TEXT,
    prev_hash       TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    executed_at     INTEGER,
    cancelled_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS flags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    flagged_address TEXT NOT NULL,
    reporter        TEXT NOT NULL,
    reason          TEXT NOT NULL DEFAULT '',
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(flagged_address, reporter)
  );

  CREATE TABLE IF NOT EXISTS frozen_wallets (
    wallet_address TEXT PRIMARY KEY,
    frozen_at      INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    unfrozen_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS dao_groups (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    owner      TEXT NOT NULL,
    treasury   REAL NOT NULL DEFAULT 0,
    contract   TEXT,
    phone      TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS dao_members (
    group_id INTEGER NOT NULL,
    address  TEXT NOT NULL,
    PRIMARY KEY (group_id, address),
    FOREIGN KEY (group_id) REFERENCES dao_groups(id)
  );

  CREATE TABLE IF NOT EXISTS dao_proposals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id     INTEGER NOT NULL,
    proposer     TEXT NOT NULL,
    recipient    TEXT NOT NULL,
    amount       REAL NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    yes_votes    INTEGER NOT NULL DEFAULT 0,
    no_votes     INTEGER NOT NULL DEFAULT 0,
    total_members INTEGER NOT NULL DEFAULT 0,
    executed     INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (group_id) REFERENCES dao_groups(id)
  );

  CREATE TABLE IF NOT EXISTS dao_votes (
    proposal_id INTEGER NOT NULL,
    voter       TEXT NOT NULL,
    approve     INTEGER NOT NULL,
    voted_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (proposal_id, voter),
    FOREIGN KEY (proposal_id) REFERENCES dao_proposals(id)
  );

  CREATE TABLE IF NOT EXISTS agent_locations (
    user_id    INTEGER PRIMARY KEY,
    latitude   REAL NOT NULL DEFAULT 0,
    longitude  REAL NOT NULL DEFAULT 0,
    city       TEXT NOT NULL DEFAULT '',
    division   TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agent_chat_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id   INTEGER NOT NULL,
    sender_name TEXT NOT NULL DEFAULT '',
    message     TEXT NOT NULL,
    range       TEXT NOT NULL DEFAULT 'near',
    city        TEXT NOT NULL DEFAULT '',
    division    TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS dao_join_requests (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id         INTEGER NOT NULL,
    requester_wallet TEXT NOT NULL,
    requester_name   TEXT NOT NULL DEFAULT '',
    yes_votes        INTEGER NOT NULL DEFAULT 0,
    no_votes         INTEGER NOT NULL DEFAULT 0,
    total_members    INTEGER NOT NULL DEFAULT 1,
    status           TEXT NOT NULL DEFAULT 'pending',
    created_at       INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (group_id) REFERENCES dao_groups(id),
    UNIQUE(group_id, requester_wallet)
  );

  CREATE TABLE IF NOT EXISTS dao_join_votes (
    request_id INTEGER NOT NULL,
    voter      TEXT NOT NULL,
    approve    INTEGER NOT NULL,
    voted_at   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (request_id, voter),
    FOREIGN KEY (request_id) REFERENCES dao_join_requests(id)
  );

  CREATE TABLE IF NOT EXISTS dao_remove_polls (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id        INTEGER NOT NULL,
    target_wallet   TEXT NOT NULL,
    target_name     TEXT NOT NULL DEFAULT '',
    proposer_wallet TEXT NOT NULL,
    yes_votes       INTEGER NOT NULL DEFAULT 0,
    no_votes        INTEGER NOT NULL DEFAULT 0,
    total_members   INTEGER NOT NULL DEFAULT 1,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (group_id) REFERENCES dao_groups(id)
  );

  CREATE TABLE IF NOT EXISTS dao_remove_votes (
    poll_id  INTEGER NOT NULL,
    voter    TEXT NOT NULL,
    approve  INTEGER NOT NULL,
    voted_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (poll_id, voter),
    FOREIGN KEY (poll_id) REFERENCES dao_remove_polls(id)
  );
`);

// ─── Safe migrations for existing databases ──────────────────────────────────
const userCols = db.pragma('table_info(users)').map(c => c.name);
if (!userCols.includes('initial_credit'))
  db.exec("ALTER TABLE users ADD COLUMN initial_credit REAL NOT NULL DEFAULT 0");
if (!userCols.includes('role'))
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");

module.exports = db;
