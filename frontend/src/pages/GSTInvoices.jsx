import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gstAPI } from '../services/gstAPI';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';

const GSTInvoices = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    invoice_type: '',
  });
  
  useEffect(() => {
    fetchInvoices();
  }, []);
  
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await gstAPI.getInvoices(filters);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilter = () => {
    fetchInvoices();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">{t('loading')}</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('gstInvoices')}</h1>
          <p className="text-gray-600 mt-1">{t('viewAllGSTInvoices')}</p>
        </div>
        
        <button
          onClick={() => navigate('/gst/invoice/new')}
          className="btn-primary"
        >
          + {t('createGSTInvoice')}
        </button>
      </div>
      
      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('startDate')}
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endDate')}
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('invoiceType')}
            </label>
            <select
              value={filters.invoice_type}
              onChange={(e) => setFilters({ ...filters, invoice_type: e.target.value })}
              className="input-field"
            >
              <option value="">{t('all')}</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
              <option value="Export">{t('export')}</option>
              <option value="SEZ">SEZ</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleFilter} className="btn-primary w-full">
              {t('filter')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Invoices Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('invoiceNumber')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('customer')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GSTIN
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('type')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('taxableAmount')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('gst')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('totalAmount')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/gst/invoice/${invoice.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {invoice.customer_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {invoice.customer_gstin || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      invoice.invoice_type === 'B2B' ? 'bg-blue-100 text-blue-800' :
                      invoice.invoice_type === 'B2C' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {invoice.invoice_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {formatIndianCurrency(invoice.taxable_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                    {formatIndianCurrency(invoice.total_gst)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">
                    {formatIndianCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/gst/invoice/${invoice.id}`);
                      }}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {t('view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noInvoicesFound')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('createYourFirstInvoice')}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/gst/invoice/new')}
                  className="btn-primary"
                >
                  + {t('createGSTInvoice')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GSTInvoices;
