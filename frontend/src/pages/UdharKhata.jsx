import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { formatIndianCurrency, formatIndianDate, formatRelativeTime } from '../utils/indianFormatters';
import { openWhatsApp, generatePaymentReminderMessage } from '../utils/whatsappUtils';
import { useLanguage } from '../context/LanguageContext';

const UdharKhata = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('amount'); // amount, days, name

  useEffect(() => {
    fetchUdharData();
  }, []);

  const fetchUdharData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customers/outstanding');
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching udhar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = (customer) => {
    const message = generatePaymentReminderMessage(
      customer.company_name,
      customer.outstanding_amount,
      language
    );
    openWhatsApp(customer.phone, message);
  };

  const handleRecordPayment = (customer) => {
    // Navigate to create sale page with pre-filled data
    navigate(`/sales?customer=${customer.id}&type=payment`);
  };

  const filteredCustomers = customers
    .filter(c =>
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'amount') {
        return b.outstanding_amount - a.outstanding_amount;
      } else if (sortBy === 'days') {
        return (b.days_since_last_payment || 0) - (a.days_since_last_payment || 0);
      } else {
        return a.company_name.localeCompare(b.company_name);
      }
    });

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding_amount || 0), 0);
  const totalCustomers = customers.length;

  const getRiskBadge = (days) => {
    if (!days) return { color: 'bg-gray-100 text-gray-800', text: t('newRisk') };
    if (days > 90) return { color: 'bg-red-100 text-red-800', text: t('dangerousRisk') };
    if (days > 60) return { color: 'bg-orange-100 text-orange-800', text: t('highRisk') };
    if (days > 30) return { color: 'bg-yellow-100 text-yellow-800', text: t('mediumRisk') };
    return { color: 'bg-green-100 text-green-800', text: t('lowRisk') };
  };

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📕 {t('udharKhata')}</h1>
          <p className="text-gray-600 mt-1">{t('trackOutstandingPayments')}</p>
        </div>
        <button 
          onClick={fetchUdharData}
          className="btn-secondary"
        >
          🔄 {t('refresh')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="text-sm text-gray-600 mb-1">{t('totalUdhar')}</div>
          <div className="text-3xl font-bold text-red-600">
            {formatIndianCurrency(totalOutstanding)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {totalCustomers} {t('customers')} {t('outstandingFrom')}
          </div>
        </div>

        <div className="card bg-blue-50 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">{t('avgOutstandingPerCustomer')}</div>
          <div className="text-3xl font-bold text-blue-600">
            {formatIndianCurrency(totalCustomers > 0 ? totalOutstanding / totalCustomers : 0)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {customers.filter(c => (c.days_since_last_payment || 0) > 30).length} {t('customersPending30Days')}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('searchCustomerName')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('amount')}
              className={`px-4 py-2 rounded-lg ${sortBy === 'amount' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              {t('sortByAmount')}
            </button>
            <button
              onClick={() => setSortBy('days')}
              className={`px-4 py-2 rounded-lg ${sortBy === 'days' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              {t('sortByDays')}
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-4 py-2 rounded-lg ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              {t('sortByName')}
            </button>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('congratulations')}</h3>
            <p className="text-gray-600">{t('noOutstandingAllPaid')}</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const riskBadge = getRiskBadge(customer.days_since_last_payment);
            
            return (
              <div
                key={customer.customer_id}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/customers/${customer.customer_id}`)}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Customer Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xl">
                        {customer.company_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {customer.company_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {customer.contact_person} • {customer.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskBadge.color}`}>
                        {riskBadge.text} {t('risk')}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {customer.pending_invoices} {t('billsPending')}
                      </span>
                      {customer.last_payment_date && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {t('lastPaymentColon')} {formatRelativeTime(customer.last_payment_date, language)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount and Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">{t('outstandingAmount')}</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatIndianCurrency(customer.outstanding_amount)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReminder(customer);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        title={t('sendReminder')}
                      >
                        <span>📱</span>
                        <span className="hidden md:inline">{t('reminder')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordPayment(customer);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <span>💰</span>
                        <span className="hidden md:inline">{t('payment')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment History Preview */}
                {customer.days_since_last_payment > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      {t('tipNoPaymentSince')} {customer.days_since_last_payment} {t('daysNoPayment')}
                      {customer.days_since_last_payment > 60 && ` ${t('followupImmediately')}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Empty State */}
      {customers.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📕</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('udharKhataEmpty')}</h3>
          <p className="text-gray-600 mb-4">
            {t('noOutstandingPayments')}
          </p>
          <button
            onClick={() => navigate('/sales')}
            className="btn-primary"
          >
            {t('addNewSale')}
          </button>
        </div>
      )}
    </div>
  );
};

export default UdharKhata;
