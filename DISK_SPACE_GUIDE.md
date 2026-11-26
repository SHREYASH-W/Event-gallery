# Disk Space Management Guide

Your system has **limited space on C: drive (1.47 GB)** but plenty on D: drive (243 GB). This guide helps you free up space and optimize for Docker.

## Current Situation

```
C: Drive - System Drive
├── Used: 132.37 GB
├── Free: 1.47 GB ⚠️
└── Total: ~134 GB

D: Drive - Data Drive  
├── Used: 98.38 GB
├── Free: 243.42 GB ✅
└── Total: ~342 GB
```

**Docker Requirement**: ~5-10 GB free on C: drive

## Quick Space Recovery

### Option 1: Automated Cleanup Script ⚡

```powershell
# Run this script (as Administrator for best results)
.\cleanup-disk.ps1
```

**What it does:**
- Empties Recycle Bin
- Clears temp files (Windows + User)
- Clears browser caches
- Clears Windows Update cache
- Finds large files you can move
- Shows node_modules folders

**Expected recovery**: 2-5 GB

### Option 2: Manual Steps (High Impact)

#### 1. Windows Disk Cleanup (2-3 GB)

```powershell
# Run Disk Cleanup utility
cleanmgr /sagerun:1
```

Or GUI:
- Press Win + R
- Type `cleanmgr`
- Select C: drive
- Check ALL boxes
- Click "Clean up system files"
- Check ALL boxes again
- OK

#### 2. Move User Folders to D: (5-20 GB)

**Downloads Folder:**
```powershell
# Check size first
Get-ChildItem "C:\Users\Shreyash\Downloads" -Recurse | 
  Measure-Object -Property Length -Sum | 
  Select-Object @{Name="GB";Expression={[math]::Round($_.Sum/1GB,2)}}

# Move to D: drive
New-Item -Path "D:\Users\Shreyash\Downloads" -ItemType Directory -Force
Move-Item "C:\Users\Shreyash\Downloads\*" "D:\Users\Shreyash\Downloads\" -Force

# Update Windows to point to new location
# Right-click Downloads folder → Properties → Location → Move
```

**Documents Folder:**
```powershell
# Check size
Get-ChildItem "C:\Users\Shreyash\Documents" -Recurse | 
  Measure-Object -Property Length -Sum | 
  Select-Object @{Name="GB";Expression={[math]::Round($_.Sum/1GB,2)}}

# Move to D:
New-Item -Path "D:\Users\Shreyash\Documents" -ItemType Directory -Force
Move-Item "C:\Users\Shreyash\Documents\*" "D:\Users\Shreyash\Documents\" -Force
```

**Videos/Music Folders:**
Similar process - these are often large

#### 3. Clear Windows Update Cache (1-2 GB)

```powershell
# Stop Windows Update service
Stop-Service -Name wuauserv -Force

# Clear cache
Remove-Item "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force

# Start service again
Start-Service -Name wuauserv
```

#### 4. Find and Remove Large Files

```powershell
# Find files larger than 1 GB on C:
Get-ChildItem -Path C:\ -Recurse -File -ErrorAction SilentlyContinue | 
  Where-Object {$_.Length -gt 1GB} | 
  Sort-Object Length -Descending | 
  Select-Object FullName, @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}} | 
  Format-Table -AutoSize

# Move large files to D:
# Example: Move-Item "C:\path\to\large-file.iso" "D:\LargeFiles\"
```

#### 5. Uninstall Unused Programs

```powershell
# List installed programs by size
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Select-Object DisplayName, DisplayVersion, InstallDate, EstimatedSize |
  Where-Object {$_.EstimatedSize -gt 100000} |
  Sort-Object EstimatedSize -Descending |
  Format-Table -AutoSize
```

Or use GUI:
- Settings → Apps → Apps & features
- Sort by Size
- Uninstall what you don't use

**Common space hogs:**
- Old Visual Studio installations
- Adobe Creative Cloud
- Games
- Old software you no longer use

#### 6. Clear node_modules Folders

```powershell
# Find all node_modules folders on C:
Get-ChildItem -Path C:\ -Directory -Recurse -ErrorAction SilentlyContinue -Depth 4 | 
  Where-Object {$_.Name -eq "node_modules"} |
  Select-Object FullName, @{Name="SizeGB";Expression={
    [math]::Round(((Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
    Measure-Object -Property Length -Sum).Sum / 1GB), 2)
  }} |
  Sort-Object SizeGB -Descending

# Delete old project node_modules (you can run npm install later)
# Example: Remove-Item "C:\path\to\old-project\node_modules" -Recurse -Force
```

**Note**: Don't delete node_modules from active projects!

#### 7. Browser Caches

**Chrome:**
```powershell
Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force
Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache\*" -Recurse -Force
```

**Edge:**
```powershell
Remove-Item "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*" -Recurse -Force
```

Or manually: Browser Settings → Privacy → Clear browsing data

#### 8. Windows.old Folder (If exists)

```powershell
# Check if Windows.old exists
if (Test-Path "C:\Windows.old") {
    Write-Host "Windows.old exists - this can be 10-20 GB!"
    # To remove it:
    # Settings → System → Storage → Temporary files → Previous Windows installation
}
```

### Option 3: Enable Storage Sense (Automatic)

1. Settings → System → Storage
2. Turn ON "Storage Sense"
3. Configure "Storage Sense":
   - Delete files in Recycle Bin older than: 14 days
   - Delete files in Downloads folder: Never
   - Delete temporary files: 1 day
4. Run Storage Sense now

## Docker-Specific Optimizations

### Configure Docker to Use D: Drive

**After installing Docker Desktop:**

1. Open Docker Desktop
2. Settings (gear icon)
3. Resources → Advanced
4. Change "Disk image location": `D:\Docker`
5. Apply & Restart

This moves all Docker images, containers, and volumes to D: drive.

### WSL 2 on D: Drive (If using WSL 2)

```powershell
# Move WSL to D: drive
wsl --shutdown
wsl --export Ubuntu D:\WSL\Ubuntu.tar
wsl --unregister Ubuntu
wsl --import Ubuntu D:\WSL\ D:\WSL\Ubuntu.tar --version 2
```

## Space Requirements Breakdown

### Celebrare Project

```
Local Setup (without Docker):
├── node_modules: ~200 MB
├── frontend/node_modules: ~300 MB
├── PostgreSQL data: ~50 MB
└── Total: ~550 MB

Docker Setup:
├── Docker Desktop: ~2 GB
├── Node.js image: ~1 GB
├── PostgreSQL image: ~300 MB
├── Container data: ~500 MB
└── Total: ~4 GB (but can be on D: drive)
```

### Minimum Requirements

For comfortable development:

```
C: Drive Minimum:
├── Docker Desktop: 2 GB (if installed on C:)
├── Working space: 2 GB
├── Windows updates: 2 GB reserve
├── Temp files: 1 GB
└── Buffer: 3 GB
Total: 10 GB minimum

With Docker on D:
├── Docker Desktop: 2 GB (C:)
├── Working space: 2 GB
├── Buffer: 3 GB  
└── Total: 7 GB on C: (images on D:)
```

## Quick Check Commands

```powershell
# Check C: drive space
Get-PSDrive C | Select-Object @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}

# Top 10 largest folders on C:
Get-ChildItem C:\ -Directory | 
  Where-Object {$_.Name -notlike "System Volume Information"} |
  ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
      Measure-Object -Property Length -Sum).Sum / 1GB
    [PSCustomObject]@{
      Folder = $_.FullName
      SizeGB = [math]::Round($size, 2)
    }
  } | 
  Sort-Object SizeGB -Descending | 
  Select-Object -First 10 |
  Format-Table -AutoSize

# Total size by file type
Get-ChildItem C:\ -Recurse -File -ErrorAction SilentlyContinue |
  Group-Object Extension |
  Select-Object Name, @{Name="SizeGB";Expression={[math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1GB, 2)}} |
  Sort-Object SizeGB -Descending |
  Select-Object -First 10 |
  Format-Table -AutoSize
```

## Space Freed - Expected Results

| Action | Expected Space Freed |
|--------|---------------------|
| Recycle Bin | 100 MB - 1 GB |
| Temp files | 500 MB - 2 GB |
| Windows Update cache | 1 GB - 3 GB |
| Disk Cleanup | 2 GB - 5 GB |
| Browser caches | 500 MB - 2 GB |
| Uninstall programs | 1 GB - 10 GB |
| Move Downloads | 2 GB - 20 GB |
| Move Documents | 1 GB - 10 GB |
| Delete old node_modules | 500 MB - 5 GB |
| **Total Potential** | **10 GB - 50 GB** |

## Post-Cleanup

After cleanup, you should have:
- Minimum: 10 GB free
- Comfortable: 15+ GB free
- Ideal: 20+ GB free

## Maintenance Tips

1. **Enable Storage Sense** for automatic cleanup
2. **Regular cleanups** - Monthly run `cleanup-disk.ps1`
3. **Keep files on D:** - Use D: for downloads, documents, projects
4. **Uninstall promptly** - Remove programs you no longer use
5. **Clear temp regularly** - `%temp%` folder can grow large
6. **Monitor space** - Check weekly with `Get-PSDrive C`

## If Still Not Enough Space

### Alternative 1: Use Local PostgreSQL (No Docker DB)

You can run only the backend in Docker and use local PostgreSQL:

```bash
docker run -d \
  --name celebrare-backend \
  -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  celebrare-backend
```

Saves ~1 GB (no PostgreSQL image)

### Alternative 2: Skip Docker Entirely

The project works perfectly without Docker:

```bash
# Traditional setup
npm install
npm run setup-db
npm run seed
npm run dev
```

Requires only ~1 GB total

### Alternative 3: Upgrade C: Drive

If you frequently need Docker, consider:
- Moving Windows to larger drive
- Using partition management tools
- Adding SSD for Windows

## Summary

**Your situation:**
- C: 1.47 GB free ⚠️
- D: 243 GB free ✅

**Goal:**
- Get C: to 10+ GB free

**Best actions:**
1. Run `cleanup-disk.ps1` → 2-5 GB
2. Windows Disk Cleanup → 2-3 GB  
3. Move Downloads to D: → 2-10 GB
4. Install Docker on C:, images on D: ✅

**After cleanup:**
- Configure Docker to use D: drive for images
- Keep only system files on C:
- Keep all projects and data on D:

---

**Start here:** `.\cleanup-disk.ps1`  
**Then:** Follow DOCKER_QUICKSTART.md
