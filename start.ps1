# TalkingHead Avatar - Quick Start Script
# Run this script to set up and start the application

Write-Host "🚀 TalkingHead Avatar - Quick Start Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Check for .env file
Write-Host ""
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  IMPORTANT: Edit .env and add your OPENAI_API_KEY!" -ForegroundColor Red
    Write-Host "   Get your API key from: https://platform.openai.com/api-keys" -ForegroundColor Yellow
    
    # Open .env in default editor
    Start-Process notepad.exe ".env"
    
    Write-Host ""
    Write-Host "Press any key after you've added your API key..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Verify API key is set
$envContent = Get-Content ".env" -Raw
if ($envContent -match "OPENAI_API_KEY=sk-") {
    Write-Host "✅ OpenAI API key configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: OpenAI API key may not be configured correctly" -ForegroundColor Yellow
}

# Create required directories
Write-Host ""
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "public/modules" | Out-Null
New-Item -ItemType Directory -Force -Path "public/avatars" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Check for TalkingHead library
Write-Host ""
Write-Host "🎭 Checking TalkingHead library..." -ForegroundColor Yellow
if (-not (Test-Path "public/modules/talkinghead.mjs")) {
    Write-Host "❌ TalkingHead library not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "MANUAL STEP REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/met4citizen/TalkingHead" -ForegroundColor White
    Write-Host "2. Download the repository" -ForegroundColor White
    Write-Host "3. Copy 'talkinghead.mjs' to 'public/modules/'" -ForegroundColor White
    Write-Host ""
    Write-Host "See public/modules/README.md for detailed instructions" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Do you want to open the TalkingHead GitHub page? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process "https://github.com/met4citizen/TalkingHead"
    }
    Write-Host ""
    Write-Host "Press any key after you've installed TalkingHead..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "✅ TalkingHead library found" -ForegroundColor Green
}

# Final verification
Write-Host ""
Write-Host "🔍 Running final checks..." -ForegroundColor Yellow
$allGood = $true

if (-not (Test-Path "public/modules/talkinghead.mjs")) {
    Write-Host "❌ TalkingHead library still missing" -ForegroundColor Red
    $allGood = $false
}

$envContent = Get-Content ".env" -Raw
if (-not ($envContent -match "OPENAI_API_KEY=sk-\w+")) {
    Write-Host "⚠️  OpenAI API key may not be valid" -ForegroundColor Yellow
}

# Start the server
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ Setup complete! Starting server..." -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Server will start at:" -ForegroundColor Cyan
    Write-Host "   HTTP: http://localhost:3000" -ForegroundColor White
    Write-Host "   WebSocket: ws://localhost:8080" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Start in development mode
    npm run dev
} else {
    Write-Host "⚠️  Please complete the manual steps above before starting" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "When ready, run: npm run dev" -ForegroundColor Cyan
}
