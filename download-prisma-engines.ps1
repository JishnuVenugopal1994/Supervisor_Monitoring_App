# ============================================================
# download-prisma-engines.ps1
# Downloads Prisma engine binaries through a corporate NTLM proxy.
# ============================================================

param(
    [string]$BackendPath = "backend"
)

$ErrorActionPreference = "Stop"

Write-Host "Downloading Prisma engine binaries via system proxy..." -ForegroundColor Cyan

# --- Read the engine binary hash from @prisma/client runtime ---
$enginesDir = Join-Path $BackendPath "node_modules\@prisma\engines"
$clientRuntime = Join-Path $BackendPath "node_modules\@prisma\client\runtime\library.js"
if (-not (Test-Path $clientRuntime)) {
    Write-Host "ERROR: Run 'npm install' in the backend folder first." -ForegroundColor Red
    exit 1
}
$match = Select-String -Path $clientRuntime -Pattern 'enginesVersion:"([a-f0-9]{40})"' | Select-Object -First 1
if (-not $match) {
    Write-Host "ERROR: Could not find enginesVersion hash in @prisma/client/runtime/library.js" -ForegroundColor Red
    exit 1
}
$engineHash = $match.Matches[0].Groups[1].Value
Write-Host "  Engine hash: $engineHash" -ForegroundColor Gray

# --- Read proxy from environment variables (set by corporate policy) ---
$proxyUrl = $env:HTTPS_PROXY ?? $env:https_proxy ?? $env:HTTP_PROXY ?? $env:http_proxy
if ($proxyUrl) {
    # Strip http:// prefix — WinHTTP SetProxy wants "host:port" format
    $proxyHostPort = $proxyUrl -replace '^https?://', '' -replace '/$', ''
    Write-Host "  Proxy: $proxyHostPort" -ForegroundColor Gray
} else {
    $proxyHostPort = $null
    Write-Host "  No proxy detected, attempting direct download." -ForegroundColor Gray
}

# --- Download helper using WinHTTP COM (handles NTLM proxy automatically) ---
function Download-File {
    param([string]$Url, [string]$OutFile)

    $req = New-Object -ComObject WinHttp.WinHttpRequest.5.1

    # HTTPREQUEST_PROXYSETTING_PROXY = 2, HTTPREQUEST_PROXYSETTING_DIRECT = 1
    if ($proxyHostPort) {
        $req.SetProxy(2, $proxyHostPort, "")
    }

    $req.Open("GET", $Url, $false)     # synchronous
    $req.SetAutoLogonPolicy(0)         # 0 = always send Windows credentials to proxy
    $req.Send()

    if ($req.Status -ne 200) {
        throw "HTTP $($req.Status) $($req.StatusText) for $Url"
    }

    [System.IO.File]::WriteAllBytes($OutFile, $req.ResponseBody)
}

# --- Decompress a .gz file ---
function Expand-Gz {
    param([string]$GzPath, [string]$OutPath)
    $gzStream  = [System.IO.File]::OpenRead($GzPath)
    $outStream = [System.IO.File]::Create($OutPath)
    $decomp    = [System.IO.Compression.GZipStream]::new($gzStream, [System.IO.Compression.CompressionMode]::Decompress)
    $decomp.CopyTo($outStream)
    $decomp.Dispose(); $outStream.Dispose(); $gzStream.Dispose()
}

# --- Download each engine binary ---
$baseUrl    = "https://binaries.prisma.sh/all_commits/$engineHash/windows"
$enginesDir = Join-Path $BackendPath "node_modules\@prisma\engines"

# Prisma 5 on Windows expects platform-suffixed binary names:
#   schema-engine-windows.exe  and  query_engine-windows.dll.node
$files = @(
    @{ gz = "schema-engine.exe.gz";     destName = "schema-engine-windows.exe"      },
    @{ gz = "query_engine.dll.node.gz"; destName = "query_engine-windows.dll.node"  }
)

foreach ($f in $files) {
    $dest = Join-Path $enginesDir $f.destName
    if (Test-Path $dest) {
        Write-Host "  $($f.destName) already present, skipping." -ForegroundColor Gray
        continue
    }

    $gzPath = Join-Path $env:TEMP $f.gz
    $url    = "$baseUrl/$($f.gz)"

    Write-Host "  Downloading $($f.gz) ..." -ForegroundColor Yellow
    try {
        Download-File -Url $url -OutFile $gzPath
    } catch {
        Write-Host ""
        Write-Host "  FAILED: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "  The corporate proxy is blocking the download." -ForegroundColor Yellow
        Write-Host "  Options to fix this:" -ForegroundColor Yellow
        Write-Host "    1. Connect to a network without a proxy (e.g. mobile hotspot) and re-run .\setup.ps1" -ForegroundColor Yellow
        Write-Host "    2. Ask your IT team to whitelist: binaries.prisma.sh" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  Decompressing ..." -ForegroundColor Yellow
    Expand-Gz -GzPath $gzPath -OutPath $dest
    Remove-Item $gzPath -Force
    Write-Host "  OK -> $dest" -ForegroundColor Green
}

$schemaEngine = Join-Path $enginesDir "schema-engine-windows.exe"
$queryEngine  = Join-Path $enginesDir "query_engine-windows.dll.node"

# --- Also copy into locations Prisma 5 CLI additionally checks ---
$prismaDir = Join-Path $BackendPath "node_modules\prisma"
$dotPrisma = Join-Path $BackendPath "node_modules\.prisma\client"
if (-not (Test-Path $dotPrisma)) { New-Item $dotPrisma -ItemType Directory -Force | Out-Null }

$schemaDest = Join-Path $prismaDir "schema-engine-windows.exe"
if ((Test-Path $schemaEngine) -and -not (Test-Path $schemaDest)) {
    Copy-Item $schemaEngine $schemaDest
    Write-Host "  Copied schema-engine-windows.exe -> node_modules\prisma\" -ForegroundColor Gray
}

$queryDest = Join-Path $dotPrisma "query_engine-windows.dll.node"
if ((Test-Path $queryEngine) -and -not (Test-Path $queryDest)) {
    Copy-Item $queryEngine $queryDest
    Write-Host "  Copied query_engine-windows.dll.node -> node_modules\.prisma\client\" -ForegroundColor Gray
}

# --- Set env vars Prisma 5 respects (absolute paths) ---
$env:PRISMA_SCHEMA_ENGINE_PATH              = (Resolve-Path $schemaEngine).Path
$env:PRISMA_QUERY_ENGINE_LIBRARY            = (Resolve-Path $queryEngine).Path
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"
$env:PRISMA_CLI_QUERY_ENGINE_TYPE           = "library"

Write-Host "Prisma engines ready." -ForegroundColor Green