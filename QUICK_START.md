# Quick Start Guide

Get your CRM system up and running in minutes!

## Option 1: Docker (Super Easy! ⚡)

**Prerequisites:** Just Docker Desktop

```bash
# 1. Start everything
docker-compose up

# 2. Open http://localhost:5173
# 3. Login: admin@crm.com / admin123
```

**That's it!** 🎉 See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for more commands.

---

## Option 2: Manual Setup (10 minutes)

### Prerequisites Check

Run these commands to verify you have everything installed:

```bash
node --version    # Need v18+
npm --version     # Need v9+
psql --version    # Need PostgreSQL 14+
```

Don't have them? [See SETUP_GUIDE.md](SETUP_GUIDE.md) for installation instructions.

## Step 1: Database Setup (2 minutes)

```bash
# Create database
createdb crm_database

# Import schema
psql -d crm_database -f database/schema.sql
```

## Step 2: Backend Setup (3 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file (copy and edit)
cat > .env << EOF
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_database
DB_USER=YOUR_USERNAME
DB_PASSWORD=YOUR_PASSWORD
JWT_SECRET=change_this_to_a_random_string
EOF

# Edit the .env file with your actual database credentials
# On macOS: open .env
# On Linux: nano .env
# On Windows: notepad .env

# Start backend
npm run dev
```

You should see: ✅ Database connected successfully

## Step 3: Frontend Setup (3 minutes)

Open a NEW terminal window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start frontend
npm run dev
```

## Step 4: Access the Application (1 minute)

1. Open your browser
2. Go to: **http://localhost:5173**
3. Login with:
   - Email: `admin@crm.com`
   - Password: `admin123`

## Success! 🎉

You now have a fully functional CRM system running!

### What to do next:

1. **Explore the Dashboard** - See sample data and analytics
2. **Add a Customer** - Click "Customers" → "+ Add Customer"
3. **Record a Sale** - Click "Sales" → "+ Add Sale"
4. **Track Costs** - Click "Costs" → "+ Add Cost"
5. **View Reports** - Click "Reports" to see analytics

## Troubleshooting

### Backend won't start?
- Check your database credentials in `backend/.env`
- Make sure PostgreSQL is running: `brew services list` (macOS)

### Frontend shows blank page?
- Check browser console for errors
- Make sure backend is running on port 5000

### Database connection failed?
- Verify PostgreSQL is running
- Check username/password are correct
- Try: `psql -d crm_database` to test connection

### Port already in use?
- Backend: Change PORT in `backend/.env` to 5001
- Frontend: It will auto-suggest a different port

## Need More Help?

- 📖 **Full Setup Guide**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- 🏗️ **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- ✨ **Features**: [FEATURES.md](FEATURES.md)
- 📚 **API Docs**: [README.md](README.md)

## Production Deployment

Not ready yet? That's fine! When you are:

1. Change `NODE_ENV=production` in backend/.env
2. Generate secure JWT_SECRET: `openssl rand -base64 32`
3. Use production database (AWS RDS, DigitalOcean, etc.)
4. Build frontend: `cd frontend && npm run build`
5. Deploy `dist` folder to hosting service
6. Set up HTTPS
7. Change default admin password!

---

**Happy CRM-ing!** 🚀
