# Enterprise CRM System

A comprehensive CRM (Customer Relationship Management) system designed for small enterprises to manage sales, costs, proposals, and business analytics.

## Features

- 📊 **Dashboard Analytics** - Real-time business metrics with yearly, monthly, and weekly views
- 💰 **Cost Management** - Track and manage business expenses
- 📈 **Sales Tracking** - Monitor sales pipeline and performance
- 📄 **Proposal Management** - Create and track proposals and consignments
- 👥 **Customer Management** - Manage customer relationships and interactions
- 📑 **Reports** - Generate comprehensive business reports
- 🔐 **Secure Authentication** - JWT-based user authentication

## Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- Axios for API calls
- Recharts for data visualization
- TailwindCSS for styling

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- bcrypt for password hashing
- CORS enabled

### Database
- PostgreSQL 14+

## Project Structure

```
CRM/
├── backend/              # Node.js/Express API
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── server.js        # Entry point
├── frontend/            # React application
│   ├── public/          # Static files
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       ├── services/    # API services
│       └── App.jsx      # Main app component
└── database/            # Database schema and migrations
```

## Setup Instructions

### Option 1: Docker (Recommended - Easiest!)

**Prerequisites:** Docker Desktop installed

```bash
# Start everything with one command
docker-compose up

# Access at http://localhost:5173
# Login: admin@crm.com / admin123
```

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for details.

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+, npm, PostgreSQL 14+

### Database Setup

1. Install PostgreSQL and create a database:
```bash
createdb crm_database
```

2. Run the database schema:
```bash
psql -d crm_database -f database/schema.sql
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_database
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_secret_key_here_change_in_production
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Default Login Credentials

After running the database schema, you can login with:
- **Email:** admin@crm.com
- **Password:** admin123

⚠️ **Important:** Change these credentials immediately in production!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### Costs
- `GET /api/costs` - Get all costs
- `POST /api/costs` - Create cost entry
- `PUT /api/costs/:id` - Update cost
- `DELETE /api/costs/:id` - Delete cost

### Proposals
- `GET /api/proposals` - Get all proposals
- `POST /api/proposals` - Create proposal
- `PUT /api/proposals/:id` - Update proposal
- `DELETE /api/proposals/:id` - Delete proposal

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/sales-trend` - Get sales trends
- `GET /api/dashboard/revenue` - Get revenue analytics

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite hot-reload enabled
```

## Production Deployment

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist folder with your web server
```

## Security Notes

- Change JWT_SECRET in production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement rate limiting
- Regular security audits

## License

MIT License

## Support

For issues and feature requests, please create an issue in the repository.
