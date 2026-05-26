# ============================================================
# setup.ps1  — Run this ONCE before starting the app
# ============================================================

# 1. Add Node.js to PATH if it's not already there
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\nodejs"
    Write-Host "Node.js added to PATH for this session." -ForegroundColor Cyan
}

# 2. Tell Prisma to skip checksum (needed if a proxy blocks binary downloads)
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"

# 3. Try to pass the npm proxy setting to Prisma
$npmProxy = & npm config get proxy 2>$null
if ($npmProxy -and $npmProxy -ne "null") {
    $env:HTTPS_PROXY = $npmProxy
    $env:HTTP_PROXY  = $npmProxy
    Write-Host "Proxy configured: $npmProxy" -ForegroundColor Cyan
}

# 4. Create backend\.env if it doesn't exist yet
$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "Creating backend\.env with random secrets..." -ForegroundColor Yellow
    $secret1 = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $secret2 = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopfloor
JWT_SECRET=$secret1
JWT_REFRESH_SECRET=$secret2
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:5173
"@ | Set-Content $envFile
    Write-Host "backend\.env created." -ForegroundColor Green
} else {
    Write-Host "backend\.env already exists, skipping." -ForegroundColor Gray
}

# 5. Install backend dependencies
Write-Host "`nInstalling backend packages..." -ForegroundColor Yellow
Push-Location backend
npm install
Pop-Location

# 6. Install frontend dependencies
Write-Host "`nInstalling frontend packages..." -ForegroundColor Yellow
Push-Location frontend
npm install
Pop-Location

# 7. Download Prisma engine binaries (handles corporate proxy automatically)
Write-Host "`nDownloading Prisma engine binaries..." -ForegroundColor Yellow
. .\download-prisma-engines.ps1 -BackendPath "backend"
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit 1 }

# 8. Create the shopfloor database if it doesn't exist
Write-Host "`nEnsuring 'shopfloor' database exists..." -ForegroundColor Yellow
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
if (Test-Path "$pgBin\psql.exe") {
    $env:Path += ";$pgBin"
    $env:PGPASSWORD = "postgres"
    $dbExists = psql -U postgres -h 127.0.0.1 -tAc "SELECT 1 FROM pg_database WHERE datname='shopfloor'" 2>$null
    if ($dbExists -ne "1") {
        psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE shopfloor;" 2>&1
        Write-Host "  'shopfloor' database created." -ForegroundColor Green
    } else {
        Write-Host "  'shopfloor' database already exists." -ForegroundColor Gray
    }
    $env:PGPASSWORD = ""
} else {
    Write-Host "  psql not found at $pgBin — skipping auto-create. Create 'shopfloor' manually if needed." -ForegroundColor Yellow
}

# 9. Run Prisma migration (creates tables in the database)
Write-Host "`nRunning database migration..." -ForegroundColor Yellow
Push-Location backend
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Migration failed. Common reasons:" -ForegroundColor Red
    Write-Host "  - PostgreSQL is not running on port 5432" -ForegroundColor Red
    Write-Host "  - The 'shopfloor' database does not exist" -ForegroundColor Red
    Write-Host "  - Wrong postgres username/password in backend\.env" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix the issue above, then run this script again." -ForegroundColor Yellow
    Pop-Location
    exit 1
}
Pop-Location

# 8. Seed the database with sample data
Write-Host "`nSeeding database with sample data..." -ForegroundColor Yellow
Push-Location backend
npx prisma db seed
Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host " Now open two terminals and run:" -ForegroundColor Green
Write-Host "   Terminal 1:  .\start-backend.ps1" -ForegroundColor Cyan
Write-Host "   Terminal 2:  .\start-frontend.ps1" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
