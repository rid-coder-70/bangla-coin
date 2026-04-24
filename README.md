# Bangla Coin — Friction-First Blockchain Money 🇧🇩

Bangla Coin is an innovative, **Friction-First** Web3 platform designed to combat scams and fraud through dynamic transaction delays. Unlike traditional blockchains where transactions are instant and irreversible, Bangla Coin introduces a smart "Friction Engine" that slows down high-risk transfers, giving users a window to cancel suspicious transactions before they are finalized on the blockchain.

![Bangla Coin Cover](Images/BanglaCoinCover.png)

## 📸 Screenshots

### User Dashboard
![User Dashboard](Images/UserDashboard.png)

### Login & Signup
<div align="center">
  <img src="Images/Login.png" width="48%" />
  <img src="Images/Signup.png" width="48%" />
</div>

## 🌟 Key Features

- **Friction-First Engine:** Intelligent delay mechanism based on transaction risk (new recipients, high amounts, flagged addresses).
- **Emergency Freeze:** One-click wallet lockdown to instantly halt all outbound transfers if a user suspects their account is compromised.
- **Community DAO Treasury:** Decentralized governance for a shared treasury. Users propose and vote on fund allocations.
- **Decentralized Flagging System:** Community-driven reporting to identify and isolate scam addresses.
- **Premium UI/UX:** A modern, mobile-responsive, glassmorphism-inspired interface with fluid animations (powered by Framer Motion).
- **Dual Architecture (SQLite + EVM):** Fast off-chain state updates backed by on-chain smart contracts.

## 🏗️ Architecture overview

The project is structured as a monorepo with three main components:

1. **`frontend/`**: React + Vite application with TailwindCSS and Lucide Icons.
2. **`backend/`**: Node.js + Express API server with SQLite for fast off-chain state and Ethers.js for blockchain interaction.
3. **`contracts/`**: (Hardhat) Solidity smart contracts for the core ledger, DAO, and risk engine.

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- Local Hardhat Node (or a testnet RPC)

### 2. Run the Blockchain (Terminal 1)
```bash
npx hardhat node
```

### 3. Start the Backend (Terminal 2)
```bash
cd backend
npm install
npm run start
```
*Note: The backend runs on `http://localhost:3001`.*

### 4. Start the Frontend (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```
*Note: The frontend runs on `http://localhost:5173`.*

## 🧪 Testing the Platform

A comprehensive testing guide is available. Please refer to the `bangla_coin_testing_guide.md` for a step-by-step walkthrough of the Agent/User flow, real money transfers, friction timer, DAO voting, and freeze controls.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---
*Built for the Friction Hackathon 2026 by Team SUST SONGLAP*
