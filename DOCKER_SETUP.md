# Docker Setup Guide

This guide will help you set up Docker for the Celebrare backend and free up space on your C: drive.

## Current Disk Space

Based on your system:
- **C: Drive**: 1.47 GB free (needs cleanup for Docker)
- **D: Drive**: 243 GB free (plenty of space)

Docker requires ~5-10 GB on C: drive for installation and operation.

## Step 1: Free Up Space on C: Drive

### Option A: Quick Cleanup Script (Run as Administrator)

Save this as `cleanup.ps1` and run:

```powershell
# Windows Disk Cleanup
Write-Output "Starting disk cleanup..."

# 1. Empty Recycle Bin
Write-Output "Emptying Recycle Bin..."
Clear-RecycleBin -Force -ErrorAction SilentlyContinue

# 2. Clear Windows Temp files
Write-Output "Clearing Windows Temp..."
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Clear Windows Update Cache
Write-Output "Clearing Windows Update cache..."
Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
Start-Service -Name wuauserv -ErrorAction SilentlyContinue

# 4. Run Disk Cleanup utility
Write-Output "Running Disk Cleanup utility..."
Start-Process cleanmgr -ArgumentList "/sagerun:1" -Wait

Write-Output "Cleanup complete!"
```

### Option B: Manual Cleanup

1. **Empty Recycle Bin**
   - Right-click Recycle Bin → Empty

2. **Disk Cleanup**
   - Press Win + R → type `cleanmgr` → Enter
   - Select C: drive
   - Check all boxes
   - Click "Clean up system files"

3. **Clear Temp Files**
   - Press Win + R → type `%temp%` → Enter
   - Delete all files (Ctrl + A, Delete)

4. **Uninstall Unused Programs**
   - Settings → Apps → Apps & Features
   - Uninstall programs you don't use

5. **Move Large Files to D: Drive**
   ```powershell
   # Find large files on C:
   Get-ChildItem -Path C:\ -Recurse -File -ErrorAction SilentlyContinue | 
     Where-Object {$_.Length -gt 100MB} | 
     Sort-Object Length -Descending | 
     Select-Object FullName, @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}} | 
     Format-Table -AutoSize
   ```

6. **Storage Sense** (Windows 10/11)
   - Settings → System → Storage
   - Turn on "Storage Sense"
   - Run "Free up space now"

### Target: Get at least 10 GB free on C:

## Step 2: Install Docker Desktop

### Download & Install

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download for Windows

2. **Install Docker Desktop**
   - Run installer
   - Follow prompts
   - Enable WSL 2 if prompted
   - Restart computer when asked

3. **Configure Docker to Use D: Drive** (Important!)

   After installation:
   - Open Docker Desktop
   - Go to Settings → Resources → Advanced
   - Change "Disk image location" to `D:\Docker`
   - This saves space on C: drive

4. **Verify Installation**
   ```powershell
   docker --version
   docker-compose --version
   ```

## Step 3: Run Backend with Docker

### Option A: Development Mode (with hot reload)

```bash
# Start backend + PostgreSQL
docker-compose -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down
```

**Features:**
- Nodemon for auto-restart on code changes
- PostgreSQL included
- Database auto-setup and seeding
- Port 3000 exposed

### Option B: Production Mode

```bash
# Build and start
docker-compose up --build

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Option C: Backend Only (use local PostgreSQL)

If you already have PostgreSQL locally:

```bash
# Build image
docker build -t celebrare-backend .

# Run container
docker run -d \
  --name celebrare-backend \
  -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=celebrare_upi \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  celebrare-backend

# View logs
docker logs -f celebrare-backend

# Stop and remove
docker stop celebrare-backend
docker rm celebrare-backend
```

## Step 4: Frontend (Still Local)

Frontend runs locally since it's a dev server:

```bash
cd frontend
npm install
npm run dev
```

Access: http://localhost:5173

## Complete Setup Commands

### First Time Setup

```bash
# 1. Free up space (run cleanup script)

# 2. Install Docker Desktop

# 3. Configure Docker to use D: drive

# 4. Start backend with Docker
cd "d:\celebrare assignment"
docker-compose -f docker-compose.dev.yml up -d

# 5. Wait for database to be ready (20-30 seconds)
docker-compose -f docker-compose.dev.yml logs -f backend

# 6. Start frontend locally
cd frontend
npm install
npm run dev
```

### Daily Usage

```bash
# Start backend
docker-compose -f docker-compose.dev.yml up -d

# Start frontend
cd frontend
npm run dev

# Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3000

# Stop backend
docker-compose -f docker-compose.dev.yml down
```

## Docker Commands Cheat Sheet

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs celebrare-backend
docker logs celebrare-db-dev

# Execute command in container
docker exec -it celebrare-backend sh
docker exec -it celebrare-db-dev psql -U postgres -d celebrare_upi

# Remove containers
docker-compose down

# Remove containers and volumes (deletes database data)
docker-compose down -v

# Rebuild containers
docker-compose up --build

# View images
docker images

# Remove unused images
docker image prune

# Remove all unused data
docker system prune -a
```

## Database Access

### From Host Machine

```bash
# PostgreSQL runs on localhost:5432
psql -h localhost -U postgres -d celebrare_upi
# Password: postgres
```

### From Container

```bash
docker exec -it celebrare-db-dev psql -U postgres -d celebrare_upi
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 on host instead
```

### Database Connection Failed

```bash
# Check if PostgreSQL is ready
docker-compose logs postgres

# Wait for health check to pass
docker ps

# Restart containers
docker-compose restart
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a -f
docker volume prune -f
```

### Container Won't Start

```bash
# View detailed logs
docker-compose logs

# Remove and recreate
docker-compose down -v
docker-compose up --build
```

## Configuration

### Environment Variables

Edit `.env` file or modify `docker-compose.yml`:

```yaml
environment:
  DB_HOST: postgres
  DB_PORT: 5432
  DB_NAME: celebrare_upi
  DB_USER: postgres
  DB_PASSWORD: your_secure_password
  PORT: 3000
  NODE_ENV: development
  WEBHOOK_SECRET: your_webhook_secret
```

### Change PostgreSQL Password

In `docker-compose.yml`:

```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: your_secure_password

backend:
  environment:
    DB_PASSWORD: your_secure_password
```

## Advantages of Docker Setup

✅ **Isolated Environment**: No conflicts with local PostgreSQL  
✅ **Easy Setup**: One command to start everything  
✅ **Consistent**: Same environment for all developers  
✅ **Clean**: Easy to remove/reset database  
✅ **Portable**: Works on Windows, Mac, Linux  

## Disadvantages

❌ **Disk Space**: Requires ~5-10 GB on C: drive  
❌ **Resources**: Uses more RAM (but configurable)  
❌ **Learning Curve**: Docker commands to learn  

## Migration from Local Setup

If you're currently running locally:

1. **Stop local PostgreSQL** (optional)
   ```powershell
   net stop postgresql-x64-14
   ```

2. **Export data** (if needed)
   ```bash
   pg_dump -h localhost -U postgres celebrare_upi > backup.sql
   ```

3. **Start Docker containers**
   ```bash
   docker-compose up -d
   ```

4. **Import data** (if needed)
   ```bash
   docker exec -i celebrare-db-dev psql -U postgres -d celebrare_upi < backup.sql
   ```

## Production Deployment

For production, use:
- **Backend**: Deploy to cloud (Heroku, Railway, Render)
- **Database**: Managed PostgreSQL (AWS RDS, DigitalOcean)
- **Frontend**: CDN (Vercel, Netlify)

Docker is mainly for local development consistency.

## Summary

1. **Free up 10GB on C: drive** using cleanup script
2. **Install Docker Desktop** and configure to use D: drive
3. **Run backend**: `docker-compose -f docker-compose.dev.yml up -d`
4. **Run frontend**: `cd frontend && npm run dev`
5. **Access**: http://localhost:5173

**Benefits**: Clean environment, easy database management, one-command setup.

---

Need help? Check logs: `docker-compose logs -f`
