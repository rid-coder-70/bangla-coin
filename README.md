# Bangla Coin — Friction-First Blockchain Money 🇧🇩

Bangla Coin is an innovative, **Friction-First** Web3 platform designed to combat scams and fraud through dynamic transaction delays. Unlike traditional blockchains where transactions are instant and irreversible, Bangla Coin introduces a smart "Friction Engine" that slows down high-risk transfers, giving users a window to cancel suspicious transactions before they are finalized on the blockchain.

![Bangla Coin Cover](Images/BanglaCoinCover.png)


### Project at a Glance
| Attribute | Detail |
| :--- | :--- |
| **Project Name** | Bangla Coin |
| **Hackathon** | Friction Hackathon 2026 |
| **Team** | SUST SONGLAP |
| **License** | MIT (Fully Open Source) |
| **Chain Type** | Permissioned PoA (Hardhat local → Polygon Mumbai testnet) |
| **Peg** | 1 Bangla Coin = 1 BDT (Fully collateralized) |
| **Max Delay** | 3 minutes (180 seconds, enforced on-chain) |
| **MVP Scope** | 48-hour hackathon build |


## 📸 Screenshots

### User Dashboard
![User Dashboard](Images/UserDashboard.png)

---

## 2. MVP Feature Shortlist
The 48-hour build focuses on eight core features. All other functionality is deferred to Phase 2+.

### 2.1 Built (In-Scope)
* **F1 — Wallet & Balance:** Phone-based login (OTP), custodial encrypted keys, BDT balance display, and transaction history.
* **F2 — Transactions with Friction Timer:** A risk engine scores transactions, returning a delay of 10s – 3m. A live countdown is displayed before execution.
* **F3 — Vote to Ban (Validators):** If a majority of validator nodes flag a transaction as suspicious, it is rejected before finality.
* **F4 — Community Wallet (DAO):** Group wallets where funds release only after a majority approval vote on-chain.
* **F5 — Emergency Freeze:** A "one-tap" lock button that cancels all pending transactions. Requires a PIN to unfreeze.
* **F6 — Immutable Transaction Log:** A SHA-256 hash-linked ledger with a basic block explorer to verify the chain of hashes.
* **F7 — Agent Network:** Authorized agents can perform "Cash-In" for users and maintain cash equilibrium via the agent network.
* **F8 — Validator Rewards:** Distributed servers (Validator Nodes) earn a tiny fee for computational power used to secure the network.

### 2.2 Deferred (Phase 2+)
* Agent cash-out portal (Requires real-world BDT flow integration).
* USSD / SMS interface for feature phones.
* Social key recovery / Shamir’s Secret Sharing.
* Interoperability with bKash, Nagad, and traditional banks.

---

## 3. System Architecture
The system utilizes a four-layer stack where the blockchain serves as the single source of truth.



* **Layer 1 — User App:** (React + Vite + Tailwind) Handles JWT/HTTP requests for users (sending/DAO) and agents (cash-in).
* **Layer 2 — API Gateway:** (Node.js) Traffic director with fast-failure logic. Includes a Health Monitor to blacklist unresponsive validator nodes.
* **Layer 3 — Validators:** (Node.js + BFT Consensus) Independent servers running balance checks, transaction banning votes, and the Friction Lock.
* **Layer 4 — Chain / Ledger:** (Hardhat / Polygon Edge) Four simultaneous chain copies for redundancy. Hosts `Transfer.sol`, `DAO.sol`, `Freeze.sol`, and `FlagRegistry.sol`.

---

## 4. Risk Engine — Logic & Rules
The risk engine operates off-chain (Node.js), generating a risk score that dictates the on-chain friction delay.

| Rule | Trigger | Risk Points | Action |
| :--- | :--- | :--- | :--- |
| **R1** | First-time recipient | +20 pts | 10 sec friction timer |
| **R2** | Amount 1,000–5,000 BDT | +25 pts | 30 sec delay + SMS confirm |
| **R3** | Amount > 5,000 BDT | +40 pts | 1 min delay + warning modal |
| **R4** | Recipient flagged by 3+ users | +45 pts | 2 min delay + red warning |
| **R5** | 5+ transfers in 1 hour | +35 pts | 1 min delay + freeze prompt |
| **R6** | **Total Score > 70** | **Escalate** | 3 min lock + dual confirm (Hard Cap) |

---
*Developed for the 2026 Friction Hackathon by SUST SONGLAP.*



## 🚀 Quick Start Guide

#on Windows

```
.\start-all.ps1
```

#on Linux

```
sudo chmod +x ./start-all.sh && ./start-all.sh
```

---
*Built for the Friction Hackathon 2026 by Team SUST SONGLAP*
