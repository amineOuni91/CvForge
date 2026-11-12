# Publishes CvForge as a desktop app: the API and the Angular front in one folder, started by a Desktop shortcut.
# Usage (from any folder):  powershell -ExecutionPolicy Bypass -File publish.ps1 [-Target <folder>]
# Run it again after a change: it stops the published app, rebuilds it and keeps the same shortcut.
# Port (5290, dev stays on 5145/4200) and browser opening are set in backend/CvForge.Api/appsettings.Production.json.
# Outside AppData on purpose: packaged apps (such as the Claude desktop app) see a private copy of AppData.
# Needs SQL Server running, the ASP.NET Core 10 runtime and Playwright's Chromium (already installed for dev).
param([string]$Target = "$env:USERPROFILE\CvForge\app")

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# The published app locks its files while it runs
Get-Process CvForge.Api -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Target*" } | Stop-Process -Force

Push-Location (Join-Path $root 'frontend')
try { npx ng build; if ($LASTEXITCODE) { throw 'ng build failed' } } finally { Pop-Location }

dotnet publish (Join-Path $root 'backend\CvForge.Api') -c Release -o $Target
if ($LASTEXITCODE) { throw 'dotnet publish failed' }

# Angular build served by the API from wwwroot
$www = Join-Path $Target 'wwwroot'
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
Copy-Item (Join-Path $root 'frontend\dist\frontend\browser') $www -Recurse

# Desktop shortcut: console window minimized (closing it stops the app), icon of the executable (app.ico)
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'CvForge.lnk'))
$shortcut.TargetPath = Join-Path $Target 'CvForge.Api.exe'
$shortcut.WorkingDirectory = $Target
$shortcut.WindowStyle = 7
$shortcut.IconLocation = (Join-Path $Target 'CvForge.Api.exe') + ',0'
$shortcut.Description = 'CvForge'
$shortcut.Save()

Write-Host "Published to $Target, shortcut: $(Join-Path $desktop 'CvForge.lnk')"
