# bangla-chain/start-hardhat-nodes.ps1
# Starts 3 Hardhat EVM nodes on ports 10001, 10002, 10003
# Usage: .\bangla-chain\start-hardhat-nodes.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Bangla Coin — 3-Node Hardhat Network" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$nodes = @(
    @{ Port = 10001; Id = 1 },
    @{ Port = 10002; Id = 2 },
    @{ Port = 10003; Id = 3 }
)

$jobs = @()

foreach ($node in $nodes) {
    $port = $node.Port
    $id   = $node.Id

    Write-Host "[Node $id] Starting Hardhat on port $port ..." -ForegroundColor Green

    $job = Start-Process -FilePath "npx.cmd" `
        -ArgumentList "hardhat", "node", "--port", "$port" `
        -WorkingDirectory $Root `
        -PassThru `
        -WindowStyle Normal

    $jobs += $job
    Write-Host "[Node $id] PID: $($job.Id)  ->  http://127.0.0.1:$port" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All 3 nodes are running:" -ForegroundColor Cyan
Write-Host "  Node 1  ->  http://127.0.0.1:10001" -ForegroundColor White
Write-Host "  Node 2  ->  http://127.0.0.1:10002" -ForegroundColor White
Write-Host "  Node 3  ->  http://127.0.0.1:10003" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C here to stop tracking. Close node windows to kill nodes." -ForegroundColor DarkGray
Write-Host ""

# Keep script alive so user can see status
try {
    while ($true) {
        Start-Sleep -Seconds 5
        foreach ($job in $jobs) {
            if ($job.HasExited) {
                Write-Host "[WARNING] Node PID $($job.Id) has exited!" -ForegroundColor Red
            }
        }
    }
} finally {
    Write-Host "`nStopping all nodes..." -ForegroundColor Yellow
    foreach ($job in $jobs) {
        if (-not $job.HasExited) {
            Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped PID $($job.Id)" -ForegroundColor DarkGray
        }
    }
    Write-Host "All nodes stopped." -ForegroundColor Green
}
