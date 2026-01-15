# CRM System - Complete Setup Guide

This guide will walk you through setting up the Enterprise CRM System from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher): [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v14 or higher): [Download here](https://www.postgresql.org/download/)
- **Git** (optional, for version control)

### Verify installations:

```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
psql --version    # Should show PostgreSQL 14 or higher
```

## Database Setup

### Step 1: Install and Start PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Download and install from [PostgreSQL website](https://www.postgresql.org/download/windows/)
- Use the installer and note your postgres password

### Step 2: Create Database

```bash
# Access PostgreSQL
psql postgres

# Or if you need to specify user
psql -U postgres

# Create the database
CREATE DATABASE crm_database;

# Create a user (optional but recommended)
CREATE USER crm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crm_database TO crm_user;

# Exit psql
\q
```

### Step 3: Import Database Schema

```bash
# From the project root directory
psql -d crm_database -f database/schema.sql

# Or if using custom user
psql -U crm_user -d crm_database -f database/schema.sql
```

You should see output like:
```
DROP TABLE
CREATE TABLE
CREATE TABLE
...
INSERT 0 1
```

### Step 4: Verify Database

```bash
# Connect to the database
psql -d crm_database

# List tables
\dt

# You should see:
# - users
# - customers
# - sales
# - costs
# - proposals
# - proposal_items

# Check sample data
SELECT * FROM users;
SELECT COUNT(*) FROM customers;

# Exit
\q
```

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- express (API framework)
- pg (PostgreSQL client)
- cors (Cross-origin resource sharing)
- dotenv (Environment variables)
- bcryptjs (Password hashing)
- jsonwebtoken (JWT authentication)
- express-validator (Input validation)
- nodemon (Development auto-reload)

### Step 3: Create Environment File

Create a file named `.env` in the backend directory:

```bash
# For macOS/Linux
touch .env

# For Windows
type nul > .env
```

Edit the `.env` file with your favorite text editor and add:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_database
DB_USER=your_db_username
DB_PASSWORD=your_db_password

# JWT Secret (generate a random string for production)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**⚠️ Important:** 
- Replace `your_db_username` and `your_db_password` with your actual PostgreSQL credentials
- For production, generate a strong random JWT_SECRET: `openssl rand -base64 32`

### Step 4: Test Database Connection

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
========================================
  🚀 CRM Backend Server Started
========================================
  Server running on port: 5000
  Environment: development
  API Base URL: http://localhost:5000/api
========================================
```

If you see this, your backend is working! Press Ctrl+C to stop the server for now.

### Step 5: Test API Endpoints (Optional)

Keep the server running and in a new terminal:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return: {"status":"OK","message":"CRM API is running"}
```

## Frontend Setup

### Step 1: Navigate to Frontend Directory

Open a new terminal window/tab and navigate to the frontend directory:

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- react & react-dom (UI framework)
- react-router-dom (Routing)
- axios (HTTP client)
- recharts (Charts and graphs)
- vite (Build tool)
- tailwindcss (CSS framework)

### Step 3: Create Environment File

Create a file named `.env` in the frontend directory:

```bash
# For macOS/Linux
touch .env

# For Windows
type nul > .env
```

Edit the `.env` file and add:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Running the Application

### Starting Everything

You need TWO terminal windows/tabs:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Accessing the Application

1. Open your web browser
2. Navigate to: **http://localhost:5173**
3. You should see the login page

### Default Login Credentials

```
Email: admin@crm.com
Password: admin123
```

**⚠️ IMPORTANT:** Change these credentials immediately in production!

## First Steps After Login

1. **Dashboard**: View overview of your business metrics
2. **Customers**: Add your first customer
3. **Sales**: Record a sale
4. **Costs**: Track expenses
5. **Proposals**: Create business proposals
6. **Reports**: View analytics and reports

## Troubleshooting

### Database Connection Issues

**Error: "password authentication failed"**
```bash
# Reset your PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q

# Update your .env file with the new password
```

**Error: "database does not exist"**
```bash
# Create the database again
psql postgres
CREATE DATABASE crm_database;
\q
```

### Backend Issues

**Error: "Port 5000 is already in use"**
```bash
# Find and kill the process using port 5000
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change the PORT in backend/.env to 5001
```

**Error: "Cannot find module"**
```bash
# Delete node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Error: "Port 5173 is already in use"**
```bash
# Kill the process
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Blank white page or errors in console**
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules package-lock.json dist
npm install
npm run dev
```

### Database Query Issues

**Check if tables exist:**
```bash
psql -d crm_database
\dt
```

**Reset database completely:**
```bash
psql postgres
DROP DATABASE IF EXISTS crm_database;
CREATE DATABASE crm_database;
\q
psql -d crm_database -f database/schema.sql
```

## Production Deployment

### Backend Production Setup

1. Set `NODE_ENV=production` in `.env`
2. Generate a strong JWT_SECRET: `openssl rand -base64 32`
3. Use a production PostgreSQL instance
4. Enable HTTPS
5. Set up proper firewall rules
6. Use PM2 or similar for process management:

```bash
npm install -g pm2
pm2 start server.js --name crm-backend
pm2 startup
pm2 save
```

### Frontend Production Build

```bash
cd frontend
npm run build
```

Serve the `dist` folder with:
- Nginx
- Apache
- Vercel
- Netlify
- Any static hosting service

### Environment Variables in Production

Never commit `.env` files to version control. Use:
- Environment variables in your hosting platform
- AWS Secrets Manager
- HashiCorp Vault
- Docker secrets

## Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Set up database backups
- [ ] Implement rate limiting
- [ ] Use environment variables
- [ ] Enable CORS only for trusted domains
- [ ] Regular security updates
- [ ] Implement logging and monitoring

## Next Steps

1. **Customize**: Modify the application to fit your business needs
2. **Brand**: Update colors, logo, and company information
3. **Scale**: Add more features as needed
4. **Test**: Thoroughly test all functionality
5. **Deploy**: Move to production when ready

## Getting Help

- Check the main README.md for API documentation
- Review the code comments for detailed explanations
- Common issues are usually related to database connection or port conflicts

## Success!

If you've followed all steps and can log in to the application, congratulations! Your CRM system is now ready to use.

Start by:
1. Creating your first customer
2. Recording a sale
3. Tracking some costs
4. Viewing the dashboard analytics

Happy CRM-ing! 🚀
