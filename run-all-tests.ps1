# ============================================================
# run-all-tests.ps1  — Run ALL tests with a single command
#
# Usage:  .\run-all-tests.ps1
#         .\run-all-tests.ps1 -UnitOnly      # skip E2E
#         .\run-all-tests.ps1 -E2EOnly       # skip unit tests
# ============================================================
param(
    [switch]$UnitOnly,
    [switch]$E2EOnly
)

Set-Location $PSScriptRoot

# ── Ensure Node is on PATH ──────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\nodejs"
}

# ── Prisma engine paths (required for backend server) ───────
$enginesDir = Join-Path $PSScriptRoot "backend\node_modules\@prisma\engines"
$qe = Join-Path $enginesDir "query_engine-windows.dll.node"
$se = Join-Path $enginesDir "schema-engine-windows.exe"
if (Test-Path $qe) { $env:PRISMA_QUERY_ENGINE_LIBRARY = $qe }
if (Test-Path $se) { $env:PRISMA_SCHEMA_ENGINE_PATH   = $se }
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"

$unitExitCode = 0
$e2eExitCode  = 0
$backendJob   = $null
$frontendJob  = $null

function Kill-Port($port) {
    $p = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
         Select-Object -ExpandProperty OwningProcess
    if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}

function Wait-Port($port, $timeoutSec = 60) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conn) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# ── STEP 1: Backend unit tests (Jest) ───────────────────────
if (-not $E2EOnly) {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  STEP 1 — Backend unit tests (Jest)"    -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

    Push-Location backend
    npm test
    $unitExitCode = $LASTEXITCODE
    Pop-Location

    if ($unitExitCode -eq 0) {
        Write-Host "✔ Unit tests PASSED" -ForegroundColor Green
    } else {
        Write-Host "✘ Unit tests FAILED (exit $unitExitCode)" -ForegroundColor Red
    }
}

# ── STEP 2: E2E tests (Playwright) ──────────────────────────
if (-not $UnitOnly) {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  STEP 2 — Starting servers for E2E"     -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

    # Kill anything already occupying the ports
    Kill-Port 4000
    Kill-Port 5173
    Start-Sleep -Milliseconds 300

    # Start backend as a background job
    Write-Host "Starting backend (port 4000)..." -ForegroundColor Cyan
    $backendJob = Start-Job -ScriptBlock {
        param($root, $qe, $se)
        $env:Path += ";C:\Program Files\nodejs"
        $env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"
        if ($qe) { $env:PRISMA_QUERY_ENGINE_LIBRARY = $qe }
        if ($se) { $env:PRISMA_SCHEMA_ENGINE_PATH   = $se }
        Set-Location "$root\backend"
        npm run dev 2>&1
    } -ArgumentList $PSScriptRoot, $env:PRISMA_QUERY_ENGINE_LIBRARY, $env:PRISMA_SCHEMA_ENGINE_PATH

    # Start frontend as a background job
    Write-Host "Starting frontend (port 5173)..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        param($root)
        $env:Path += ";C:\Program Files\nodejs"
        Set-Location "$root\frontend"
        npm run dev 2>&1
    } -ArgumentList $PSScriptRoot

    # Wait for both ports to be ready
    Write-Host "Waiting for backend on port 4000..." -ForegroundColor Yellow
    if (-not (Wait-Port 4000 90)) {
        Write-Host "✘ Backend did not start within 90 s" -ForegroundColor Red
        $e2eExitCode = 1
    } else {
        Write-Host "✔ Backend ready" -ForegroundColor Green
        Write-Host "Waiting for frontend on port 5173..." -ForegroundColor Yellow
        if (-not (Wait-Port 5173 90)) {
            Write-Host "✘ Frontend did not start within 90 s" -ForegroundColor Red
            $e2eExitCode = 1
        } else {
            Write-Host "✔ Frontend ready" -ForegroundColor Green

            Write-Host ""
            Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
            Write-Host "  STEP 3 — Running Playwright E2E tests" -ForegroundColor Cyan
            Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

            Push-Location e2e
            npx playwright test
            $e2eExitCode = $LASTEXITCODE
            Pop-Location

            if ($e2eExitCode -eq 0) {
                Write-Host "✔ E2E tests PASSED" -ForegroundColor Green
            } else {
                Write-Host "✘ E2E tests FAILED (exit $e2eExitCode)" -ForegroundColor Red
            }
        }
    }

    # ── Cleanup: stop background jobs and free ports ─────────
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    if ($backendJob)  { Stop-Job $backendJob;  Remove-Job $backendJob }
    if ($frontendJob) { Stop-Job $frontendJob; Remove-Job $frontendJob }
    Kill-Port 4000
    Kill-Port 5173
    Write-Host "Servers stopped." -ForegroundColor Yellow
}

# ── Summary ──────────────────────────────────────────────────
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESULTS SUMMARY"                        -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

if (-not $E2EOnly) {
    $unitLabel = if ($unitExitCode -eq 0) { "PASSED ✔" } else { "FAILED ✘" }
    $unitColor = if ($unitExitCode -eq 0) { "Green"    } else { "Red"     }
    Write-Host "  Unit tests (Jest):      $unitLabel" -ForegroundColor $unitColor
}
if (-not $UnitOnly) {
    $e2eLabel  = if ($e2eExitCode -eq 0)  { "PASSED ✔" } else { "FAILED ✘" }
    $e2eColor  = if ($e2eExitCode -eq 0)  { "Green"    } else { "Red"      }
    Write-Host "  E2E tests (Playwright): $e2eLabel"  -ForegroundColor $e2eColor
}
Write-Host ""

# Exit with non-zero if any suite failed
$overall = [Math]::Max($unitExitCode, $e2eExitCode)
exit $overall
