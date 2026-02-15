import { useState, useEffect } from 'react';
import { dashboardAPI, salesAPI, costsAPI, customersAPI, opportunitiesAPI, leadsAPI } from '../services/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';
import MobileDashboard from '../components/MobileDashboard';
import FloatingActionButton from '../components/FloatingActionButton';

const Dashboard = () => {
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [stats, setStats] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  
  // New state for leads and opportunities
  const [leadsData, setLeadsData] = useState({ total: 0, active: 0 });
  const [highValueDeals, setHighValueDeals] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [modalType, setModalType] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendRes, revenueRes, leadsRes, oppsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getSalesTrend(period),
        dashboardAPI.getRevenue(),
        leadsAPI.getAll().catch(() => ({ data: { leads: [] } })),
        opportunitiesAPI.getAll().catch(() => ({ data: { opportunities: [] } })),
      ]);

      setStats(statsRes.data.stats);
      setSalesTrend(trendRes.data.trend);
      setRevenueData(revenueRes.data);
      
      // Process leads data
      const leads = leadsRes.data.leads || [];
      const activeLeads = leads.filter(l => l.status === 'active' || l.status === 'contacted' || l.status === 'qualified');
      setLeadsData({
        total: leads.length,
        active: activeLeads.length
      });
      
      // Process high-value deals (opportunities > $30,000)
      const opportunities = oppsRes.data.opportunities || [];
      const highValue = opportunities
        .filter(opp => parseFloat(opp.value) >= 30000 && opp.pipeline_stage !== 'closed_lost')
        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
        .slice(0, 5); // Top 5
      setHighValueDeals(highValue);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleTileClick = async (type) => {
    try {
      setLoading(true);
      let data = [];
      let title = '';

      switch (type) {
        case 'revenue':
          const salesRes = await salesAPI.getAll();
          data = salesRes.data.sales.filter(s => s.status === 'completed');
          title = t('completedSalesRevenueDetails');
          setModalType('sales');
          break;
        
        case 'costs':
          const costsRes = await costsAPI.getAll();
          data = costsRes.data.costs;
          title = t('allCostsExpenses');
          setModalType('costs');
          break;
        
        case 'profit':
          const [salesRes2, costsRes2] = await Promise.all([
            salesAPI.getAll(),
            costsAPI.getAll()
          ]);
          data = {
            sales: salesRes2.data.sales.filter(s => s.status === 'completed'),
            costs: costsRes2.data.costs
          };
          title = t('netProfitBreakdown');
          setModalType('profit');
          break;
        
        case 'customers':
          const customersRes = await customersAPI.getAll();
          data = customersRes.data.customers.filter(c => c.status === 'active');
          title = t('activeCustomers');
          setModalType('customers');
          break;
        
        case 'total_leads':
          const allLeadsRes = await leadsAPI.getAll();
          data = allLeadsRes.data.leads;
          title = t('allLeads');
          setModalType('leads');
          break;
        
        case 'active_leads':
          const activeLeadsRes = await leadsAPI.getAll();
          data = activeLeadsRes.data.leads.filter(l => 
            l.status === 'active' || l.status === 'contacted' || l.status === 'qualified'
          );
          title = t('activeLeads');
          setModalType('leads');
          break;
        
        case 'high_value_deals':
          const oppsRes = await opportunitiesAPI.getAll();
          data = oppsRes.data.opportunities
            .filter(opp => parseFloat(opp.value) >= 30000 && opp.pipeline_stage !== 'closed_lost')
            .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
          title = t('highValueDealsOver30000');
          setModalType('opportunities');
          break;
      }

      setModalData(data);
      setModalTitle(title);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData([]);
    setModalTitle('');
    setModalType('');
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('dashboard')}</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input-field w-40"
        >
          <option value="weekly">{t('weekly')}</option>
          <option value="monthly">{t('monthly')}</option>
          <option value="yearly">{t('yearly')}</option>
        </select>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => handleTileClick('revenue')}
          className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('totalRevenue')}</div>
          <div className="text-3xl font-bold mt-2">
            {formatIndianCurrency(stats?.total_revenue || 0)}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {stats?.recent_sales?.filter(s => s.status === 'completed').length || 0} {t('completedSales')}
          </div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewDetails')}</div>
        </div>

        <div 
          onClick={() => handleTileClick('costs')}
          className="card bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('totalCosts')}</div>
          <div className="text-3xl font-bold mt-2">
            {formatIndianCurrency(stats?.total_costs || 0)}
          </div>
          <div className="text-sm mt-2 opacity-90">{t('operatingExpenses')}</div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewDetails')}</div>
        </div>

        <div 
          onClick={() => handleTileClick('profit')}
          className="card bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('netProfit')}</div>
          <div className="text-3xl font-bold mt-2">
            {formatIndianCurrency(stats?.net_profit || 0)}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {stats?.net_profit > 0 ? t('positiveMargin') : t('needsAttention')}
          </div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewBreakdown')}</div>
        </div>

        <div 
          onClick={() => handleTileClick('customers')}
          className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('activeCustomers')}</div>
          <div className="text-3xl font-bold mt-2">
            {stats?.total_customers || 0}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {stats?.total_proposals || 0} {t('activeProposals')}
          </div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewList')}</div>
        </div>
      </div>

      {/* New Metrics Row - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => handleTileClick('total_leads')}
          className="card bg-gradient-to-br from-cyan-500 to-cyan-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('totalLeads')}</div>
          <div className="text-3xl font-bold mt-2">
            {leadsData.total}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {t('allLeadsInSystem')}
          </div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewDetails')}</div>
        </div>

        <div 
          onClick={() => handleTileClick('active_leads')}
          className="card bg-gradient-to-br from-teal-500 to-teal-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('activeLeads')}</div>
          <div className="text-3xl font-bold mt-2">
            {leadsData.active}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {t('currentlyBeingPursued')}
          </div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewDetails')}</div>
        </div>

        <div 
          onClick={() => handleTileClick('high_value_deals')}
          className="card bg-gradient-to-br from-amber-500 to-amber-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <div className="text-sm opacity-90">{t('highValueDeals')}</div>
          <div className="text-3xl font-bold mt-2">
            {highValueDeals.length}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {t('dealsOver30000')}
          </div>
          <div className="text-xs mt-2 opacity-75">{t('clickToViewDetails')}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('salesTrend')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatIndianCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="total_sales" stroke="#3b82f6" strokeWidth={2} name={t('sales')} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Costs */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('revenueVsCostsLast6Months')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData?.monthly_comparison || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatIndianCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name={t('revenue')} />
              <Bar dataKey="costs" fill="#ef4444" name={t('costs')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costs by Category */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('costsByCategory')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData?.costs_by_category || []}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.category}: ${formatIndianCurrency(entry.total)}`}
              >
                {(revenueData?.costs_by_category || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatIndianCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Sales */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">{t('recentSales')}</h2>
          <div className="space-y-3">
            {stats?.recent_sales?.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{sale.customer_name}</p>
                  <p className="text-sm text-gray-600">{sale.description}</p>
                  <p className="text-xs text-gray-500">{new Date(sale.sale_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {formatIndianCurrency(sale.amount)}
                  </p>
                  <p className={`text-xs px-2 py-1 rounded-full inline-block ${
                    sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sale.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High Value Deals Section */}
      {highValueDeals.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🎯 {t('highValueDeals')}</h2>
            <span className="text-sm text-gray-500">{t('dealsOver30000')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">{t('dealTitle')}</th>
                  <th className="text-left py-3 px-4">{t('customer')}</th>
                  <th className="text-left py-3 px-4">{t('value')}</th>
                  <th className="text-left py-3 px-4">{t('stage')}</th>
                  <th className="text-left py-3 px-4">{t('probability')}</th>
                  <th className="text-left py-3 px-4">{t('expectedClose')}</th>
                  <th className="text-left py-3 px-4">{t('assignedTo')}</th>
                </tr>
              </thead>
              <tbody>
                {highValueDeals.map((deal) => (
                  <tr key={deal.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{deal.title}</td>
                    <td className="py-3 px-4">{deal.customer_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-green-600 text-lg">
                        {formatIndianCurrency(deal.value)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        deal.pipeline_stage === 'negotiation' ? 'bg-orange-100 text-orange-800' :
                        deal.pipeline_stage === 'proposal' ? 'bg-yellow-100 text-yellow-800' :
                        deal.pipeline_stage === 'qualified' ? 'bg-blue-100 text-blue-800' :
                        deal.pipeline_stage === 'closed_won' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {deal.pipeline_stage.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${deal.closing_probability}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{deal.closing_probability}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {deal.expected_close_date 
                        ? new Date(deal.expected_close_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {deal.assigned_to_name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Total Weighted Value */}
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <div className="text-gray-600">
              <span className="font-medium">{t('totalPotentialRevenue')}:</span>
              <span className="ml-2 text-2xl font-bold text-green-600">
                {formatIndianCurrency(highValueDeals.reduce((sum, deal) => sum + parseFloat(deal.value), 0))}
              </span>
            </div>
            <div className="text-gray-600">
              <span className="font-medium">{t('weightedValue')}:</span>
              <span className="ml-2 text-2xl font-bold text-blue-600">
                {formatIndianCurrency(highValueDeals.reduce((sum, deal) => 
                  sum + (parseFloat(deal.value) * (deal.closing_probability / 100)), 0
                ))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-800">{modalTitle}</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {modalType === 'sales' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">{t('invoiceNumber')}</th>
                        <th className="text-left py-3 px-4">{t('customer')}</th>
                        <th className="text-left py-3 px-4">{t('date')}</th>
                        <th className="text-left py-3 px-4">{t('amount')}</th>
                        <th className="text-left py-3 px-4">{t('paymentMethod')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((sale) => (
                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{sale.invoice_number || '-'}</td>
                          <td className="py-3 px-4">{sale.customer_name}</td>
                          <td className="py-3 px-4">{new Date(sale.sale_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-bold text-green-600">
                            {formatIndianCurrency(sale.amount)}
                          </td>
                          <td className="py-3 px-4">{sale.payment_method || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan="3" className="py-3 px-4 text-right">{t('totalRevenue')}:</td>
                        <td className="py-3 px-4 text-green-600 text-xl">
                          {formatIndianCurrency(modalData.reduce((sum, s) => sum + parseFloat(s.amount), 0))}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {modalType === 'costs' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">{t('date')}</th>
                        <th className="text-left py-3 px-4">{t('category')}</th>
                        <th className="text-left py-3 px-4">{t('description')}</th>
                        <th className="text-left py-3 px-4">{t('vendor')}</th>
                        <th className="text-left py-3 px-4">{t('amount')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((cost) => (
                        <tr key={cost.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{new Date(cost.cost_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                              {cost.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">{cost.description}</td>
                          <td className="py-3 px-4">{cost.vendor || '-'}</td>
                          <td className="py-3 px-4 font-bold text-red-600">
                            {formatIndianCurrency(cost.amount)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              cost.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {cost.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan="4" className="py-3 px-4 text-right">{t('totalCosts')}:</td>
                        <td className="py-3 px-4 text-red-600 text-xl">
                          {formatIndianCurrency(modalData.reduce((sum, c) => sum + parseFloat(c.amount), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {modalType === 'profit' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-green-50">
                      <div className="text-sm text-gray-600">{t('totalRevenue')}</div>
                      <div className="text-3xl font-bold text-green-600">
                        {formatIndianCurrency(modalData.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0))}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {modalData.sales.length} {t('completedSales')}
                      </div>
                    </div>
                    <div className="card bg-red-50">
                      <div className="text-sm text-gray-600">{t('totalCosts')}</div>
                      <div className="text-3xl font-bold text-red-600">
                        {formatIndianCurrency(modalData.costs.reduce((sum, c) => sum + parseFloat(c.amount), 0))}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {modalData.costs.length} {t('expenses')}
                      </div>
                    </div>
                    <div className="card bg-blue-50">
                      <div className="text-sm text-gray-600">{t('netProfit')}</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {formatIndianCurrency(
                          modalData.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0) -
                          modalData.costs.reduce((sum, c) => sum + parseFloat(c.amount), 0)
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {(
                          (modalData.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0) -
                          modalData.costs.reduce((sum, c) => sum + parseFloat(c.amount), 0)) /
                          modalData.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0) * 100
                        ).toFixed(1)}% {t('margin')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-lg mb-3">{t('top5Sales')}</h3>
                      <div className="space-y-2">
                        {modalData.sales
                          .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
                          .slice(0, 5)
                          .map((sale) => (
                            <div key={sale.id} className="flex justify-between items-center p-3 bg-green-50 rounded">
                              <div>
                                <div className="font-medium">{sale.customer_name}</div>
                                <div className="text-sm text-gray-600">{sale.description}</div>
                              </div>
                              <div className="font-bold text-green-600">
                                {formatIndianCurrency(sale.amount)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-3">{t('top5Costs')}</h3>
                      <div className="space-y-2">
                        {modalData.costs
                          .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
                          .slice(0, 5)
                          .map((cost) => (
                            <div key={cost.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                              <div>
                                <div className="font-medium">{cost.category}</div>
                                <div className="text-sm text-gray-600">{cost.description}</div>
                              </div>
                              <div className="font-bold text-red-600">
                                {formatIndianCurrency(cost.amount)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'customers' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">{t('company')}</th>
                        <th className="text-left py-3 px-4">{t('contactPerson')}</th>
                        <th className="text-left py-3 px-4">{t('email')}</th>
                        <th className="text-left py-3 px-4">{t('phone')}</th>
                        <th className="text-left py-3 px-4">{t('location')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((customer) => (
                        <tr key={customer.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{customer.company_name}</td>
                          <td className="py-3 px-4">{customer.contact_person}</td>
                          <td className="py-3 px-4">{customer.email}</td>
                          <td className="py-3 px-4">{customer.phone}</td>
                          <td className="py-3 px-4">{customer.city}, {customer.country}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {customer.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {modalType === 'leads' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">{t('name')}</th>
                        <th className="text-left py-3 px-4">{t('company')}</th>
                        <th className="text-left py-3 px-4">{t('email')}</th>
                        <th className="text-left py-3 px-4">{t('phone')}</th>
                        <th className="text-left py-3 px-4">{t('source')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                        <th className="text-left py-3 px-4">{t('assignedTo')}</th>
                        <th className="text-left py-3 px-4">{t('created')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{lead.name}</td>
                          <td className="py-3 px-4">{lead.company || '-'}</td>
                          <td className="py-3 px-4">{lead.email}</td>
                          <td className="py-3 px-4">{lead.phone || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 capitalize">
                              {lead.source}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                              lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'converted' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">{lead.assigned_to_name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {modalData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {t('noLeadsFound')}
                    </div>
                  )}
                </div>
              )}

              {modalType === 'opportunities' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">{t('title')}</th>
                        <th className="text-left py-3 px-4">{t('customer')}</th>
                        <th className="text-left py-3 px-4">{t('value')}</th>
                        <th className="text-left py-3 px-4">{t('stage')}</th>
                        <th className="text-left py-3 px-4">{t('probability')}</th>
                        <th className="text-left py-3 px-4">{t('weightedValue')}</th>
                        <th className="text-left py-3 px-4">{t('expectedCloseDate')}</th>
                        <th className="text-left py-3 px-4">{t('assignedTo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((opp) => (
                        <tr key={opp.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{opp.title}</td>
                          <td className="py-3 px-4">{opp.customer_name}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-green-600">
                              {formatIndianCurrency(opp.value)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              opp.pipeline_stage === 'negotiation' ? 'bg-orange-100 text-orange-800' :
                              opp.pipeline_stage === 'proposal' ? 'bg-yellow-100 text-yellow-800' :
                              opp.pipeline_stage === 'qualified' ? 'bg-blue-100 text-blue-800' :
                              opp.pipeline_stage === 'closed_won' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {opp.pipeline_stage.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${opp.closing_probability}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{opp.closing_probability}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-blue-600">
                              {formatIndianCurrency(parseFloat(opp.value) * (opp.closing_probability / 100))}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {opp.expected_close_date 
                              ? new Date(opp.expected_close_date).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="py-3 px-4">{opp.assigned_to_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan="2" className="py-3 px-4 text-right">{t('totals')}:</td>
                        <td className="py-3 px-4 text-green-600">
                          {formatIndianCurrency(modalData.reduce((sum, o) => sum + parseFloat(o.value), 0))}
                        </td>
                        <td></td>
                        <td className="py-3 px-4">
                          {t('avg')}: {modalData.length > 0 
                            ? Math.round(modalData.reduce((sum, o) => sum + o.closing_probability, 0) / modalData.length)
                            : 0}%
                        </td>
                        <td className="py-3 px-4 text-blue-600">
                          {formatIndianCurrency(modalData.reduce((sum, o) => sum + (parseFloat(o.value) * (o.closing_probability / 100)), 0))}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                  {modalData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {t('noHighValueDealsFound')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={closeModal} className="btn-secondary">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
