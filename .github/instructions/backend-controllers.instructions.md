---
description: "Instructions for backend controller development. Use when: creating new API endpoints, modifying business logic, implementing new features in Express controllers, handling database operations. Enforces consistent error handling, authentication patterns, and response formats."
applyTo: "backend/controllers/**/*.js"
---

# Backend Controller Development Guidelines

## Controller Pattern

Every controller function must follow this structure:

```javascript
const functionName = async (req, res) => {
  try {
    // 1. Extract and validate input
    const { param1, param2 } = req.body;
    const userId = req.user?.id; // From auth middleware
    
    // 2. Input validation
    if (!param1) {
      return res.status(400).json({ 
        success: false, 
        message: 'param1 is required' 
      });
    }
    
    // 3. Database operations
    const pool = require('../config/database');
    const result = await pool.query(
      'SELECT * FROM table WHERE column = $1',
      [param1]
    );
    
    // 4. Business logic processing
    const processedData = processResult(result.rows);
    
    // 5. Return success response
    res.status(200).json({ 
      success: true, 
      data: processedData 
    });
    
  } catch (error) {
    console.error('Error in functionName:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to perform operation' 
    });
  }
};

module.exports = { functionName };
```

## Response Format Standards

### Success Response
```javascript
res.status(200).json({
  success: true,
  data: result,           // Single object or array
  message: 'Optional success message'
});
```

### Error Response
```javascript
res.status(400|404|500).json({
  success: false,
  message: 'User-friendly error message',
  error: 'Technical details (only in development)'
});
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

## Database Query Patterns

### Always Use Parameterized Queries
```javascript
// ✅ CORRECT - Prevents SQL injection
const result = await pool.query(
  'SELECT * FROM customers WHERE id = $1',
  [customerId]
);

// ❌ WRONG - SQL injection vulnerability
const result = await pool.query(
  `SELECT * FROM customers WHERE id = ${customerId}`
);
```

### Connection Pool Usage
```javascript
const pool = require('../config/database');

// Simple query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction for multiple operations
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO table1 ...', [values]);
  await client.query('UPDATE table2 ...', [values]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### Handle Empty Results
```javascript
const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);

if (result.rows.length === 0) {
  return res.status(404).json({ 
    success: false, 
    message: 'Customer not found' 
  });
}

const customer = result.rows[0];
```

## Authentication Patterns

### Protected Routes
Controllers for protected routes always have access to `req.user`:

```javascript
const protectedFunction = async (req, res) => {
  try {
    const userId = req.user.id;      // User ID from JWT
    const userEmail = req.user.email; // User email from JWT
    const userRole = req.user.role;   // User role from JWT
    
    // Use user info in queries
    const result = await pool.query(
      'INSERT INTO sales (amount, created_by) VALUES ($1, $2)',
      [amount, userId]
    );
    
    // ...
  } catch (error) {
    // ...
  }
};
```

### Role-Based Access Control
```javascript
// Admin-only operations
if (req.user.role !== 'admin') {
  return res.status(403).json({ 
    success: false, 
    message: 'Admin access required' 
  });
}
```

## Input Validation

### Use express-validator (preferred)
```javascript
const { validationResult } = require('express-validator');

const functionName = async (req, res) => {
  // Check validation results from route middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  
  // Continue with validated input
  // ...
};
```

### Manual Validation
```javascript
// Required field check
if (!email || !password) {
  return res.status(400).json({ 
    success: false, 
    message: 'Email and password are required' 
  });
}

// Format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ 
    success: false, 
    message: 'Invalid email format' 
  });
}

// Range validation
if (amount <= 0) {
  return res.status(400).json({ 
    success: false, 
    message: 'Amount must be greater than 0' 
  });
}
```

## Error Handling

### Log Errors Properly
```javascript
try {
  // Operation
} catch (error) {
  // Log full error for debugging (server-side only)
  console.error('Error in functionName:', error);
  
  // Send sanitized message to client
  res.status(500).json({ 
    success: false, 
    message: 'Failed to perform operation'
    // Never send error.message directly - may contain sensitive info
  });
}
```

### Database Error Handling
```javascript
try {
  await pool.query('INSERT INTO customers ...', [values]);
} catch (error) {
  console.error('Database error:', error);
  
  // Handle specific errors
  if (error.code === '23505') { // Unique constraint violation
    return res.status(400).json({ 
      success: false, 
      message: 'Customer with this email already exists' 
    });
  }
  
  if (error.code === '23503') { // Foreign key violation
    return res.status(400).json({ 
      success: false, 
      message: 'Referenced record not found' 
    });
  }
  
  // Generic error
  res.status(500).json({ 
    success: false, 
    message: 'Failed to create customer' 
  });
}
```

## Hindi/Hinglish Support

### Customer Name Handling
```javascript
// Use toLowerCase() for case-insensitive search
const searchTerm = customerName.toLowerCase().trim();

// Support both English and Hindi input
const result = await pool.query(
  `SELECT * FROM customers 
   WHERE LOWER(company_name) LIKE $1 
   OR LOWER(contact_person) LIKE $1`,
  [`%${searchTerm}%`]
);

// If no exact match, try fuzzy matching (for AI controller)
if (result.rows.length === 0) {
  // Implement transliteration or phonetic matching
  // See aiController.js for examples
}
```

### Response Messages
Provide Hindi/English messages based on context:

```javascript
const messages = {
  en: 'Customer created successfully',
  hi: 'ग्राहक सफलतापूर्वक बनाया गया'
};

// Use language from request or user preference
const language = req.headers['accept-language']?.includes('hi') ? 'hi' : 'en';

res.json({ 
  success: true, 
  message: messages[language] 
});
```

## Common Patterns by Controller Type

### Customer Controller
- Validate Indian phone numbers (+91 format)
- Handle company_name and contact_person separately
- Support sector-based filtering
- Include GST number validation where applicable

### Sales Controller
- Always associate with customer_id
- Validate sale_date (not future dates)
- Include created_by from req.user.id
- Support filtering by date range and status
- Format currency as INR (no decimal places in UI)

### Udhar Khata Controller
- Strict separation from sales table
- Calculate outstanding: debit (credit given) - credit (payment)
- Validate debit/credit amounts > 0
- Support customer-wise aggregation
- Include description for clarity

### AI Controller
- Implement tool/function definitions for AI
- Handle Hindi/Hinglish input transliteration
- Fuzzy customer name matching
- Always execute actual DB writes
- Return natural language responses
- Respect rate limits

### WhatsApp Controller
- Verify webhook token on GET requests
- Process webhook events on POST
- Send 200 response quickly (Meta timeout)
- Handle text messages only (reject media with message)
- Persist conversations in database
- Use AI assistant for responses

## Performance Optimization

### Use Indexes
```javascript
// When querying frequently, ensure indexes exist
// Check database/schema.sql for index definitions
// Common indexes: email, customer_id, created_at, status
```

### Limit Result Sets
```javascript
// Always paginate large result sets
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const offset = (page - 1) * limit;

const result = await pool.query(
  'SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
  [limit, offset]
);

// Return pagination metadata
res.json({
  success: true,
  data: result.rows,
  pagination: {
    page,
    limit,
    total: totalCount // from separate COUNT query
  }
});
```

### Avoid N+1 Queries
```javascript
// ❌ WRONG - N+1 queries
const customers = await pool.query('SELECT * FROM customers');
for (const customer of customers.rows) {
  const sales = await pool.query(
    'SELECT * FROM sales WHERE customer_id = $1', 
    [customer.id]
  );
  customer.sales = sales.rows;
}

// ✅ CORRECT - Single JOIN query
const result = await pool.query(`
  SELECT 
    c.*, 
    json_agg(s.*) as sales
  FROM customers c
  LEFT JOIN sales s ON s.customer_id = c.id
  GROUP BY c.id
`);
```

## Security Checklist

- [ ] Use parameterized queries (never string concatenation)
- [ ] Validate all input (type, format, range)
- [ ] Check authentication (req.user exists)
- [ ] Verify authorization (user can access this resource)
- [ ] Sanitize error messages (no sensitive data to client)
- [ ] Log errors server-side for debugging
- [ ] Use HTTPS in production (trust proxy settings)
- [ ] Rate limit sensitive endpoints (AI, auth)
- [ ] Hash passwords with bcrypt (never plain text)
- [ ] Use JWT with expiry for sessions

## Testing Approach

After implementing a controller function:

1. **Test with curl or Postman**: Verify endpoint works
2. **Test error cases**: Invalid input, missing auth, not found
3. **Check database**: Verify data is written correctly
4. **Review logs**: Ensure no errors in console
5. **Test on mobile**: If UI involved, check mobile responsiveness
6. **Test in Hindi**: If applicable, verify Hindi input works

Remember: Controllers are the core business logic. Keep them clean, well-tested, and secure.
