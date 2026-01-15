# Docker Deployment Guide

## Quick Start with Docker

Run the entire CRM system with a single command using Docker Compose!

### Prerequisites

- **Docker Desktop** or **Docker Engine** installed
- **Docker Compose** v2.0+ (included with Docker Desktop)

#### Install Docker

**macOS:**
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop
# Or using Homebrew:
brew install --cask docker
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

**Windows:**
- Download Docker Desktop from https://www.docker.com/products/docker-desktop

#### Verify Installation

```bash
docker --version          # Should show Docker version 20.10+
docker-compose --version  # Should show Docker Compose version 2.0+
```

## One-Command Startup

### Start Everything

```bash
# From the project root directory
docker-compose up
```

That's it! The command will:
1. ✅ Create PostgreSQL database
2. ✅ Load database schema with sample data
3. ✅ Start backend API on port 5000
4. ✅ Start frontend on port 5173
5. ✅ Set up networking between services

### Access the Application

Wait for all services to start (you'll see logs from all containers), then:

1. Open your browser
2. Go to: **http://localhost:5173**
3. Login with:
   - Email: `admin@crm.com`
   - Password: `admin123`

## Docker Commands

### Start in Detached Mode (Background)

```bash
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database
```

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove Volumes (Clean Reset)

```bash
# Warning: This deletes all database data!
docker-compose down -v
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild Containers

```bash
# After code changes
docker-compose up --build

# Or force rebuild
docker-compose build --no-cache
docker-compose up
```

### View Running Containers

```bash
docker-compose ps
```

### Execute Commands in Containers

```bash
# Access backend shell
docker-compose exec backend sh

# Access database
docker-compose exec database psql -U crm_user -d crm_database

# Run npm commands
docker-compose exec backend npm install <package>
docker-compose exec frontend npm install <package>
```

## Container Details

### Services

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| database | crm_database | 5432 | PostgreSQL 14 |
| backend | crm_backend | 5000 | Node.js/Express API |
| frontend | crm_frontend | 5173 | React/Vite App |

### Environment Variables

Default values are set in `docker-compose.yml`. For production, create a `.env` file:

```bash
# Create .env in project root
cat > .env << EOF
# Database
POSTGRES_DB=crm_database
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=your_secure_password

# Backend
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend
VITE_API_URL=http://localhost:5000/api
EOF
```

Then Docker Compose will use these values automatically.

## Development Workflow

### Hot Reload

Both frontend and backend support hot reload:
- **Frontend**: Changes to files in `frontend/src/` auto-reload
- **Backend**: Changes to files in `backend/` auto-reload (via nodemon)

### Making Code Changes

1. Edit files locally in your IDE
2. Changes are automatically reflected in containers (via volumes)
3. Browser/server auto-reloads
4. No need to rebuild containers for code changes

### Installing New Dependencies

```bash
# Backend
docker-compose exec backend npm install <package-name>

# Frontend
docker-compose exec frontend npm install <package-name>

# Then restart the service
docker-compose restart backend  # or frontend
```

## Database Management

### Access Database

```bash
# Connect to PostgreSQL
docker-compose exec database psql -U crm_user -d crm_database

# List tables
\dt

# Query data
SELECT * FROM users;

# Exit
\q
```

### Backup Database

```bash
# Backup to file
docker-compose exec database pg_dump -U crm_user crm_database > backup.sql

# Or with timestamp
docker-compose exec database pg_dump -U crm_user crm_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# Stop backend first to avoid conflicts
docker-compose stop backend

# Restore from backup
docker-compose exec -T database psql -U crm_user -d crm_database < backup.sql

# Restart backend
docker-compose start backend
```

### Reset Database

```bash
# Stop all services
docker-compose down

# Remove volumes (this deletes all data!)
docker-compose down -v

# Start fresh
docker-compose up
# Database will be recreated with schema.sql
```

## Troubleshooting

### Port Already in Use

**Error:** "Port is already allocated"

```bash
# Find and kill process using the port
# macOS/Linux:
sudo lsof -ti:5432 | xargs kill -9  # Database
sudo lsof -ti:5000 | xargs kill -9  # Backend
sudo lsof -ti:5173 | xargs kill -9  # Frontend

# Or change ports in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead of 5432
```

### Container Fails to Start

```bash
# Check logs
docker-compose logs <service-name>

# Common issues:
# 1. Database not ready - wait a few seconds, it has healthcheck
# 2. Port conflict - change ports in docker-compose.yml
# 3. Build error - check Dockerfile
```

### Database Connection Error

```bash
# Check if database is ready
docker-compose ps

# Should show database as "healthy"
# If not, wait a bit longer or check logs:
docker-compose logs database
```

### Frontend Shows Blank Page

```bash
# Check if backend is running
curl http://localhost:5000/health

# Should return: {"status":"OK",...}

# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend
```

### Changes Not Reflecting

```bash
# For code changes - restart the service
docker-compose restart backend  # or frontend

# For dependency changes - rebuild
docker-compose up --build

# For clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Out of Disk Space

```bash
# Remove unused containers and images
docker system prune

# Remove everything (careful!)
docker system prune -a --volumes
```

## Production Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  database:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - crm_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: database
      DB_NAME: ${POSTGRES_DB}
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - database
    networks:
      - crm_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    depends_on:
      - backend
    networks:
      - crm_network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - crm_network

volumes:
  postgres_data:

networks:
  crm_network:
```

### Production Backend Dockerfile

Create `backend/Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Production Frontend Dockerfile

Create `frontend/Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deploy to Production

```bash
# Create .env file with production values
# NEVER commit this file!

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Docker vs Manual Setup

### Docker Advantages

✅ **One Command Start** - `docker-compose up`
✅ **Consistent Environment** - Same on all machines
✅ **Isolated** - Doesn't affect your system
✅ **Easy Cleanup** - `docker-compose down`
✅ **No Local Dependencies** - Don't need Node/PostgreSQL installed
✅ **Version Control** - Exact versions specified
✅ **Easy Sharing** - Team members get same setup

### Manual Setup Advantages

✅ **Faster Iteration** - No container overhead
✅ **Native Performance** - Direct system access
✅ **Easier Debugging** - Direct access to processes
✅ **Simpler Tooling** - Use local dev tools

### Recommendation

- **Development**: Use whichever you prefer
- **Production**: Use Docker for consistency and isolation
- **Team**: Use Docker for environment consistency

## Resources

### Docker Documentation
- [Docker Overview](https://docs.docker.com/get-started/overview/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)

### Project Documentation
- [README.md](README.md) - Main documentation
- [QUICK_START.md](QUICK_START.md) - Manual setup
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed manual setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

## Quick Reference

```bash
# Start everything
docker-compose up

# Start in background
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Rebuild after changes
docker-compose up --build

# Clean reset (deletes data!)
docker-compose down -v && docker-compose up

# Access database
docker-compose exec database psql -U crm_user -d crm_database

# Run backend command
docker-compose exec backend npm install <package>

# Check status
docker-compose ps
```

## Success! 🎉

If you see all three services running:
- ✅ database (healthy)
- ✅ backend (running)
- ✅ frontend (running)

Open http://localhost:5173 and start using your CRM!

---

**Happy Dockerizing!** 🐳
