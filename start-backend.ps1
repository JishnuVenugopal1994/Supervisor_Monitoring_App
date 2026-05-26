# ============================================================
# start-backend.ps1  — Run in Terminal 1 after setup
# ============================================================

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\nodejs"
}

# Point Prisma at the already-downloaded engine binaries (platform-suffixed names)
$enginesDir = Join-Path $PSScriptRoot "backend\node_modules\@prisma\engines"
$qe = Join-Path $enginesDir "query_engine-windows.dll.node"
$se = Join-Path $enginesDir "schema-engine-windows.exe"
if (Test-Path $qe) { $env:PRISMA_QUERY_ENGINE_LIBRARY = $qe }
if (Test-Path $se) { $env:PRISMA_SCHEMA_ENGINE_PATH   = $se }
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"

# Kill any process already using port 4000
$pid4000 = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($pid4000) {
    Write-Host "Port 4000 in use (PID $pid4000) — killing..." -ForegroundColor Yellow
    Stop-Process -Id $pid4000 -Force
    Start-Sleep -Milliseconds 500
}

Write-Host "Starting backend on http://localhost:4000 ..." -ForegroundColor Cyan

Set-Location backend
npm run dev
