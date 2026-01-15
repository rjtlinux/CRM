# Enterprise CRM System - Architecture Documentation

## System Overview

The Enterprise CRM System is a full-stack web application built with modern technologies, designed to help small businesses manage their customer relationships, sales, costs, and business analytics.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React 18 + Vite                                    │   │
│  │  - React Router (Navigation)                        │   │
│  │  - Context API (State Management)                   │   │
│  │  - Axios (HTTP Client)                              │   │
│  │  - Recharts (Data Visualization)                    │   │
│  │  - TailwindCSS (Styling)                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕ HTTP/HTTPS                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Backend API (Node.js + Express)                    │   │
│  │  - RESTful API                                      │   │
│  │  - JWT Authentication                               │   │
│  │  - Middleware (Auth, CORS, Validation)              │   │
│  │  - Controllers (Business Logic)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕ TCP/IP                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                │   │
│  │  - Relational Data Storage                          │   │
│  │  - Indexed Queries                                  │   │
│  │  - Transactions                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Layer

**Framework: React 18**
- Component-based architecture
- Hooks for state management
- Functional components throughout

**Build Tool: Vite**
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- Modern ES modules

**Routing: React Router v6**
- Client-side routing
- Protected routes with authentication
- Nested routes for layout

**HTTP Client: Axios**
- Promise-based HTTP requests
- Interceptors for auth tokens
- Automatic error handling

**Charts: Recharts**
- Responsive charts
- Multiple chart types (Line, Bar, Pie)
- Built on D3.js

**Styling: TailwindCSS**
- Utility-first CSS
- Responsive design
- Custom components

### Backend Layer

**Runtime: Node.js**
- Non-blocking I/O
- JavaScript/ES6+
- NPM package ecosystem

**Framework: Express.js**
- Lightweight and flexible
- Middleware architecture
- RESTful API design

**Database Client: node-postgres (pg)**
- Native PostgreSQL bindings
- Connection pooling
- Parameterized queries

**Authentication: JWT + bcryptjs**
- Stateless authentication
- Secure password hashing
- Token-based sessions

**Validation: express-validator**
- Input sanitization
- Request validation
- Error handling

### Database Layer

**Database: PostgreSQL 14+**
- ACID compliance
- Relational data model
- Advanced indexing
- Triggers for auto-updates

## System Architecture

### Frontend Architecture

```
src/
├── main.jsx                 # Application entry point
├── App.jsx                  # Root component with routing
├── index.css               # Global styles + Tailwind
│
├── context/                # React Context for state
│   └── AuthContext.jsx     # Authentication state
│
├── services/               # API communication
│   └── api.js             # Axios instance + API calls
│
├── components/             # Reusable components
│   └── Layout.jsx         # Main layout with sidebar
│
└── pages/                  # Page components
    ├── Login.jsx          # Authentication page
    ├── Dashboard.jsx      # Main dashboard
    ├── Customers.jsx      # Customer management
    ├── Sales.jsx          # Sales tracking
    ├── Costs.jsx          # Cost management
    ├── Proposals.jsx      # Proposal management
    └── Reports.jsx        # Analytics & reports
```

### Backend Architecture

```
backend/
├── server.js              # Application entry point
│
├── config/                # Configuration files
│   └── database.js        # Database connection pool
│
├── middleware/            # Custom middleware
│   └── auth.js           # JWT authentication
│
├── controllers/           # Business logic
│   ├── authController.js
│   ├── customerController.js
│   ├── salesController.js
│   ├── costController.js
│   ├── proposalController.js
│   └── dashboardController.js
│
└── routes/                # API route definitions
    ├── authRoutes.js
    ├── customerRoutes.js
    ├── salesRoutes.js
    ├── costRoutes.js
    ├── proposalRoutes.js
    └── dashboardRoutes.js
```

### Database Schema

```
┌──────────────┐
│    users     │
├──────────────┤
│ id (PK)      │
│ email        │◄────┐
│ password     │     │
│ full_name    │     │
│ role         │     │
└──────────────┘     │
                     │
┌──────────────┐     │
│  customers   │     │
├──────────────┤     │
│ id (PK)      │     │
│ company_name │     │
│ email        │     │
│ created_by   │─────┘
└──────────────┘
      │
      │ (FK)
      ├──────────────────┐
      │                  │
┌──────────────┐   ┌─────────────┐
│    sales     │   │  proposals  │
├──────────────┤   ├─────────────┤
│ id (PK)      │   │ id (PK)     │
│ customer_id  │   │ customer_id │
│ amount       │   │ total_amount│
│ status       │   │ status      │
└──────────────┘   └─────────────┘
                         │
                         │ (FK)
                   ┌─────────────────┐
                   │ proposal_items  │
                   ├─────────────────┤
                   │ id (PK)         │
                   │ proposal_id     │
                   │ item_name       │
                   │ unit_price      │
                   └─────────────────┘

┌──────────────┐
│    costs     │
├──────────────┤
│ id (PK)      │
│ category     │
│ amount       │
│ cost_date    │
└──────────────┘
```

## Data Flow

### Authentication Flow

```
1. User enters credentials on Login page
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend validates credentials with bcrypt
   ↓
4. Backend generates JWT token
   ↓
5. Frontend stores token in localStorage
   ↓
6. Frontend includes token in Authorization header
   ↓
7. Backend middleware validates token
   ↓
8. Access granted to protected routes
```

### CRUD Operations Flow

```
1. User interacts with UI (Create/Read/Update/Delete)
   ↓
2. Frontend makes API call with Axios
   ↓
3. Request passes through Auth Middleware
   ↓
4. Controller validates and processes request
   ↓
5. Database query executed with pg
   ↓
6. Response sent back to frontend
   ↓
7. UI updates with new data
```

## API Architecture

### RESTful Endpoints

**Authentication:**
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/profile` - Get user profile

**Customers:**
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

**Sales:**
- `GET /api/sales` - List all sales
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

**Costs:**
- `GET /api/costs` - List all costs
- `POST /api/costs` - Create cost
- `PUT /api/costs/:id` - Update cost
- `DELETE /api/costs/:id` - Delete cost

**Proposals:**
- `GET /api/proposals` - List all proposals
- `GET /api/proposals/:id` - Get proposal with items
- `POST /api/proposals` - Create proposal with items
- `PUT /api/proposals/:id` - Update proposal
- `DELETE /api/proposals/:id` - Delete proposal

**Dashboard:**
- `GET /api/dashboard/stats` - Get overview statistics
- `GET /api/dashboard/sales-trend` - Get sales trend data
- `GET /api/dashboard/revenue` - Get revenue analytics

### Request/Response Format

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Success Response:**
```json
{
  "message": "Success message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Security Architecture

### Authentication & Authorization

1. **Password Security:**
   - Bcrypt hashing (10 salt rounds)
   - Never store plain text passwords
   - Password validation on input

2. **JWT Tokens:**
   - 7-day expiration
   - Signed with secret key
   - Stored in localStorage (client)
   - Validated on every protected route

3. **Authorization:**
   - Role-based access (admin/user)
   - Middleware checks token validity
   - Automatic logout on token expiration

### API Security

1. **CORS:**
   - Configured to accept frontend origin
   - Credentials allowed
   - Configurable for production

2. **Input Validation:**
   - Server-side validation
   - SQL injection prevention (parameterized queries)
   - XSS prevention

3. **Error Handling:**
   - Global error handler
   - No sensitive data in error messages
   - Proper HTTP status codes

## Performance Optimization

### Frontend

1. **Code Splitting:**
   - Lazy loading with React.lazy
   - Route-based splitting
   - Reduced initial bundle size

2. **State Management:**
   - Context API for global state
   - Local state for component-specific data
   - Minimize unnecessary re-renders

3. **Caching:**
   - Browser caching via Vite
   - API response caching in localStorage
   - Asset optimization

### Backend

1. **Database:**
   - Connection pooling (20 connections)
   - Indexed columns for fast queries
   - Optimized SQL queries
   - JOIN operations for related data

2. **Response Optimization:**
   - Only necessary fields returned
   - Pagination ready (not implemented yet)
   - Efficient data aggregation

3. **Middleware:**
   - Lightweight middleware stack
   - Early validation and rejection
   - Minimal processing overhead

## Scalability Considerations

### Current Architecture (Single Server)

- Suitable for 1-1000 concurrent users
- Single database instance
- Stateless backend (horizontal scaling ready)

### Future Scalability Options

1. **Load Balancing:**
   - Multiple backend instances
   - Nginx/HAProxy load balancer
   - Session management with Redis

2. **Database Scaling:**
   - Read replicas for reporting
   - Connection pooling
   - Query optimization
   - Caching layer (Redis)

3. **Microservices (Optional):**
   - Separate services for different domains
   - API Gateway
   - Message queue (RabbitMQ/Kafka)

4. **Caching Strategy:**
   - Redis for session storage
   - CDN for static assets
   - API response caching

## Deployment Architecture

### Development Environment

```
Developer Machine
├── Backend: localhost:5000
├── Frontend: localhost:5173
└── Database: localhost:5432
```

### Production Environment (Recommended)

```
┌─────────────────────────────────────┐
│         Load Balancer (Nginx)       │
└─────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌────────────┐   ┌────────────┐
│  Backend 1 │   │  Backend 2 │
│  (Node.js) │   │  (Node.js) │
└────────────┘   └────────────┘
         │               │
         └───────┬───────┘
                 │
        ┌────────────────┐
        │   PostgreSQL   │
        │   (Primary)    │
        └────────────────┘
                 │
        ┌────────────────┐
        │   PostgreSQL   │
        │   (Replica)    │
        └────────────────┘
```

### Frontend Deployment

- Build with `npm run build`
- Serve static files via:
  - Nginx
  - Vercel
  - Netlify
  - AWS S3 + CloudFront

### Backend Deployment

- PM2 for process management
- Docker containerization
- Environment variables for config
- Reverse proxy (Nginx)

### Database Deployment

- Managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
- Regular backups
- Replication for high availability
- Monitoring and alerts

## Monitoring & Maintenance

### Logging

- Request/response logging
- Error logging
- Audit trail for critical operations
- Log aggregation (ELK stack)

### Monitoring

- Application performance monitoring
- Database query performance
- Server resource usage
- Error tracking (Sentry, etc.)

### Backups

- Daily database backups
- Transaction logs
- Point-in-time recovery
- Backup retention policy

## Future Enhancements

1. **Features:**
   - Email notifications
   - Document generation (PDF invoices/proposals)
   - Advanced reporting
   - Role-based permissions
   - Multi-tenancy

2. **Technical:**
   - GraphQL API option
   - Real-time updates (WebSockets)
   - Mobile app (React Native)
   - Offline support
   - Advanced caching

3. **Integrations:**
   - Payment gateways
   - Email services
   - Calendar integration
   - Third-party CRM tools

## Conclusion

This architecture provides a solid foundation for a modern, scalable CRM system. The separation of concerns, RESTful API design, and modern frontend framework ensure maintainability and extensibility.
