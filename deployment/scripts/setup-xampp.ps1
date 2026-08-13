Param(
    [switch]$Force
)

Write-Host "Running XAMPP setup for Delivery Portal..."

Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Definition)

function Check-Command($name) {
    $which = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $which) { Write-Host "ERROR: $name not found in PATH" -ForegroundColor Red; return $false }
    Write-Host "$name: $($which.Source)" -ForegroundColor Green
    return $true
}

Write-Host "Checking required tools..."
Check-Command php | Out-Null
Check-Command composer | Out-Null
Check-Command node | Out-Null
Check-Command npm | Out-Null
Check-Command mysql | Out-Null

Write-Host "Installing PHP dependencies (composer)..."
Push-Location "..\backend"
composer install --no-interaction --optimize-autoloader
composer dump-autoload -o

Write-Host "Installing frontend dependencies..."
Push-Location "..\frontend"
npm install
npm run build
Pop-Location

Write-Host "Preparing backend environment..."
Push-Location "..\backend"
if (-not (Test-Path .env) -or $Force) { Copy-Item .env.example .env -Force }
php artisan key:generate
php artisan storage:link

Write-Host "Importing database schema (MySQL) -- ensure MySQL is running and 'root' has no password"
$schema = Join-Path (Get-Location) "database\schema\mysql-schema.sql"
if (Test-Path $schema) {
    & mysql -u root -e "CREATE DATABASE IF NOT EXISTS delivery_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    & mysql -u root delivery_portal < $schema
} else { Write-Host "Schema file not found: $schema" -ForegroundColor Yellow }

Write-Host "Seeding database..."
php artisan db:seed --force

Write-Host "Optimizing application..."
php artisan optimize || Write-Host "Optimize failed (non-fatal)" -ForegroundColor Yellow

Pop-Location

Write-Host "Setup complete. Please restart Apache from XAMPP Control Panel if you changed PHP module settings."
