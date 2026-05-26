# ============================================================
# start-frontend.ps1  — Run in Terminal 2 after setup
# ============================================================

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\nodejs"
}

# Kill any process already using port 5173
$pid5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($pid5173) {
    Write-Host "Port 5173 in use (PID $pid5173) — killing..." -ForegroundColor Yellow
    Stop-Process -Id $pid5173 -Force
    Start-Sleep -Milliseconds 500
}

Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Cyan

Set-Location frontend
npm run dev
