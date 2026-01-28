import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

// Customers API
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Sales API
export const salesAPI = {
  getAll: () => api.get('/sales'),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
};

// Costs API
export const costsAPI = {
  getAll: () => api.get('/costs'),
  getById: (id) => api.get(`/costs/${id}`),
  create: (data) => api.post('/costs', data),
  update: (id, data) => api.put(`/costs/${id}`, data),
  delete: (id) => api.delete(`/costs/${id}`),
};

// Proposals API
export const proposalsAPI = {
  getAll: () => api.get('/proposals'),
  getById: (id) => api.get(`/proposals/${id}`),
  create: (data) => api.post('/proposals', data),
  update: (id, data) => api.put(`/proposals/${id}`, data),
  delete: (id) => api.delete(`/proposals/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesTrend: (period) => api.get('/dashboard/sales-trend', { params: { period } }),
  getRevenue: () => api.get('/dashboard/revenue'),
};

// Opportunities API
export const opportunitiesAPI = {
  getAll: () => api.get('/opportunities'),
  getById: (id) => api.get(`/opportunities/${id}`),
  create: (data) => api.post('/opportunities', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  delete: (id) => api.delete(`/opportunities/${id}`),
  getPipelineMetrics: () => api.get('/opportunities/pipeline-metrics'),
  getRevenueForecast: () => api.get('/opportunities/revenue-forecast'),
};

// Leads API
export const leadsAPI = {
  getAll: () => api.get('/leads'),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  getMetrics: () => api.get('/leads/metrics'),
  getBySalesperson: (userId) => api.get(`/leads/by-salesperson/${userId}`),
};

export default api;
