# start-all.ps1 — Bangla Coin: Starts all 11 services in correct order
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot

# Read deployed contract addresses
$AddrFile = "$Root\deployedAddresses.json"
$TRANSFER = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
$DAO      = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
$FLAG     = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
$FREEZE   = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Bangla Coin Multi-Node Environment" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# ── 1. Start 3 Hardhat Nodes ──────────────────────────────────
Write-Host "`n1. Starting 3 Hardhat Nodes (10001, 10002, 10003)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Node1:10001 & npx.cmd hardhat node --port 10001" -WorkingDirectory $Root -WindowStyle Normal
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Node2:10002 & npx.cmd hardhat node --port 10002" -WorkingDirectory $Root -WindowStyle Minimized
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Node3:10003 & npx.cmd hardhat node --port 10003" -WorkingDirectory $Root -WindowStyle Minimized
Write-Host "   Waiting 12s for nodes to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 12

# ── 2. Deploy Contracts (output visible in this window) ───────
Write-Host "2. Deploying Smart Contracts..." -ForegroundColor Yellow
$deploy = Start-Process -FilePath "npx.cmd" -ArgumentList "hardhat", "run", "scripts/deploy.js", "--network", "node1" -WorkingDirectory $Root -Wait -NoNewWindow -PassThru

# Read freshly deployed addresses if available
if (Test-Path $AddrFile) {
  $addrs = Get-Content $AddrFile | ConvertFrom-Json
  $TRANSFER = $addrs.Transfer
  $DAO      = $addrs.DAO
  $FLAG     = $addrs.FlagRegistry
  $FREEZE   = $addrs.Freeze
  Write-Host "   Contracts: Transfer=$TRANSFER" -ForegroundColor DarkGreen
}

# ── 3. API Gateway (port 5000) ────────────────────────────────
Write-Host "3. Starting API Gateway (port 5000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title API-Gateway:5000 & npm.cmd start" -WorkingDirectory "$Root\api-gateway" -WindowStyle Minimized
Start-Sleep -Seconds 4   # let gateway DB boot before validators connect

# ── 4. Gateway Admin UI (port 6001) ──────────────────────────
Write-Host "4. Starting Gateway Admin UI (port 6001)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title GatewayAdmin:6001 & npm.cmd run dev" -WorkingDirectory "$Root\gateway-admin" -WindowStyle Minimized

# ── 5-7. Validators (inject env via SET in same cmd session) ──
$valEnv = "TRANSFER_CONTRACT=$TRANSFER&FLAG_CONTRACT=$FLAG&DAO_CONTRACT=$DAO&FREEZE_CONTRACT=$FREEZE&ADMIN_USER=admin&ADMIN_PASS=admin&JWT_SECRET=validator_secret&GATEWAY_URL=http://localhost:5000"

Write-Host "5. Starting Validator 1 (3001/4001)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Val1-Backend:3001 & set VALIDATOR_PORT=3001& set VALIDATOR_ID=1& set RPC_URL=http://127.0.0.1:10001& set $valEnv& npm.cmd start" -WorkingDirectory "$Root\validator-template\backend" -WindowStyle Minimized
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Val1-UI:4001 & set VITE_PORT=4001& set VITE_API_URL=http://localhost:3001& npm.cmd run dev" -WorkingDirectory "$Root\validator-template\frontend" -WindowStyle Minimized

Write-Host "6. Starting Validator 2 (3002/4002)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Val2-Backend:3002 & set VALIDATOR_PORT=3002& set VALIDATOR_ID=2& set RPC_URL=http://127.0.0.1:10002& set $valEnv& npm.cmd start" -WorkingDirectory "$Root\validator-template\backend" -WindowStyle Minimized
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Val2-UI:4002 & set VITE_PORT=4002& set VITE_API_URL=http://localhost:3002& npm.cmd run dev" -WorkingDirectory "$Root\validator-template\frontend" -WindowStyle Minimized

Write-Host "7. Starting Validator 3 (3003/4003)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Val3-Backend:3003 & set VALIDATOR_PORT=3003& set VALIDATOR_ID=3& set RPC_URL=http://127.0.0.1:10003& set $valEnv& npm.cmd start" -WorkingDirectory "$Root\validator-template\backend" -WindowStyle Minimized
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Val3-UI:4003 & set VITE_PORT=4003& set VITE_API_URL=http://localhost:3003& npm.cmd run dev" -WorkingDirectory "$Root\validator-template\frontend" -WindowStyle Minimized

# ── 8. User App (port 3000) ───────────────────────────────────
Write-Host "8. Starting User App (port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title UserApp:3000 & npm.cmd run dev" -WorkingDirectory "$Root\user-app" -WindowStyle Minimized

Write-Host "`n✅ All services launched!" -ForegroundColor Green
Write-Host ""
Write-Host "  User App        → http://localhost:3000  (login: 01000000000 / OTP 123456)" -ForegroundColor White
Write-Host "  Gateway Admin   → http://localhost:6001" -ForegroundColor White
Write-Host "  Validator 1 UI  → http://localhost:4001  (admin / admin)" -ForegroundColor White
Write-Host "  Validator 2 UI  → http://localhost:4002  (admin / admin)" -ForegroundColor White
Write-Host "  Validator 3 UI  → http://localhost:4003  (admin / admin)" -ForegroundColor White
Write-Host ""
Write-Host "  Contracts: Transfer=$TRANSFER" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Close individual terminal windows to stop those services." -ForegroundColor DarkGray
