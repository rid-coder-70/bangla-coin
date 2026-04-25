#!/usr/bin/env bash
# bangla-chain/start-network.sh
# Starts 3 Hardhat EVM nodes on ports 10001, 10002, 10003
# Usage: bash bangla-chain/start-network.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "========================================"
echo "  Bangla Coin — 3-Node Hardhat Network"
echo "========================================"
echo ""

PIDS=()

cleanup() {
  echo ""
  echo "Stopping all nodes..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null && echo "  Stopped PID $pid"
  done
  echo "All nodes stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

for PORT in 10001 10002 10003; do
  NODE_ID=$(( (PORT - 10000) ))
  echo "[Node $NODE_ID] Starting Hardhat on port $PORT ..."
  cd "$ROOT" && npx hardhat node --port "$PORT" &
  PIDS+=($!)
  echo "[Node $NODE_ID] PID: ${PIDS[-1]}  ->  http://127.0.0.1:$PORT"
  sleep 3
done

echo ""
echo "All 3 nodes are running:"
echo "  Node 1  ->  http://127.0.0.1:10001"
echo "  Node 2  ->  http://127.0.0.1:10002"
echo "  Node 3  ->  http://127.0.0.1:10003"
echo ""
echo "Press Ctrl+C to stop all nodes."

wait
