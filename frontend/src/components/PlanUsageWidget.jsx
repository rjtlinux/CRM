import { useEffect, useState } from 'react';
import api from '../services/api';

const PlanUsageWidget = () => {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plan/current');
      setPlanData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch plan data:', err);
      setError('Unable to load plan information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (!planData) return null;

  const { plan, limits, usage, warnings, features } = planData;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">{plan.displayName} Plan</h3>
            <p className="text-sm text-primary-100">
              {plan.price > 0 ? `₹${plan.price.toLocaleString('en-IN')}/month` : 'Custom Pricing'}
            </p>
          </div>
          {plan.name !== 'enterprise' && (
            <button 
              onClick={() => window.location.href = '/upgrade'}
              className="px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition font-medium text-sm"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-800 font-semibold text-sm mb-1">⚠️ Usage Alerts</p>
                {warnings.map((warning, idx) => (
                  <p key={idx} className="text-sm text-yellow-700">
                    <span className="font-medium">{warning.label}:</span> {warning.current.toLocaleString()}/{warning.limit.toLocaleString()} ({warning.percent}% used)
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Usage Bars */}
        <div className="space-y-5">
          <UsageBar 
            label="Customers" 
            current={usage.customers_count || 0} 
            limit={limits.max_customers} 
          />
          <UsageBar 
            label="Users" 
            current={usage.users_count || 0} 
            limit={limits.max_users} 
          />
          <UsageBar 
            label="Transactions (This Month)" 
            current={usage.transactions_this_month || 0} 
            limit={limits.max_transactions_monthly} 
          />
          {features.ai_voice && (
            <UsageBar 
              label="AI Commands (This Month)" 
              current={usage.ai_commands_this_month || 0} 
              limit={limits.max_ai_commands_monthly} 
            />
          )}
        </div>

        {/* Feature Highlights */}
        {plan.name !== 'enterprise' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Features in your plan:</p>
            <div className="flex flex-wrap gap-2">
              {features.whatsapp && <FeatureBadge label="WhatsApp" />}
              {features.ai_voice && <FeatureBadge label="AI Voice" />}
              {features.advanced_analytics && <FeatureBadge label="Analytics" />}
              {features.custom_reports && <FeatureBadge label="Reports" />}
              {features.priority_support && <FeatureBadge label="Priority Support" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UsageBar = ({ label, current, limit }) => {
  if (limit === -1 || limit === null || limit === undefined) {
    return (
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-green-600 font-medium">Unlimited ✓</span>
        </div>
        <div className="text-xs text-gray-500">
          Current: {current.toLocaleString('en-IN')}
        </div>
      </div>
    );
  }

  const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const color = percent >= 100 ? 'bg-red-500' : 
                percent >= 90 ? 'bg-yellow-500' : 
                percent >= 75 ? 'bg-orange-500' : 
                'bg-green-500';

  const barColor = percent >= 100 ? 'from-red-500 to-red-600' : 
                   percent >= 90 ? 'from-yellow-500 to-yellow-600' : 
                   percent >= 75 ? 'from-orange-500 to-orange-600' : 
                   'from-green-500 to-green-600';

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-medium ${percent >= 90 ? 'text-red-600' : 'text-gray-600'}`}>
          {current.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`bg-gradient-to-r ${barColor} h-3 rounded-full transition-all duration-500 ease-out relative`}
          style={{ width: `${percent}%` }}
        >
          {percent > 10 && (
            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white">
              {percent}%
            </span>
          )}
        </div>
      </div>
      {percent >= 90 && (
        <p className="text-xs text-red-600 mt-1">
          {percent >= 100 ? '⚠️ Limit reached - upgrade to continue' : '⚠️ Approaching limit'}
        </p>
      )}
    </div>
  );
};

const FeatureBadge = ({ label }) => (
  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
    {label}
  </span>
);

export default PlanUsageWidget;
