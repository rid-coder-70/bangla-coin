# Bangla Coin Backend ⚙️

This directory contains the Node.js API server that powers Bangla Coin. It acts as the bridge between the React frontend and the EVM-compatible blockchain, while managing an extremely fast, SQLite-backed off-chain state.

## 🛠️ Technology Stack

- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/) for REST API endpoints.
- **Database:** `better-sqlite3` for fast, synchronous, off-chain state management (WAL mode enabled).
- **Blockchain Interface:** [Ethers.js v6](https://docs.ethers.org/v6/) for communicating with the EVM smart contracts.
- **Authentication:** JWT (JSON Web Tokens) for secure, stateless sessions.
- **Real-time:** `ws` (WebSockets) for pushing live transaction updates to the frontend.

## ✨ Key Features

- **SQLite-First Architecture:** To ensure sub-second response times and a seamless UX, the backend updates a local SQLite database immediately. On-chain EVM transactions are handled asynchronously.
- **Auto-Confirmer Daemon:** A background job (`autoConfirmer.js`) that constantly monitors pending transactions and automatically executes them once their friction delay elapses.
- **Dynamic Risk Engine:** Evaluates transactions based on historical patterns, flagging data, and amounts to assign a dynamic delay (10s, 30s, 60s, or 120s).
- **Automated Seeding:** On first run, it automatically provisions an "Agent" account with 50,000 BDT and sets up the DAO treasury.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the `backend/` directory with the following variables (defaults shown):

```env
PORT=3001
JWT_SECRET=supersecretbanglacoin

# Blockchain settings
CHAIN_RPC=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (Update these after running Hardhat deploy)
TRANSFER_CONTRACT=0x5FbDB2315678afecb367f032d93F642f64180aa3
DAO_CONTRACT=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
FLAG_CONTRACT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
FREEZE_CONTRACT=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### 3. Run the Server
```bash
npm run start
```
The server will start on `http://localhost:3001`.

## 📁 Directory Structure

- `/src/routes`: API endpoints (`auth.js`, `wallet.js`, `transfer.js`, `dao.js`, etc.)
- `db.js`: SQLite initialization and schema definition.
- `autoConfirmer.js`: The background daemon for executing delayed transactions.
- `seed.js`: Database seeding logic.
- `websocket.js`: Real-time notification server.
- `riskEngine.js`: Logic for calculating friction delays.
