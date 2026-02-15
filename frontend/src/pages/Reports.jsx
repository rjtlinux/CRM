import { useState, useEffect } from 'react';
import { dashboardAPI, salesAPI, costsAPI } from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';

const Reports = () => {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState('monthly');
  const [salesData, setSalesData] = useState([]);
  const [costsData, setCostsData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [salesRes, costsRes, revenueRes] = await Promise.all([
        salesAPI.getAll(),
        costsAPI.getAll(),
        dashboardAPI.getRevenue(),
      ]);

      setSalesData(salesRes.data.sales);
      setCostsData(costsRes.data.costs);
      setRevenueData(revenueRes.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Calculate totals
  const totalRevenue = salesData
    .filter(s => s.status === 'completed')
    .reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
  
  const totalCosts = costsData.reduce((sum, cost) => sum + parseFloat(cost.amount), 0);
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

  // Sales by status
  const salesByStatus = salesData.reduce((acc, sale) => {
    const status = sale.status;
    if (!acc[status]) {
      acc[status] = { status, count: 0, total: 0 };
    }
    acc[status].count += 1;
    acc[status].total += parseFloat(sale.amount);
    return acc;
  }, {});

  const salesStatusData = Object.values(salesByStatus);

  // Costs by category
  const costsByCategory = costsData.reduce((acc, cost) => {
    const category = cost.category;
    if (!acc[category]) {
      acc[category] = { category, total: 0 };
    }
    acc[category].total += parseFloat(cost.amount);
    return acc;
  }, {});

  const costsCategoryData = Object.values(costsByCategory);

  // Top customers by revenue
  const customerRevenue = salesData
    .filter(s => s.status === 'completed')
    .reduce((acc, sale) => {
      const customer = sale.customer_name || 'Unknown';
      if (!acc[customer]) {
        acc[customer] = { customer, revenue: 0 };
      }
      acc[customer].revenue += parseFloat(sale.amount);
      return acc;
    }, {});

  const topCustomers = Object.values(customerRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const getStatusLabel = (status) => {
    const keys = { completed: 'completed', pending: 'pending', cancelled: 'cancelled' };
    return t(keys[status] || status);
  };

  const getCategoryLabel = (cat) => {
    const keys = { Software: 'categorySoftware', Marketing: 'categoryMarketing', Operations: 'categoryOperations', Salaries: 'categorySalaries', Utilities: 'categoryUtilities', Office: 'categoryOffice', Travel: 'categoryTravel', Other: 'categoryOther' };
    return t(keys[cat] || cat);
  };

  if (loading) {
    return <div className="text-center py-8">{t('loadingReports')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('reportsAndAnalytics')}</h1>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('exportPdf')}</button>
          <button className="btn-primary">{t('exportExcel')}</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="text-sm opacity-90">{t('totalRevenue')}</div>
          <div className="text-3xl font-bold mt-2">{formatIndianCurrency(totalRevenue)}</div>
          <div className="text-sm mt-2 opacity-90">{salesData.length} {t('totalSalesLabel')}</div>
        </div>
        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="text-sm opacity-90">{t('totalCosts')}</div>
          <div className="text-3xl font-bold mt-2">{formatIndianCurrency(totalCosts)}</div>
          <div className="text-sm mt-2 opacity-90">{costsData.length} {t('expensesLabel')}</div>
        </div>
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="text-sm opacity-90">{t('netProfit')}</div>
          <div className="text-3xl font-bold mt-2">{formatIndianCurrency(netProfit)}</div>
          <div className="text-sm mt-2 opacity-90">{profitMargin}% {t('marginLabel')}</div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="text-sm opacity-90">{t('avgSaleValue')}</div>
          <div className="text-3xl font-bold mt-2">
            {formatIndianCurrency(salesData.length > 0 ? totalRevenue / salesData.length : 0)}
          </div>
          <div className="text-sm mt-2 opacity-90">{t('perTransaction')}</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('revenueVsCostsComparison')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData?.monthly_comparison || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatIndianCurrency(parseFloat(value))} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name={t('revenue')} />
              <Bar dataKey="costs" fill="#ef4444" name={t('costs')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('salesByStatus')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesStatusData}
                dataKey="total"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${getStatusLabel(entry.status)}: ${formatIndianCurrency(parseFloat(entry.total))}`}
              >
                {salesStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatIndianCurrency(parseFloat(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('costsByCategory')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costsCategoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={100} />
              <Tooltip formatter={(value) => formatIndianCurrency(parseFloat(value))} />
              <Bar dataKey="total" fill="#ef4444" name={t('totalCost')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('top5CustomersByRevenue')}</h2>
          <div className="space-y-4 mt-4">
            {topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.customer}</p>
                    <p className="text-sm text-gray-600">
                      {Math.round((customer.revenue / totalRevenue) * 100)}% {t('percentOfTotalRevenue')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    {formatIndianCurrency(customer.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('recentSalesSummary')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t('customer')}</th>
                  <th className="text-left py-2">{t('date')}</th>
                  <th className="text-right py-2">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {salesData.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b">
                    <td className="py-2">{sale.customer_name}</td>
                    <td className="py-2">{new Date(sale.sale_date).toLocaleDateString()}</td>
                    <td className="py-2 text-right font-medium">
                      {formatIndianCurrency(parseFloat(sale.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('recentCostsSummary')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t('category')}</th>
                  <th className="text-left py-2">{t('date')}</th>
                  <th className="text-right py-2">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {costsData.slice(0, 10).map((cost) => (
                  <tr key={cost.id} className="border-b">
                    <td className="py-2">{getCategoryLabel(cost.category)}</td>
                    <td className="py-2">{new Date(cost.cost_date).toLocaleDateString()}</td>
                    <td className="py-2 text-right font-medium">
                      {formatIndianCurrency(parseFloat(cost.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
