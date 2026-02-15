import api from './api';

export const gstAPI = {
  // Get all GST rates
  getRates: () => api.get('/gst/rates'),
  
  // Search HSN/SAC codes
  searchHSNSAC: (query, type) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (type) params.append('type', type);
    return api.get(`/gst/hsn-sac/search?${params.toString()}`);
  },
  
  // Get HSN/SAC code by code
  getHSNSAC: (code) => api.get(`/gst/hsn-sac/${code}`),
  
  // Create HSN/SAC code
  createHSNSAC: (data) => api.post('/gst/hsn-sac', data),
  
  // Create GST invoice
  createInvoice: (data) => api.post('/gst/invoices', data),
  
  // Get GST invoices
  getInvoices: (params) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.customer_id) queryParams.append('customer_id', params.customer_id);
    if (params.invoice_type) queryParams.append('invoice_type', params.invoice_type);
    return api.get(`/gst/invoices?${queryParams.toString()}`);
  },
  
  // Get single invoice
  getInvoice: (id) => api.get(`/gst/invoices/${id}`),
  
  // Get GST summary
  getSummary: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return api.get(`/gst/summary?${params.toString()}`);
  },
  
  // Get GSTR-1 report
  getGSTR1: (month, year) => {
    return api.get(`/gst/reports/gstr1?month=${month}&year=${year}`);
  },
  
  // Get GSTR-3B report
  getGSTR3B: (month, year) => {
    return api.get(`/gst/reports/gstr3b?month=${month}&year=${year}`);
  },
  
  // Get company settings
  getCompanySettings: () => api.get('/gst/company-settings'),
  
  // Update company settings
  updateCompanySettings: (id, data) => api.put(`/gst/company-settings/${id}`, data),
};

export default gstAPI;
