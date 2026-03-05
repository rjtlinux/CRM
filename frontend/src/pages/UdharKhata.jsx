import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { customersAPI, salesAPI } from '../services/api';
import { formatIndianCurrency, formatIndianDate, formatRelativeTime } from '../utils/indianFormatters';
import { openWhatsApp, generatePaymentReminderMessage } from '../utils/whatsappUtils';
import { useLanguage } from '../context/LanguageContext';

const defaultSaleForm = {
  customer_id: '',
  amount: '',
  description: '',
  invoice_number: '',
  sale_date: new Date().toISOString().split('T')[0],
  payment_method: 'udhar',
  status: 'pending',
};

const defaultCustomerForm = {
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  status: 'active',
};

const UdharKhata = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('amount');

  // Record Udhar Modal
  const [showModal, setShowModal] = useState(false);
  const [saleForm, setSaleForm] = useState(defaultSaleForm);
  const [saving, setSaving] = useState(false);

  // Customer search within modal
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  // Inline create new customer
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState(defaultCustomerForm);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  useEffect(() => {
    fetchUdharData();
    fetchAllCustomers();
  }, []);

  const fetchUdharData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/udhar-khata/outstanding');
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching udhar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const res = await customersAPI.getAll();
      setAllCustomers(res.data.customers || []);
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  const openModal = async () => {
    // Auto-fetch last invoice number
    let nextInvoice = '';
    try {
      const res = await salesAPI.getAll();
      const sales = res.data.sales || [];
      if (sales.length > 0) {
        // Find highest numeric invoice number
        const nums = sales
          .map(s => parseInt(s.invoice_number, 10))
          .filter(n => !isNaN(n));
        if (nums.length > 0) {
          nextInvoice = String(Math.max(...nums) + 1);
        }
      }
      if (!nextInvoice) nextInvoice = '1';
    } catch (e) {
      nextInvoice = '';
    }
    setSaleForm({ ...defaultSaleForm, invoice_number: nextInvoice, sale_date: new Date().toISOString().split('T')[0] });
    setCustomerSearchQuery('');
    setSelectedCustomerName('');
    setShowCreateCustomer(false);
    setCustomerForm(defaultCustomerForm);
    setShowModal(true);
  };

  const handleCustomerSelect = (cust) => {
    setSaleForm(prev => ({ ...prev, customer_id: cust.id }));
    setSelectedCustomerName(cust.company_name || cust.contact_person);
    setCustomerSearchQuery(cust.company_name || cust.contact_person);
    setShowCustomerDropdown(false);
    setShowCreateCustomer(false);
  };

  const filteredCustomerList = allCustomers.filter(c => {
    const q = customerSearchQuery.toLowerCase();
    return (
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.contact_person || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  });

  const handleCreateCustomer = async () => {
    if (!customerForm.company_name && !customerForm.contact_person) {
      alert(t('pleaseEnterName'));
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await customersAPI.create(customerForm);
      const newCust = res.data.customer || res.data;
      await fetchAllCustomers();
      handleCustomerSelect(newCust);
      setShowCreateCustomer(false);
      setCustomerForm(defaultCustomerForm);
    } catch (e) {
      console.error('Error creating customer:', e);
      alert(t('customerCreateError'));
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!saleForm.customer_id) {
      alert(t('pleaseSelectCustomer'));
      return;
    }
    setSaving(true);
    try {
      await salesAPI.create({ ...saleForm, status: 'pending' });
      setShowModal(false);
      fetchUdharData();
    } catch (error) {
      console.error('Error recording udhar:', error);
      alert(t('udharRecordError'));
    } finally {
      setSaving(false);
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
    navigate(`/sales?customer=${customer.customer_id}&type=payment`);
  };

  const filteredCustomers = customers
    .filter(c =>
      (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'amount') return b.outstanding_amount - a.outstanding_amount;
      if (sortBy === 'days') return (b.days_since_last_payment || 0) - (a.days_since_last_payment || 0);
      return (a.company_name || '').localeCompare(b.company_name || '');
    });

  const totalOutstanding = customers.reduce((sum, c) => sum + parseFloat(c.outstanding_amount || 0), 0);
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
        <div className="flex gap-3">
          <button onClick={fetchUdharData} className="btn-secondary">
            🔄 {t('refresh')}
          </button>
          <button onClick={openModal} className="btn-primary">
            + {t('recordUdhar')}
          </button>
        </div>
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
            {['amount', 'days', 'name'].map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-4 py-2 rounded-lg ${sortBy === s ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                {s === 'amount' ? t('sortByAmount') : s === 'days' ? t('sortByDays') : t('sortByName')}
              </button>
            ))}
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
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xl">
                        {(customer.company_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{customer.company_name}</h3>
                        <p className="text-sm text-gray-600">{customer.contact_person} • {customer.phone}</p>
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

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">{t('outstandingAmount')}</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatIndianCurrency(customer.outstanding_amount)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendReminder(customer); }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        title={t('sendReminder')}
                      >
                        <span>📱</span>
                        <span className="hidden md:inline">{t('reminder')}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRecordPayment(customer); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <span>💰</span>
                        <span className="hidden md:inline">{t('payment')}</span>
                      </button>
                    </div>
                  </div>
                </div>

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
          <p className="text-gray-600 mb-4">{t('noOutstandingPayments')}</p>
          <button onClick={openModal} className="btn-primary">
            + {t('recordUdhar')}
          </button>
        </div>
      )}

      {/* Record Udhar Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">📕 {t('recordUdhar')}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSaleSubmit} className="p-6 space-y-4">
              {/* Customer Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('customerParty')} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                      if (selectedCustomerName !== e.target.value) {
                        setSaleForm(prev => ({ ...prev, customer_id: '' }));
                        setSelectedCustomerName('');
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={t('searchByNameOrPhone')}
                    className="input-field"
                    autoComplete="off"
                  />
                  {showCustomerDropdown && customerSearchQuery.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredCustomerList.length > 0 ? (
                        filteredCustomerList.slice(0, 8).map(c => (
                          <div
                            key={c.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onMouseDown={() => handleCustomerSelect(c)}
                          >
                            <div className="font-medium text-gray-900">{c.company_name || c.contact_person}</div>
                            {c.contact_person && c.company_name && (
                              <div className="text-xs text-gray-500">{c.contact_person} • {c.phone}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm">
                          {t('noCustomerFound')}{' '}
                          <button
                            type="button"
                            className="text-blue-600 font-medium hover:underline"
                            onMouseDown={() => {
                              setShowCustomerDropdown(false);
                              setShowCreateCustomer(true);
                              setCustomerForm(prev => ({
                                ...prev,
                                company_name: customerSearchQuery,
                              }));
                            }}
                          >
                            {t('createNewCustomer')} →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!saleForm.customer_id && !showCreateCustomer && (
                  <button
                    type="button"
                    className="mt-1 text-sm text-blue-600 hover:underline"
                    onClick={() => setShowCreateCustomer(true)}
                  >
                    + {t('createNewCustomer')}
                  </button>
                )}
              </div>

              {/* Inline Create Customer */}
              {showCreateCustomer && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-blue-800">{t('createNewCustomer')}</h3>
                    <button type="button" onClick={() => setShowCreateCustomer(false)} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('companyOrName')} *</label>
                      <input
                        type="text"
                        value={customerForm.company_name}
                        onChange={e => setCustomerForm(p => ({ ...p, company_name: e.target.value }))}
                        placeholder="Ramesh Traders"
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('contactPerson')}</label>
                      <input
                        type="text"
                        value={customerForm.contact_person}
                        onChange={e => setCustomerForm(p => ({ ...p, contact_person: e.target.value }))}
                        placeholder="Ramesh Kumar"
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('phone')}</label>
                      <input
                        type="tel"
                        value={customerForm.phone}
                        onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="9876543210"
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('city')}</label>
                      <input
                        type="text"
                        value={customerForm.city}
                        onChange={e => setCustomerForm(p => ({ ...p, city: e.target.value }))}
                        placeholder="Mumbai"
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    disabled={creatingCustomer}
                    className="btn-primary text-sm w-full"
                  >
                    {creatingCustomer ? t('creating') : `✓ ${t('createCustomer')}`}
                  </button>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount')} (₹) *</label>
                <input
                  type="number"
                  value={saleForm.amount}
                  onChange={e => setSaleForm(p => ({ ...p, amount: e.target.value }))}
                  required
                  min="1"
                  placeholder="5000"
                  className="input-field"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
                <input
                  type="text"
                  value={saleForm.description}
                  onChange={e => setSaleForm(p => ({ ...p, description: e.target.value }))}
                  placeholder={t('goodsServicesPlaceholder')}
                  className="input-field"
                />
              </div>

              {/* Invoice + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('billNumber')}</label>
                  <input
                    type="text"
                    value={saleForm.invoice_number}
                    onChange={e => setSaleForm(p => ({ ...p, invoice_number: e.target.value }))}
                    placeholder="1"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
                  <input
                    type="date"
                    value={saleForm.sale_date}
                    onChange={e => setSaleForm(p => ({ ...p, sale_date: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? t('recording') : `📕 ${t('recordUdhar')}`}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UdharKhata;
