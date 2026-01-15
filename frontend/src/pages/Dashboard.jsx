import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendRes, revenueRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getSalesTrend(period),
        dashboardAPI.getRevenue(),
      ]);

      setStats(statsRes.data.stats);
      setSalesTrend(trendRes.data.trend);
      setRevenueData(revenueRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input-field w-40"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="text-sm opacity-90">Total Revenue</div>
          <div className="text-3xl font-bold mt-2">
            ${stats?.total_revenue?.toLocaleString() || 0}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {stats?.recent_sales?.length || 0} completed sales
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="text-sm opacity-90">Total Costs</div>
          <div className="text-3xl font-bold mt-2">
            ${stats?.total_costs?.toLocaleString() || 0}
          </div>
          <div className="text-sm mt-2 opacity-90">Operating expenses</div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="text-sm opacity-90">Net Profit</div>
          <div className="text-3xl font-bold mt-2">
            ${stats?.net_profit?.toLocaleString() || 0}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {stats?.net_profit > 0 ? 'Positive margin' : 'Needs attention'}
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="text-sm opacity-90">Active Customers</div>
          <div className="text-3xl font-bold mt-2">
            {stats?.total_customers || 0}
          </div>
          <div className="text-sm mt-2 opacity-90">
            {stats?.total_proposals || 0} active proposals
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="total_sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Costs */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Revenue vs Costs (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData?.monthly_comparison || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              <Bar dataKey="costs" fill="#ef4444" name="Costs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costs by Category */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Costs by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData?.costs_by_category || []}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.category}: $${parseFloat(entry.total).toLocaleString()}`}
              >
                {(revenueData?.costs_by_category || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Sales */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Sales</h2>
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
                    ${parseFloat(sale.amount).toLocaleString()}
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
    </div>
  );
};

export default Dashboard;
