<#
  EZIDINET - run the project locally on Windows 10/11 (development only).

  What it does (nothing is deleted, existing .env files are never overwritten):
    1. Checks Node.js (22 LTS or newer) and npm.
    2. Finds a database: Docker Desktop (docker compose) or an installed PostgreSQL 16.
    3. Creates apps/api/.env and apps/web/.env.local ONLY if they are missing,
       with freshly generated random local secrets (never committed: .env* is in .gitignore).
    4. npm install, builds the relationship engine, generates the Prisma client,
       applies migrations and seeds relationship types (+ demo data in development).
    5. Starts the API (port 4000) and the website (port 3000) in two windows
       and opens http://localhost:3000 in the browser.

  Usage (PowerShell, inside the family-tree-network folder):
    powershell -ExecutionPolicy Bypass -File scripts\windows\start-local.ps1
  Options:
    -SkipInstall   skip "npm install" (faster on later runs)
    -NoDemo        do not create demo accounts
#>
param([switch]$SkipInstall, [switch]$NoDemo)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $Root

function Say($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Fail($t) { Write-Host "`n[X] $t" -ForegroundColor Red; exit 1 }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function NewSecret { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' }
function PortBusy($p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }

# ---------- 1. Node.js ----------
Say 'Checking Node.js'
if (-not (Has 'node')) { Fail 'Node.js is not installed. Install "Node.js 22 LTS" from https://nodejs.org (or: winget install OpenJS.NodeJS.LTS), then open a NEW PowerShell window and run this script again.' }
$nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { Fail "Node.js $(node -v) is too old. EZIDINET needs Node.js 22 LTS or newer (https://nodejs.org)." }
Write-Host "Node.js $(node -v), npm $(npm -v)"

# ---------- 2. Database ----------
Say 'Checking the database (PostgreSQL)'
$dbUrl = 'postgresql://ftn:ftn_dev@localhost:5432/ftn?schema=public'
$dbReady = $false
if ((Has 'docker') -and (docker info 2>$null)) {
  Write-Host 'Docker Desktop found - starting the development database container.'
  docker compose up -d postgres
  if ($LASTEXITCODE -ne 0) { Fail 'docker compose could not start PostgreSQL. Is Docker Desktop running?' }
  for ($i = 0; $i -lt 30 -and -not $dbReady; $i++) {
    docker compose exec -T postgres pg_isready -U ftn *> $null
    if ($LASTEXITCODE -eq 0) { $dbReady = $true } else { Start-Sleep 2 }
  }
  if (-not $dbReady) { Fail 'PostgreSQL container did not become ready.' }
} else {
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $psql) {
    $cand = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if ($cand) { $psql = $cand.FullName } else { $psql = $null }
  } else { $psql = $psql.Source }
  if (-not $psql) {
    Write-Host 'Neither Docker Desktop nor PostgreSQL was found.' -ForegroundColor Yellow
    Write-Host 'Option A: install Docker Desktop (https://www.docker.com/products/docker-desktop/) and run this script again.'
    Write-Host 'Option B: install PostgreSQL 16 now with winget (free, ~300 MB). During setup you choose a password for the "postgres" user - remember it.'
    $ans = Read-Host 'Install PostgreSQL 16 with winget now? (y/n)'
    if ($ans -ne 'y') { Fail 'No database available. Install Docker Desktop or PostgreSQL 16, then run the script again.' }
    winget install --id PostgreSQL.PostgreSQL.16 -e --accept-package-agreements --accept-source-agreements
    $cand = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if (-not $cand) { Fail 'PostgreSQL was installed but psql.exe was not found. Open a new PowerShell window and run the script again.' }
    $psql = $cand.FullName
  }
  Write-Host "Using PostgreSQL: $psql"
  # Create the development role and databases once (asks for the password of the "postgres" admin user; it is not stored).
  $env:PGPASSWORD = 'ftn_dev'
  & $psql -h localhost -U ftn -d ftn -c 'select 1' *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Creating the local development user "ftn" and databases "ftn" / "ftn_test".'
    Remove-Item Env:PGPASSWORD
    $sec = Read-Host 'Password of the PostgreSQL "postgres" user (chosen during installation)' -AsSecureString
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    & $psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DO `$`$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='ftn') THEN CREATE ROLE ftn LOGIN PASSWORD 'ftn_dev' CREATEDB; END IF; END`$`$;"
    if ($LASTEXITCODE -ne 0) { Remove-Item Env:PGPASSWORD; Fail 'Could not connect as "postgres". Check the password and that the PostgreSQL service is running (services.msc).' }
    foreach ($db in 'ftn', 'ftn_test') {
      $exists = & $psql -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'"
      if ($exists -ne '1') { & $psql -h localhost -U postgres -d postgres -c "CREATE DATABASE $db OWNER ftn" | Out-Null }
    }
    Remove-Item Env:PGPASSWORD
  } else { Remove-Item Env:PGPASSWORD }
  $dbReady = $true
}
Write-Host 'Database ready.' -ForegroundColor Green

# ---------- 3. Environment files (created only if missing) ----------
Say 'Checking environment files'
$apiEnv = Join-Path $Root 'apps\api\.env'
if (-not (Test-Path $apiEnv)) {
  @"
# Local development only - generated by scripts/windows/start-local.ps1. Never commit this file.
DATABASE_URL=$dbUrl
JWT_SECRET=$(NewSecret)
QR_TOKEN_KEY=$(NewSecret)
PORT=4000
CORS_ORIGIN=http://localhost:3000
AUTH_RATE_LIMIT_PER_MINUTE=30
MAIL_TRANSPORT=outbox
APP_URL=http://localhost:3000
"@ | Set-Content -Path $apiEnv -Encoding ascii
  Write-Host 'Created apps\api\.env with new random local secrets.'
} else { Write-Host 'apps\api\.env exists - kept unchanged.' }
$webEnv = Join-Path $Root 'apps\web\.env.local'
if (-not (Test-Path $webEnv)) {
  @"
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SHOW_DEMO=$(if ($NoDemo) { 'false' } else { 'true' })
"@ | Set-Content -Path $webEnv -Encoding ascii
  Write-Host 'Created apps\web\.env.local.'
} else { Write-Host 'apps\web\.env.local exists - kept unchanged.' }
foreach ($k in 'DATABASE_URL', 'JWT_SECRET', 'QR_TOKEN_KEY', 'PORT', 'CORS_ORIGIN') {
  if (-not (Select-String -Path $apiEnv -Pattern "^$k=" -Quiet)) { Write-Host "Warning: $k is missing in apps\api\.env" -ForegroundColor Yellow }
}

# ---------- 4. Install, build, migrate, seed ----------
if (-not $SkipInstall) { Say 'Installing packages (npm install) - first run takes a few minutes'; npm install; if ($LASTEXITCODE -ne 0) { Fail 'npm install failed (see messages above).' } }
Say 'Building the relationship engine'
npm run build:engine; if ($LASTEXITCODE -ne 0) { Fail 'Engine build failed.' }
Say 'Generating the Prisma client'
npm exec -w @ftn/api -- prisma generate; if ($LASTEXITCODE -ne 0) { Fail 'prisma generate failed.' }
Say 'Applying database migrations'
$env:DATABASE_URL = (Select-String -Path $apiEnv -Pattern '^DATABASE_URL=(.*)$').Matches[0].Groups[1].Value
npm run db:migrate; if ($LASTEXITCODE -ne 0) { Fail 'Migrations failed - is PostgreSQL running and DATABASE_URL correct?' }
Say 'Seeding relationship types'
if ($NoDemo) { $env:SEED_DEMO = 'false' }
npm run db:seed; if ($LASTEXITCODE -ne 0) { Fail 'Seeding failed.' }
Remove-Item Env:SEED_DEMO -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue

# ---------- 5. Start servers ----------
foreach ($p in 3000, 4000) { if (PortBusy $p) { Fail "Port $p is already in use. Close the program using it (or an earlier EZIDINET window) and run again." } }
Say 'Starting API (http://localhost:4000) and website (http://localhost:3000) in two new windows'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='EZIDINET API'; Set-Location '$Root'; npm run dev:api"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='EZIDINET WEB'; Set-Location '$Root'; npm run dev:web"

Say 'Waiting for the servers'
$ok = $false
for ($i = 0; $i -lt 90 -and -not $ok; $i++) {
  Start-Sleep 2
  try {
    $a = Invoke-WebRequest 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 3
    $w = Invoke-WebRequest 'http://localhost:3000/' -UseBasicParsing -TimeoutSec 30
    if ($a.StatusCode -eq 200 -and $w.StatusCode -eq 200) { $ok = $true }
  } catch { }
}
if (-not $ok) { Fail 'The servers did not answer within 3 minutes. Check the two windows "EZIDINET API" and "EZIDINET WEB" for error messages.' }
Write-Host "`nEZIDINET is running:" -ForegroundColor Green
Write-Host '  Website:   http://localhost:3000'
Write-Host '  Platform:  http://localhost:3000/app'
Write-Host '  WORLD:     http://localhost:3000/world'
Write-Host '  Dev mail:  http://localhost:3000/dev/mailbox  (verification and reset e-mails in development)'
Write-Host '  API check: http://localhost:4000/api/health'
Write-Host 'To stop: close the two windows "EZIDINET API" and "EZIDINET WEB".'
Start-Process 'http://localhost:3000'
