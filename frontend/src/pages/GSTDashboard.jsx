import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gstAPI } from '../services/gstAPI';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GSTDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [summary, setSummary] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  
  useEffect(() => {
    fetchData();
  }, [dateRange]);
  
  const fetchData = async () => {
    try {
      const [summaryRes, invoicesRes] = await Promise.all([
        gstAPI.getSummary(dateRange.start_date, dateRange.end_date),
        gstAPI.getInvoices(dateRange)
      ]);
      setSummary(summaryRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error('Error fetching GST data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateTotals = () => {
    return summary.reduce((acc, item) => ({
      taxable: acc.taxable + parseFloat(item.total_taxable || 0),
      cgst: acc.cgst + parseFloat(item.total_cgst || 0),
      sgst: acc.sgst + parseFloat(item.total_sgst || 0),
      igst: acc.igst + parseFloat(item.total_igst || 0),
      gst: acc.gst + parseFloat(item.total_gst || 0),
      total: acc.total + parseFloat(item.total_amount || 0),
      count: acc.count + parseInt(item.invoice_count || 0)
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0, count: 0 });
  };
  
  const totals = calculateTotals();
  
  const COLORS = ['#4169E1', '#10B981', '#F59E0B', '#EF4444'];
  
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('gstDashboard')}</h1>
          <p className="text-gray-600 mt-1">{t('gstSummaryAndReports')}</p>
        </div>
        
        <button
          onClick={() => navigate('/gst/invoice/new')}
          className="btn-primary"
        >
          + {t('createGSTInvoice')}
        </button>
      </div>
      
      {/* Date Range Filter */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('startDate')}
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endDate')}
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} className="btn-primary w-full">
              {t('filter')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">{t('totalInvoices')}</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{totals.count}</p>
            </div>
            <div className="text-blue-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">{t('taxableAmount')}</p>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {formatIndianCurrency(totals.taxable)}
              </p>
            </div>
            <div className="text-green-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">{t('totalGST')}</p>
              <p className="text-2xl font-bold text-yellow-900 mt-2">
                {formatIndianCurrency(totals.gst)}
              </p>
            </div>
            <div className="text-yellow-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">{t('totalAmount')}</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {formatIndianCurrency(totals.total)}
              </p>
            </div>
            <div className="text-purple-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* GST Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('gstBreakdown')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">CGST</span>
              <span className="text-lg font-bold text-blue-600">
                {formatIndianCurrency(totals.cgst)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">SGST</span>
              <span className="text-lg font-bold text-green-600">
                {formatIndianCurrency(totals.sgst)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">IGST</span>
              <span className="text-lg font-bold text-purple-600">
                {formatIndianCurrency(totals.igst)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('invoiceTypeBreakdown')}</h2>
          {summary.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={summary}
                  dataKey="total_amount"
                  nameKey="invoice_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {summary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatIndianCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {t('noDataAvailable')}
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('gstReports')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/gst/reports/gstr1')}
            className="p-4 border-2 border-primary-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
          >
            <h3 className="font-semibold text-primary-600">GSTR-1</h3>
            <p className="text-sm text-gray-600 mt-1">{t('outwardSuppliesReport')}</p>
          </button>
          
          <button
            onClick={() => navigate('/gst/reports/gstr3b')}
            className="p-4 border-2 border-green-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <h3 className="font-semibold text-green-600">GSTR-3B</h3>
            <p className="text-sm text-gray-600 mt-1">{t('monthlySummaryReturn')}</p>
          </button>
          
          <button
            onClick={() => navigate('/gst/settings')}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-gray-500 hover:bg-gray-50 transition-all text-left"
          >
            <h3 className="font-semibold text-gray-700">{t('gstSettings')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('companyGSTDetails')}</p>
          </button>
        </div>
      </div>
      
      {/* Recent Invoices */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('recentInvoices')}</h2>
          <button
            onClick={() => navigate('/gst/invoices')}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            {t('viewAll')} →
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoiceNumber')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customer')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('type')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('amount')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('gst')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.slice(0, 10).map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => navigate(`/gst/invoice/${invoice.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
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
                    {formatIndianCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                    {formatIndianCurrency(invoice.total_gst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {invoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('noInvoicesFound')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GSTDashboard;
