# Docker Quick Start - 5 Minutes ⚡

Get the Celebrare backend running with Docker in just 5 minutes!

## ⚠️ Current Status: Low Disk Space

Your C: drive has only **1.47 GB free**. Docker needs ~5-10 GB.

**Choose your path:**

## Path 1: Free Up Space First (Recommended)

### Step 1: Run Cleanup Script (3 minutes)

```powershell
# Run as Administrator
.\cleanup-disk.ps1
```

This will:
- Empty Recycle Bin
- Clear temp files
- Clear browser caches
- Find large files you can move
- Show recommendations

**Target**: Get at least 10 GB free on C:

### Step 2: Manual Cleanup (if needed)

1. **Windows Disk Cleanup**
   - Press Win + R → type `cleanmgr` → Enter
   - Select C: drive → Check all boxes
   - Click "Clean up system files"
   - Expected: 2-5 GB freed

2. **Move Downloads/Documents to D:**
   ```powershell
   # Check Downloads folder size
   Get-ChildItem "C:\Users\Shreyash\Downloads" -Recurse | 
     Measure-Object -Property Length -Sum | 
     Select-Object @{Name="SizeGB";Expression={[math]::Round($_.Sum/1GB,2)}}
   
   # Move to D: drive
   Move-Item "C:\Users\Shreyash\Downloads\*" "D:\Downloads\"
   ```

3. **Uninstall Unused Programs**
   - Settings → Apps → Apps & Features
   - Look for large programs you don't use

### Step 3: Install Docker Desktop

1. **Download**: https://www.docker.com/products/docker-desktop/
2. **Install**: Run installer, enable WSL 2
3. **Configure to use D: drive**:
   - Open Docker Desktop
   - Settings → Resources → Advanced
   - Change "Disk image location" to `D:\Docker`
   - Click "Apply & Restart"

4. **Verify**:
   ```powershell
   docker --version
   docker-compose --version
   ```

## Path 2: Use Existing PostgreSQL (Skip Docker DB)

If you can't free up enough space, use Docker for backend only with your local PostgreSQL:

### Setup

1. **Install Docker Desktop** (smaller footprint without database images)

2. **Modify docker-compose**:
   ```bash
   # Use this simplified version
   docker-compose -f docker-compose.backend-only.yml up -d
   ```

3. **Or run directly**:
   ```bash
   docker build -t celebrare-backend .
   
   docker run -d \
     --name celebrare-backend \
     -p 3000:3000 \
     -e DB_HOST=host.docker.internal \
     -e DB_PORT=5432 \
     -e DB_NAME=celebrare_upi \
     -e DB_USER=postgres \
     -e DB_PASSWORD=your_password \
     celebrare-backend
   ```

## Once Docker is Installed

### Quick Start Commands

```bash
# Navigate to project
cd "d:\celebrare assignment"

# Start backend + PostgreSQL with Docker
docker-compose -f docker-compose.dev.yml up -d

# Or use the script
.\docker-start.ps1

# Check status
docker ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

### Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Test Panel: http://localhost:5173/test

### Stop Everything

```bash
# Stop Docker containers
docker-compose -f docker-compose.dev.yml down

# Or use script
.\docker-stop.ps1
```

## Comparison: Docker vs Local

| Feature | Docker | Local |
|---------|--------|-------|
| **Setup Time** | 5 min (after Docker install) | 10 min |
| **PostgreSQL** | Included | Need to install separately |
| **Isolation** | ✅ Fully isolated | ❌ Shares with system |
| **Cleanup** | Easy (`docker-compose down`) | Manual |
| **Disk Space** | ~5 GB on C: | ~1 GB |
| **Resources** | ~2 GB RAM | ~500 MB RAM |
| **Port Conflicts** | Less likely | More likely |

## Troubleshooting

### "Docker daemon not running"

**Solution**: Start Docker Desktop application

### "Port 5432 already in use"

**Solution**: Stop local PostgreSQL first
```powershell
net stop postgresql-x64-14
```

### "Not enough space"

**Solutions**:
1. Run `cleanup-disk.ps1`
2. Configure Docker to use D: drive
3. Use backend-only Docker (with local PostgreSQL)
4. Stick with local setup (no Docker)

### "Cannot connect to database"

**Solution**: Wait 30 seconds for database initialization
```bash
# Check if database is ready
docker-compose -f docker-compose.dev.yml logs postgres

# Should see: "database system is ready to accept connections"
```

## Commands Cheat Sheet

```bash
# Start
docker-compose -f docker-compose.dev.yml up -d

# Stop
docker-compose -f docker-compose.dev.yml down

# Logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart
docker-compose -f docker-compose.dev.yml restart

# Remove everything (including database data)
docker-compose -f docker-compose.dev.yml down -v

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml up --build

# Access database
docker exec -it celebrare-db-dev psql -U postgres -d celebrare_upi

# Check disk usage
docker system df

# Clean up unused images/containers
docker system prune -a
```

## What's Running?

After `docker-compose up -d`:

```
Container: celebrare-db-dev
  - PostgreSQL 14
  - Port: 5432
  - Volume: Persistent data storage
  
Container: celebrare-backend-dev
  - Node.js Express API
  - Port: 3000
  - Auto-restarts on code changes (nodemon)
  - Connected to celebrare-db-dev
```

Frontend still runs locally (not in Docker) for faster development.

## Daily Workflow

```bash
# Morning - Start work
cd "d:\celebrare assignment"
docker-compose -f docker-compose.dev.yml up -d
cd frontend && npm run dev

# Edit code...
# Backend auto-restarts on changes
# Frontend hot-reloads on changes

# Evening - Stop work
docker-compose -f docker-compose.dev.yml down
```

## Recommended: Configure Docker for D: Drive

This saves C: drive space:

1. Open Docker Desktop
2. Settings → Resources → Advanced
3. Disk image location: `D:\Docker`
4. Apply & Restart

This moves all Docker images and containers to D: drive.

## Need Help?

1. **Disk Space Issues**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)
2. **Docker Basics**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)
3. **General Setup**: See [QUICKSTART.md](QUICKSTART.md)
4. **Full Docs**: See [README.md](README.md)

## Summary

**Before Docker:**
```bash
1. Install PostgreSQL ⏰
2. Configure database ⏰
3. Create database ⏰
4. Seed data ⏰
5. Start server ⏰
```

**With Docker:**
```bash
1. docker-compose up -d ⚡
```

That's it! Database is created, seeded, and ready automatically.

---

**Next Steps:**
1. Run `cleanup-disk.ps1` to free up space
2. Install Docker Desktop
3. Run `.\docker-start.ps1`
4. Start coding! 🚀
