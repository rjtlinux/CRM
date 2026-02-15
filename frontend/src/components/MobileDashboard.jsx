import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { formatIndianCurrency, formatIndianShort } from '../utils/indianFormatters';
import { useLanguage } from '../context/LanguageContext';

const MobileDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const mainTiles = [
    {
      title: t('udharKhata'),
      value: stats?.total_outstanding || 0,
      subtitle: `${stats?.customers_with_outstanding || 0} ${t('customers')}`,
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      bgGradient: 'from-red-500 to-red-600',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
      action: () => navigate('/udhar-khata')
    },
    {
      title: t('totalRevenue'),
      value: stats?.total_sales || 0,
      subtitle: t('thisMonth'),
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgGradient: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
      action: () => navigate('/sales')
    },
    {
      title: t('opportunities'),
      value: stats?.active_opportunities || 0,
      subtitle: t('active'),
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      bgGradient: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
      action: () => navigate('/opportunities')
    },
  ];

  const quickActions = [
    {
      label: t('addSale'),
      icon: '💰',
      action: () => navigate('/sales'),
      color: 'bg-green-500'
    },
    {
      label: t('addCustomer'),
      icon: '👥',
      action: () => navigate('/customers'),
      color: 'bg-blue-500'
    },
    {
      label: t('createOpportunity'),
      icon: '💼',
      action: () => navigate('/opportunities'),
      color: 'bg-purple-500'
    },
    {
      label: t('recordPayment'),
      icon: '💳',
      action: () => navigate('/sales'),
      color: 'bg-accent-500'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {t('welcome')} 👋
        </h1>
        <p className="text-gray-600 mt-1">{t('dashboard')}</p>
      </div>

      {/* Main 3 Big Tiles */}
      <div className="grid grid-cols-1 gap-4">
        {mainTiles.map((tile, index) => (
          <button
            key={index}
            onClick={tile.action}
            className="w-full text-left active:scale-98 transition-transform"
            style={{ minHeight: '120px' }}
          >
            <div className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all ${tile.bgLight} border-2 border-transparent hover:border-${tile.textColor.split('-')[1]}-200`}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {tile.title}
                    </p>
                    <p className={`text-3xl md:text-4xl font-bold ${tile.textColor} mb-2`}>
                      {typeof tile.value === 'number' 
                        ? (tile.title.includes(t('udharKhata')) || tile.title.includes(t('totalRevenue'))
                            ? formatIndianShort(tile.value)
                            : tile.value)
                        : tile.value
                      }
                    </p>
                    <p className="text-sm text-gray-500">
                      {tile.subtitle}
                    </p>
                  </div>
                  <div className={`${tile.textColor} opacity-80`}>
                    {tile.icon}
                  </div>
                </div>
              </div>
              
              {/* Decorative gradient overlay */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${tile.bgGradient} opacity-5 rounded-full transform translate-x-10 -translate-y-10`} />
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-md hover:shadow-lg`}
              style={{ minHeight: '100px', minWidth: '44px' }}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className="text-sm font-medium text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {stats?.active_customers || 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">{t('customers')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {stats?.active_leads || 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">{t('leads')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">
            {formatIndianShort(stats?.net_profit || 0)}
          </p>
          <p className="text-xs text-gray-600 mt-1">{t('profit')}</p>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
