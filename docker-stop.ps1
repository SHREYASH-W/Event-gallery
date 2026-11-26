# Docker Stop Script for Celebrare

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Celebrare UPI Payments - Docker Shutdown" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🛑 Stopping containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Containers stopped successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start again, run: .\docker-start.ps1" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Error stopping containers" -ForegroundColor Red
}

Write-Host ""
