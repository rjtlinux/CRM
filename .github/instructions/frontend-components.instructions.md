---
description: "Instructions for React component development. Use when: creating new UI components, building pages, implementing forms, adding mobile features. Enforces React best practices, TailwindCSS patterns, mobile-first design, and Hindi/Hinglish support."
applyTo: "frontend/src/**/*.jsx"
---

# Frontend React Component Guidelines

## Component Pattern

Every React component should follow this structure:

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function ComponentName() {
  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Context (if needed)
  const { user } = useAuth();
  
  // Effects
  useEffect(() => {
    fetchData();
  }, []);
  
  // Data fetching
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/endpoint');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  // Event handlers
  const handleAction = async () => {
    try {
      await api.post('/api/endpoint', { data });
      // Update UI or refetch
      await fetchData();
    } catch (err) {
      console.error('Error:', err);
      setError('Operation failed');
    }
  };
  
  // Loading state
  if (loading) {
    return <div className="p-4">Loading...</div>;
  }
  
  // Error state
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  
  // Main render
  return (
    <div className="container">
      {/* Component content */}
    </div>
  );
}

export default ComponentName;
```

## Mobile-First Design

### Responsive Layout Patterns

Always design for mobile first, then scale up:

```jsx
// Mobile-first with responsive breakpoints
<div className="
  container mx-auto px-4
  // Mobile (default)
  space-y-4
  // Tablet (md: 768px+)
  md:px-6 md:space-y-6
  // Desktop (lg: 1024px+)
  lg:px-8 lg:max-w-7xl
">
  <div className="
    // Mobile: stack vertically
    flex flex-col gap-4
    // Desktop: horizontal layout
    lg:flex-row lg:gap-6
  ">
    <div className="flex-1">Content</div>
    <div className="flex-1">Content</div>
  </div>
</div>
```

### Touch-Friendly Elements
```jsx
// Buttons: minimum 44x44px tap target
<button className="
  px-6 py-3 
  text-sm md:text-base
  bg-blue-600 text-white rounded-lg
  hover:bg-blue-700
  active:scale-95 transition
  min-h-[44px]
">
  Action
</button>

// Input fields: larger on mobile
<input className="
  w-full px-4 py-3
  text-base
  border rounded-lg
  focus:ring-2 focus:ring-blue-500
  min-h-[44px]
" />
```

### Mobile Navigation
```jsx
// Use MobileBottomNav for mobile, sidebar for desktop
import MobileBottomNav from '../components/MobileBottomNav';

function Page() {
  return (
    <>
      {/* Desktop sidebar (in Layout) */}
      <div className="hidden lg:block">
        {/* Desktop content */}
      </div>
      
      {/* Mobile optimized content */}
      <div className="lg:hidden">
        {/* Mobile content */}
      </div>
      
      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </>
  );
}
```

## TailwindCSS Conventions

### Color Palette (Buzeye Brand)
```jsx
// Primary: Blue
<div className="bg-blue-600 text-white">
<button className="bg-blue-500 hover:bg-blue-600">

// Secondary: Gold/Yellow accent
<div className="text-yellow-500">
<span className="bg-gradient-to-r from-blue-600 to-yellow-500">

// Status colors
<span className="text-green-600">Success</span>
<span className="text-red-600">Error</span>
<span className="text-yellow-600">Warning</span>
<span className="text-gray-600">Info</span>

// Background
<div className="bg-gray-50">  // Light background
<div className="bg-white">     // Card background
```

### Common Layout Patterns
```jsx
// Card
<div className="bg-white rounded-lg shadow-md p-4 md:p-6">
  Content
</div>

// Section heading
<h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
  Section Title
</h2>

// Form group
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Field Label
    </label>
    <input className="w-full px-4 py-2 border rounded-lg" />
  </div>
</div>

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

## API Integration

### Using the API Service
```jsx
import api from '../services/api';

// GET request
const fetchCustomers = async () => {
  try {
    const response = await api.get('/api/customers');
    setCustomers(response.data.data);
  } catch (error) {
    console.error('Error:', error);
    handleError(error);
  }
};

// POST request
const createCustomer = async (customerData) => {
  try {
    const response = await api.post('/api/customers', customerData);
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// PUT request
const updateCustomer = async (id, updates) => {
  try {
    const response = await api.put(`/api/customers/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// DELETE request
const deleteCustomer = async (id) => {
  try {
    await api.delete(`/api/customers/${id}`);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

### Error Handling
```jsx
const handleError = (error) => {
  if (error.response) {
    // Server responded with error
    const message = error.response.data?.message || 'Operation failed';
    setError(message);
    
    // Handle specific status codes
    if (error.response.status === 401) {
      // Unauthorized - redirect to login
      navigate('/login');
    }
  } else if (error.request) {
    // Request made but no response
    setError('Network error. Please check your connection.');
  } else {
    // Other errors
    setError('An unexpected error occurred');
  }
};
```

## State Management

### Local State (useState)
```jsx
// Simple values
const [name, setName] = useState('');
const [isOpen, setIsOpen] = useState(false);

// Objects
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: ''
});

// Update object state
const handleChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};

// Arrays
const [items, setItems] = useState([]);

// Add item
setItems([...items, newItem]);

// Update item
setItems(items.map(item => 
  item.id === id ? { ...item, ...updates } : item
));

// Remove item
setItems(items.filter(item => item.id !== id));
```

### Global State (Context)
```jsx
import { useAuth } from '../context/AuthContext';

function Component() {
  const { user, login, logout } = useAuth();
  
  if (!user) {
    return <div>Please login</div>;
  }
  
  return (
    <div>
      <p>Welcome, {user.full_name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Form Handling

### Controlled Components
```jsx
function Form() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    // Submit
    try {
      await api.post('/api/endpoint', formData);
      // Reset form
      setFormData({ name: '', email: '', phone: '' });
      // Show success
      alert('Saved successfully');
    } catch (error) {
      handleError(error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>
      
      <button 
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  );
}
```

### Form Validation
```jsx
const validateForm = (data) => {
  const errors = {};
  
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Name is required';
  }
  
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (data.phone && !/^\+?91?\d{10}$/.test(data.phone.replace(/\s/g, ''))) {
    errors.phone = 'Invalid Indian phone number';
  }
  
  return errors;
};

// In component
const handleSubmit = (e) => {
  e.preventDefault();
  
  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  
  // Submit...
};
```

## Hindi/Hinglish Support

### Language Toggle
```jsx
import { useLanguage } from '../context/LanguageContext';

function Component() {
  const { language, t } = useLanguage();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome', { name: user.name })}</p>
    </div>
  );
}
```

### Hardcoded Text (if no i18n system)
```jsx
const text = {
  en: 'Customer Name',
  hi: 'ग्राहक का नाम'
};

<label>{language === 'hi' ? text.hi : text.en}</label>
```

### Input Handling
```jsx
// Support both English and Hindi input
<input
  type="text"
  placeholder="ग्राहक का नाम / Customer Name"
  className="w-full px-4 py-2 border rounded-lg"
  // Font that supports Hindi
  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
/>
```

## Indian Format Handling

### Currency (Rupees)
```jsx
// Format as INR without decimals
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Usage
<span>{formatCurrency(5000)}</span> // ₹5,000

// Alternative simple format
const formatRupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;
```

### Phone Numbers
```jsx
// Format Indian phone number
const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Validation
const isValidIndianPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'));
};
```

### Dates
```jsx
// Format date for Indian locale
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Date input default value (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];
<input type="date" defaultValue={today} />
```

## Performance Optimization

### Lazy Loading
```jsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Memoization
```jsx
import { useMemo, useCallback } from 'react';

// Expensive calculation
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Callback function
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Avoid Re-renders
```jsx
// ❌ WRONG - Creates new object on every render
<Component data={{ id: 1, name: 'Test' }} />

// ✅ CORRECT - Stable reference
const data = useMemo(() => ({ id: 1, name: 'Test' }), []);
<Component data={data} />
```

## Common Component Patterns

### List with Empty State
```jsx
function CustomerList({ customers }) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No customers found</p>
        <button className="mt-4 text-blue-600">Add Customer</button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {customers.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

### Modal/Dialog
```jsx
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="float-right text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
```

### Search/Filter
```jsx
function SearchableList({ items }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg mb-4"
      />
      
      <div className="space-y-2">
        {filteredItems.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}
```

### Loading Skeleton
```jsx
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}

// Usage
{loading ? <Skeleton /> : <Content />}
```

## Accessibility

### Semantic HTML
```jsx
// Use proper HTML elements
<button>Click</button>           // Not <div onClick>
<nav>Navigation</nav>             // For navigation
<main>Main content</main>         // For main content
<header>Header</header>           // For headers
<footer>Footer</footer>           // For footers
```

### ARIA Labels
```jsx
<button aria-label="Close modal" onClick={onClose}>
  ✕
</button>

<input 
  type="text" 
  aria-label="Search customers"
  aria-describedby="search-hint"
/>
<span id="search-hint" className="text-sm text-gray-500">
  Enter customer name or email
</span>
```

### Keyboard Navigation
```jsx
// Handle keyboard events
const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    handleSubmit();
  }
  if (e.key === 'Escape') {
    onClose();
  }
};

<input onKeyDown={handleKeyDown} />
```

## Testing Checklist

After creating a component:

- [ ] Works on mobile (test in responsive mode)
- [ ] Works on desktop (test at 1920x1080)
- [ ] Loading state shows properly
- [ ] Error state shows user-friendly message
- [ ] Empty state shows helpful guidance
- [ ] Forms validate input correctly
- [ ] API calls handle success and error
- [ ] Touch targets are large enough (44x44px minimum)
- [ ] Hindi/Hinglish text displays correctly
- [ ] Currency shows as INR (₹)
- [ ] Dates format correctly for Indian locale
- [ ] Component is accessible (keyboard navigation, ARIA labels)

Remember: Build for mobile-first, support Hindi/Hinglish, keep it simple for Indian shop owners.
