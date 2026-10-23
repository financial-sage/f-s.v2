# Wipe local Supabase app data; keep only is_superadmin users.
# Requires: Docker + local stack (supabase start).
#
#   npm run db:wipe-local
#   .\scripts\wipe-local-keep-superadmins.ps1

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = (Get-Location).Path }

$SqlPath = Join-Path $PSScriptRoot "wipe-local-keep-superadmins.sql"
$Container = if ($env:SUPABASE_DB_CONTAINER) {
  $env:SUPABASE_DB_CONTAINER
} else {
  "supabase_db_financial-sage-pwa"
}

if (-not (Test-Path $SqlPath)) {
  Write-Error "SQL not found: $SqlPath"
}

$running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $Container }
if (-not $running) {
  Write-Error "Container '$Container' is not running. Start with: npx supabase start"
}

Write-Host "Wiping local DB in '$Container' (keeping is_superadmin)..." -ForegroundColor Yellow
Get-Content -Raw -Path $SqlPath | docker exec -i $Container psql -U postgres -d postgres
if ($LASTEXITCODE -ne 0) {
  Write-Error "psql exited with code $LASTEXITCODE"
}

Write-Host "Done. Admins kept; families/expenses/accounts/funds cleared." -ForegroundColor Green
Write-Host "Tip: clear site data / localStorage for a clean first-run in the browser." -ForegroundColor DarkGray
