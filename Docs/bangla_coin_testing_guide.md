# 🧪 Bangla Coin — Full Functionality Testing Guide
**Team SUST SONGLAP | Friction Hackathon 2026**

> [!IMPORTANT]
> Before testing, make sure **all 3 services** are running simultaneously in separate terminals.

---

## ⚡ Pre-Flight Checklist

Run each in a separate terminal:

```bash
# Terminal 1 — Local Blockchain (keep running)
npx hardhat node
```
```bash
# Terminal 2 — Backend API
cd backend && npm run start
```
```bash
# Terminal 3 — Frontend
cd frontend && npm run dev
```

Then open: **http://localhost:5173**

### Demo Accounts (from deployedAddresses.json)
| Name | Address | Balance |
|------|---------|---------|
| Alice | `0x82E890FDdE6daF80c0d6c37256248734920Aa504` | 1000 BDT |
| Bob | `0x743E4C9823286E2da1804141144dcE54c478393E` | 500 BDT |
| Agent | `0xB6A1Ef256B739601B501d072043BE5183c9B55B4` | 2000 BDT |
| ⚠️ Malicious | `0x87A40397Ef22355D294fEeCC8B4425b30Ce2Ca89` | flagged ×3 |

---

## F1 — Wallet & Login

| Step | Action | Expected |
|------|--------|---------|
| 1 | Open `http://localhost:5173` | Green hero login screen |
| 2 | Enter phone e.g. `01700000001` | OTP step appears |
| 3 | Enter OTP: `123456` | Dashboard loads |
| 4 | See balance card + wallet address | Wallet auto-created in SQLite |
| 5 | Click Logout | Back to login |
| 6 | Login with same phone | Same wallet address returned |

```bash
# API curl
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"01700000001"}'

curl -X POST http://localhost:3001/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"01700000001","otp":"123456"}'
# → returns { token, user: { phone, wallet } }
```

---

## F2 — Friction Timer (Risk Engine)

| Scenario | Amount | Expected Delay |
|----------|--------|---------------|
| New address | 50 BDT | 10s (R1) |
| Medium amount | 2,000 BDT | 30s (R2) |
| High amount | 6,000 BDT | 60s (R3) |
| Flagged recipient | Any | 120s + red banner (R4) |
| 5 sends in 1 hour | — | +35 pts (R5) |
| Score > 70 | Combo | 180s max (R6) |

```bash
TOKEN="paste_your_jwt_here"
curl -X POST http://localhost:3001/transfer/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"recipient":"0x743E4C9823286E2da1804141144dcE54c478393E","amount":2000}'
# → { txId, delay, score, reasons }
```

**UI Steps:**
1. Go to **Send** → enter Bob's address + `2000` BDT
2. Click Send → FrictionTimer shows circular countdown + risk reasons
3. Try flagged address `0x87A40397...Ca89` → red ⚠️ banner appears

---

## F3 — Undo Window (Cancel)

| Step | Action | Expected |
|------|--------|---------|
| 1 | Initiate any delayed send | Friction Timer appears |
| 2 | Click **Cancel** before expiry | Transaction cancelled |
| 3 | Check history | Status = `cancelled` |
| 4 | Let timer expire → Confirm | Status = `pending`, executes on-chain |

```bash
curl -X POST http://localhost:3001/transfer/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"txId":0}'
```

---

## F4 — Community Wallet (DAO)

| Step | Action | Expected |
|------|--------|---------|
| 1 | Open **DAO** tab | Treasury card shows 300 BDT |
| 2 | Fill proposal form → Create | Proposal appears in list |
| 3 | Click **Approve** | Yes vote increases, progress bar fills |
| 4 | Majority reached | "Funds Released!" badge appears |

```bash
# Propose
curl -X POST http://localhost:3001/dao/propose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"groupId":1,"recipient":"0xB6A1Ef256B739601B501d072043BE5183c9B55B4","amount":100,"description":"Test proposal"}'

# Vote
curl -X POST http://localhost:3001/dao/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"proposalId":0,"approve":true}'
```

---

## F5 — Fraud Flag

| Step | Action | Expected |
|------|--------|---------|
| 1 | Go to Send → paste Malicious address | Yellow/red FlagWarning banner |
| 2 | Flag count shown | "flagged 3 times" |
| 3 | Proceed to send | Extra 120s delay applied |

```bash
# Check flag count (public)
curl http://localhost:3001/flag/count/0x87A40397Ef22355D294fEeCC8B4425b30Ce2Ca89

# Report an account
curl -X POST http://localhost:3001/flag/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"account":"0x87A40397Ef22355D294fEeCC8B4425b30Ce2Ca89","reason":"Scam"}'
```

---

## F6 — Emergency Freeze

| Step | Action | Expected |
|------|--------|---------|
| 1 | Home tab → click **🚨 Emergency Freeze** | Confirm dialog |
| 2 | Confirm | Blue frozen banner at top |
| 3 | Try Send | Error: "Wallet is frozen" |
| 4 | Click **Unfreeze** | PIN input appears |
| 5 | Enter PIN: `1234` | Wallet unlocked |

```bash
curl -X POST http://localhost:3001/freeze/lock \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:3001/freeze/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pin":"1234"}'
```

---

## F7 — Immutable TX Log (Explorer)

| Step | Action | Expected |
|------|--------|---------|
| 1 | Open **Explorer** tab | Table of executed transactions |
| 2 | Click **Verify** on any row | ✓ Valid or ✗ Invalid indicator |
| 3 | Check `↑` chain link | Each tx links to previous hash |
| 4 | Last row shows `🔒` | Genesis block |

```bash
curl http://localhost:3001/ledger/txs | python3 -m json.tool
```

---

## 🔌 Full API Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/login` | ❌ | Send mock OTP |
| POST | `/auth/verify-otp` | ❌ | Verify → JWT |
| GET | `/wallet/balance` | ✅ | On-chain balance |
| GET | `/wallet/txs` | ✅ | Tx history |
| POST | `/transfer/send` | ✅ | Send with risk scoring |
| POST | `/transfer/cancel` | ✅ | Cancel pending |
| POST | `/dao/propose` | ✅ | Create proposal |
| POST | `/dao/vote` | ✅ | Vote |
| GET | `/dao/proposals/:groupId` | ✅ | List proposals |
| GET | `/flag/count/:address` | ❌ | Public flag count |
| POST | `/flag/report` | ✅ | Flag account |
| POST | `/freeze/lock` | ✅ | Emergency freeze |
| POST | `/freeze/unlock` | ✅ | Unfreeze with PIN |
| GET | `/ledger/txs` | ❌ | Hash-linked ledger |
| GET | `/health` | ❌ | Health check |

---

## 🛠️ SQLite Debug Commands

```bash
# Open database
sqlite3 backend/bangla-coin.db

# Useful queries
.tables
SELECT phone, wallet_address FROM users;
SELECT tx_id, sender, recipient, amount, status FROM transactions;
SELECT flagged_address, COUNT(*) as cnt FROM flags GROUP BY flagged_address;
SELECT * FROM frozen_wallets;
SELECT * FROM dao_proposals;
.exit
```

---

## ✅ Feature Coverage Matrix

| Feature | Contract | Backend | UI | Risk Engine |
|---------|---------|---------|-----|------------|
| F1 Wallet/Login | Transfer.sol | /auth /wallet | App.jsx Home.jsx | — |
| F2 Friction Timer | Transfer.sol | /transfer/send | FrictionTimer.jsx | ✅ 6 rules |
| F3 Undo/Cancel | Transfer.sol | /transfer/cancel | FrictionTimer.jsx | — |
| F4 Community DAO | DAO.sol | /dao/* | DAO.jsx | — |
| F5 Fraud Flag | FlagRegistry.sol | /flag/* | FlagWarning.jsx | R4 |
| F6 Freeze | Freeze.sol | /freeze/* | FreezeButton.jsx | — |
| F7 TX Log | SHA-256 chain | /ledger/txs | Explorer.jsx | — |
