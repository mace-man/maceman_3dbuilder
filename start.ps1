# mace-man 3D Builder Launcher (PowerShell)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting mace-man 3D Builder..." -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (First time setup)..." -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies."
        exit $LASTEXITCODE
    }
}

Write-Host "Opening browser at http://localhost:3000/ ..." -ForegroundColor Green
Start-Process "http://localhost:3000/"

Write-Host "Starting local Vite server..." -ForegroundColor Green
& npm.cmd run dev
