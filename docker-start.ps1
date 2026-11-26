# Quick Docker Start Script for Celebrare

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Celebrare UPI Payments - Docker Startup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "🔍 Checking Docker..." -ForegroundColor Green
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "   ✓ Docker found: $dockerVersion" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Docker not found!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop first" -ForegroundColor Red
    Write-Host "   Visit: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if Docker daemon is running
Write-Host "🔍 Checking Docker daemon..." -ForegroundColor Green
try {
    docker ps 2>&1 | Out-Null
    Write-Host "   ✓ Docker daemon is running" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Docker daemon not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting backend containers..." -ForegroundColor Green
Write-Host ""

# Start Docker Compose
docker-compose -f docker-compose.dev.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "   ✅ Backend Started Successfully!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Container Status:" -ForegroundColor White
    docker ps --filter "name=celebrare" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    Write-Host "🌐 Services:" -ForegroundColor White
    Write-Host "   • Backend API: http://localhost:3000" -ForegroundColor Gray
    Write-Host "   • PostgreSQL:  localhost:5432" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Wait 20-30 seconds for database setup" -ForegroundColor Gray
    Write-Host "   2. Open new terminal and run:" -ForegroundColor Gray
    Write-Host "      cd frontend" -ForegroundColor Yellow
    Write-Host "      npm run dev" -ForegroundColor Yellow
    Write-Host "   3. Visit http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Useful Commands:" -ForegroundColor Cyan
    Write-Host "   • View logs:    docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor Gray
    Write-Host "   • Stop:         docker-compose -f docker-compose.dev.yml down" -ForegroundColor Gray
    Write-Host "   • Restart:      docker-compose -f docker-compose.dev.yml restart" -ForegroundColor Gray
    Write-Host ""
    
    # Ask if user wants to see logs
    Write-Host "Would you like to view logs? (Y/N): " -ForegroundColor Yellow -NoNewline
    $viewLogs = Read-Host
    
    if ($viewLogs -eq "Y" -or $viewLogs -eq "y") {
        Write-Host ""
        Write-Host "📋 Showing container logs (Ctrl+C to exit)..." -ForegroundColor Green
        Write-Host ""
        docker-compose -f docker-compose.dev.yml logs -f
    }
} else {
    Write-Host ""
    Write-Host "❌ Failed to start containers!" -ForegroundColor Red
    Write-Host "   Check error messages above" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
