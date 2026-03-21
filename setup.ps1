Write-Host "🚀 ORIN Setup Script" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Check if Bun is installed
try {
    $bunVersion = bun --version 2>&1
    Write-Host "✅ Bun found: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Bun is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install Oven.Bun" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Backend Setup
Write-Host "📦 Setting up Backend..." -ForegroundColor Blue
Set-Location backend

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit backend/.env and add your API keys" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env already exists" -ForegroundColor Green
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
bun install

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
bunx prisma generate

Set-Location ..

Write-Host ""

# Frontend Setup
Write-Host "📦 Setting up Frontend..." -ForegroundColor Blue
Set-Location frontend

if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" | Out-File -FilePath .env.local -Encoding utf8
} else {
    Write-Host "✅ .env.local already exists" -ForegroundColor Green
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
bun install

Set-Location ..

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Edit backend/.env and add your API keys:" -ForegroundColor White
Write-Host "      - GEMINI_API_KEY" -ForegroundColor Gray
Write-Host "      - NOTION_API_KEY" -ForegroundColor Gray
Write-Host "      - NOTION_DATABASE_ID" -ForegroundColor Gray
Write-Host "      - DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Start the backend:" -ForegroundColor White
Write-Host "      cd backend" -ForegroundColor Gray
Write-Host "      bun run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Start the frontend (in a new terminal):" -ForegroundColor White
Write-Host "      cd frontend" -ForegroundColor Gray
Write-Host "      bun run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Open http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Happy building with ORIN!" -ForegroundColor Green
