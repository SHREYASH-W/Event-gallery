# Disk Cleanup Script for Windows
# Run as Administrator for best results

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Windows Disk Cleanup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "   Some cleanup operations may be skipped" -ForegroundColor Yellow
    Write-Host ""
}

# Get initial free space
$drive = Get-PSDrive C
$initialFree = [math]::Round($drive.Free/1GB, 2)
Write-Host "📊 Initial free space on C: $initialFree GB" -ForegroundColor White
Write-Host ""

# 1. Empty Recycle Bin
Write-Host "🗑️  Emptying Recycle Bin..." -ForegroundColor Green
try {
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Recycle Bin emptied" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠️  Could not empty Recycle Bin" -ForegroundColor Yellow
}

# 2. Clear User Temp Files
Write-Host "🗑️  Clearing user temp files..." -ForegroundColor Green
try {
    $tempPath = "$env:TEMP\*"
    Remove-Item -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ User temp files cleared" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠️  Some temp files could not be deleted (may be in use)" -ForegroundColor Yellow
}

# 3. Clear Windows Temp Files
if ($isAdmin) {
    Write-Host "🗑️  Clearing Windows temp files..." -ForegroundColor Green
    try {
        Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Windows temp files cleared" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Some Windows temp files could not be deleted" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping Windows temp files (requires admin)" -ForegroundColor Yellow
}

# 4. Clear Windows Update Cache
if ($isAdmin) {
    Write-Host "🗑️  Clearing Windows Update cache..." -ForegroundColor Green
    try {
        Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Remove-Item -Path "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
        Start-Service -Name wuauserv -ErrorAction SilentlyContinue
        Write-Host "   ✓ Windows Update cache cleared" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Could not clear Windows Update cache" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping Windows Update cache (requires admin)" -ForegroundColor Yellow
}

# 5. Clear browser caches (if paths exist)
Write-Host "🗑️  Clearing browser caches..." -ForegroundColor Green

# Chrome
$chromePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
if (Test-Path $chromePath) {
    try {
        Remove-Item -Path "$chromePath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Chrome cache cleared" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Chrome cache in use (close Chrome first)" -ForegroundColor Yellow
    }
}

# Edge
$edgePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
if (Test-Path $edgePath) {
    try {
        Remove-Item -Path "$edgePath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Edge cache cleared" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Edge cache in use (close Edge first)" -ForegroundColor Yellow
    }
}

# 6. Find large files
Write-Host ""
Write-Host "🔍 Finding large files on C: drive..." -ForegroundColor Green
Write-Host "   (This may take a minute...)" -ForegroundColor Gray

try {
    $largeFiles = Get-ChildItem -Path C:\ -Recurse -File -ErrorAction SilentlyContinue | 
        Where-Object {$_.Length -gt 500MB} | 
        Sort-Object Length -Descending | 
        Select-Object -First 10 | 
        Select-Object FullName, @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}}
    
    if ($largeFiles) {
        Write-Host ""
        Write-Host "   Top 10 large files found:" -ForegroundColor Cyan
        $largeFiles | Format-Table -AutoSize
        Write-Host "   💡 Consider moving these to D: drive" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ No very large files found (>500MB)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Could not scan for large files" -ForegroundColor Yellow
}

# 7. Check node_modules folders
Write-Host ""
Write-Host "🔍 Looking for node_modules folders on C:..." -ForegroundColor Green

try {
    $nodeModules = Get-ChildItem -Path C:\ -Directory -Recurse -ErrorAction SilentlyContinue -Depth 3 | 
        Where-Object {$_.Name -eq "node_modules"}
    
    if ($nodeModules) {
        Write-Host "   Found $($nodeModules.Count) node_modules folders:" -ForegroundColor Cyan
        foreach ($folder in $nodeModules | Select-Object -First 5) {
            $size = (Get-ChildItem $folder.FullName -Recurse -File -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum / 1GB
            Write-Host "   • $($folder.FullName) - $([math]::Round($size, 2)) GB" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "   💡 You can delete unused node_modules folders" -ForegroundColor Yellow
        Write-Host "   💡 Run 'npm install' to restore them when needed" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ No node_modules folders found" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Could not scan for node_modules" -ForegroundColor Yellow
}

# Get final free space
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
$drive = Get-PSDrive C
$finalFree = [math]::Round($drive.Free/1GB, 2)
$recovered = [math]::Round($finalFree - $initialFree, 2)

Write-Host "📊 Final free space on C: $finalFree GB" -ForegroundColor Green
if ($recovered -gt 0) {
    Write-Host "✅ Recovered: $recovered GB" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Space change: $recovered GB" -ForegroundColor Yellow
}
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Recommendations
Write-Host "💡 Additional Recommendations:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run Windows Disk Cleanup:" -ForegroundColor White
Write-Host "   • Press Win+R, type 'cleanmgr', press Enter" -ForegroundColor Gray
Write-Host "   • Select C: drive, check all boxes" -ForegroundColor Gray
Write-Host "   • Click 'Clean up system files'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Enable Storage Sense:" -ForegroundColor White
Write-Host "   • Settings → System → Storage" -ForegroundColor Gray
Write-Host "   • Turn on 'Storage Sense'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Uninstall unused programs:" -ForegroundColor White
Write-Host "   • Settings → Apps → Apps & Features" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Move files to D: drive:" -ForegroundColor White
Write-Host "   • Documents, Downloads, Videos, etc." -ForegroundColor Gray
Write-Host ""

if ($finalFree -lt 10) {
    Write-Host "⚠️  Warning: Less than 10 GB free on C:" -ForegroundColor Red
    Write-Host "   Docker needs at least 10 GB to run smoothly" -ForegroundColor Red
    Write-Host "   Please free up more space using the recommendations above" -ForegroundColor Red
} else {
    Write-Host "✅ You have enough space to install Docker Desktop!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
