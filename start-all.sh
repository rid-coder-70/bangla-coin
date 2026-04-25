#!/bin/bash

# ===================================================
# Bangla Coin: Linux Multi-Service Launcher (PM2)
# Architecture: 3 Nodes, 1 Gateway, 3 Validators, 4 UIs
# ===================================================

ROOT=$(pwd)
ADDR_FILE="$ROOT/deployedAddresses.json"

# Default fallback contract addresses (will be updated after deployment)
TRANSFER="0x5FbDB2315678afecb367f032d93F642f64180aa3"
DAO="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
FLAG="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
FREEZE="0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"

echo "Stopping any existing Bangla Coin processes..."
pm2 delete all || true

echo "==================================================="
echo "   Starting Bangla Coin Multi-Node Environment"
echo "==================================================="

# 1. Start 3 Hardhat Nodes (Ports 10001-10003)
echo "1. Launching Blockchain Nodes..."
pm2 start "npx hardhat node --port 10001" --name "node-10001"
pm2 start "npx hardhat node --port 10002" --name "node-10002"
pm2 start "npx hardhat node --port 10003" --name "node-10003"

echo "Waiting 12s for nodes to warm up..."
sleep 12

# 2. Deploy Smart Contracts
echo "2. Deploying Smart Contracts to Node 1..."
npx hardhat run scripts/deploy.js --network node1

# Update addresses from the deployment output
if [ -f "$ADDR_FILE" ]; then
    TRANSFER=$(jq -r '.Transfer' $ADDR_FILE)
    DAO=$(jq -r '.DAO' $ADDR_FILE)
    FLAG=$(jq -r '.FlagRegistry' $ADDR_FILE)
    FREEZE=$(jq -r '.Freeze' $ADDR_FILE)
    echo "✅ Contracts Updated: Transfer=$TRANSFER"
else
    echo "⚠️  Warning: $ADDR_FILE not found. Using default addresses."
fi

# 3. API Gateway (Port 5000)
echo "3. Starting API Gateway..."
cd "$ROOT/api-gateway" && pm2 start npm --name "api-gateway" -- start
sleep 5

# 4. Gateway Admin UI (Port 6000)
echo "4. Starting Gateway Admin UI..."
cd "$ROOT/gateway-admin" && pm2 start npm --name "gateway-admin-ui" -- run dev -- --port 6000

# 5-7. Validators (Loop to handle 1, 2, and 3)
VAL_ENV_COMMON="TRANSFER_CONTRACT=$TRANSFER,FLAG_CONTRACT=$FLAG,DAO_CONTRACT=$DAO,FREEZE_CONTRACT=$FREEZE,ADMIN_USER=admin,ADMIN_PASS=admin,JWT_SECRET=validator_secret,GATEWAY_URL=http://localhost:5000"

for i in {1..3}
do
    B_PORT=$((3000 + i))  # Backend Ports: 3001, 3002, 3003
    F_PORT=$((4000 + i))  # Frontend Ports: 4001, 4002, 4003
    R_PORT=$((10000 + i)) # RPC Ports: 10001, 10002, 10003
    
    echo "Starting Validator $i (Backend:$B_PORT | UI:$F_PORT)..."
    
    # Validator Backend
    cd "$ROOT/validator-template/backend" && \
    VALIDATOR_PORT=$B_PORT VALIDATOR_ID=$i RPC_URL="http://127.0.0.1:$R_PORT" \
    TRANSFER_CONTRACT=$TRANSFER FLAG_CONTRACT=$FLAG DAO_CONTRACT=$DAO FREEZE_CONTRACT=$FREEZE \
    ADMIN_USER=admin ADMIN_PASS=admin JWT_SECRET=validator_secret GATEWAY_URL=http://localhost:5000 \
    pm2 start npm --name "val-$i-backend" -- start

    # Validator Frontend
    cd "$ROOT/validator-template/frontend" && \
    VITE_PORT=$F_PORT VITE_API_URL="http://localhost:$B_PORT" \
    pm2 start npm --name "val-$i-ui" -- run dev -- --port $F_PORT
done

# 8. User App (Port 3000)
echo "8. Starting User App..."
cd "$ROOT/user-app" && pm2 start npm --name "user-app" -- run dev -- --port 3000

echo "==================================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "==================================================="
pm2 list
echo "Run 'pm2 logs' to see the output of your services."
