import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { customersAPI } from '../services/api';
import { formatIndianCurrency } from '../utils/indianFormatters';

const Customers = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    contact_designation: '',
    email: '',
    phone: '',
    address: '',
    pincode: '',
    city: '',
    country: '',
    sector: 'Other',
    business_type: 'new',
    generation_mode: 'web_enquiry',
    company_size: '',
    status: 'active',
    gstin: '',
    gst_state: '',
    gst_registration_type: 'regular',
    total_deal_amount: '',
  });

  const sectors = [
    'Manufacturing',
    'Finance',
    'IT',
    'Sales',
    'Supply Chain',
    'Law Firm',
    'Healthcare',
    'Education',
    'Retail',
    'Technology',
    'Construction',
    'Real Estate',
    'Hospitality',
    'Transportation',
    'Other'
  ];

  const businessTypes = [
    { value: 'new', labelKey: 'newBusiness' },
    { value: 'old', labelKey: 'oldBusiness' }
  ];

  const generationModes = [
    { value: 'cold_call', labelKey: 'coldCall' },
    { value: 'web_enquiry', labelKey: 'webEnquiry' },
    { value: 'exhibition', labelKey: 'exhibition' },
    { value: 'reference', labelKey: 'reference' }
  ];

  const companySizes = [
    { value: 'micro', label: 'Micro (1-10 employees)' },
    { value: 'small', label: 'Small (11-50 employees)' },
    { value: 'medium', label: 'Medium (51-250 employees)' },
    { value: 'large', label: 'Large (251-1000 employees)' },
    { value: 'enterprise', label: 'Enterprise (1000+ employees)' }
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersAPI.getAll();
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, formData);
      } else {
        await customersAPI.create(formData);
      }
      fetchCustomers();
      closeModal();
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.error || t('failedToSave');
      alert(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    
    try {
      await customersAPI.delete(id);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(t('failedToDelete'));
    }
  };

  const openModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        company_name: '',
        contact_person: '',
        contact_designation: '',
        email: '',
        phone: '',
        address: '',
        pincode: '',
        city: '',
        country: '',
        sector: 'Other',
        business_type: 'new',
        generation_mode: 'web_enquiry',
        company_size: '',
        status: 'active',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleExpanded = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('customers')}</h1>
        <button onClick={() => openModal()} className="btn-primary whitespace-nowrap">
          + {t('add')} {t('customer')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="card">
        <input
          type="text"
          placeholder={`${t('search')} ${t('customers')}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
        />
      </div>

      {/* Customer Cards - Compact View */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => {
          const totalDealAmount = parseFloat(customer.total_deal_amount) || 0;
          const totalReceived = parseFloat(customer.total_received || 0);
          const totalOutstanding = parseFloat(customer.total_outstanding || 0);
          const isExpanded = expandedCustomer === customer.id;

          return (<div key={customer.id} className="card hover:shadow-lg transition-shadow">
              {/* Compact View */}
              <div className="p-4">
                {/* Top row: Name + Actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{customer.company_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.status === 'active' ? t('active') : t('inactive')}
                      </span>
                      {customer.phone && <span className="text-sm text-gray-500 truncate">{customer.phone}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => toggleExpanded(customer.id)}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      onClick={() => openModal(customer)}
                      className="text-blue-600 hover:text-blue-800 px-1"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-800 px-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Financial summary - responsive grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">{t('totalDealAmount')}</p>
                    <p className="font-bold text-blue-600 text-sm sm:text-base truncate">{formatIndianCurrency(totalDealAmount)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">{t('received')}</p>
                    <p className="font-bold text-green-600 text-sm sm:text-base truncate">{formatIndianCurrency(totalReceived)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">{t('outstanding')}</p>
                    <p className={`font-bold text-sm sm:text-base truncate ${totalOutstanding > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {formatIndianCurrency(totalOutstanding)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-600">{t('contactPerson')}</p>
                      <p className="font-medium">{customer.contact_person || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('designation')}</p>
                      <p className="font-medium">{customer.contact_designation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('email')}</p>
                      <p className="font-medium">{customer.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('address')}</p>
                      <p className="font-medium">{customer.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('city')}</p>
                      <p className="font-medium">{customer.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('country')}</p>
                      <p className="font-medium">{customer.country || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('sector')}</p>
                      <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {customer.sector || t('other')}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('businessType')}</p>
                      <p className="font-medium">{customer.business_type === 'new' ? t('newBusiness') : t('oldBusiness')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('companySize')}</p>
                      <p className="font-medium">{customer.company_size || '-'}</p>
                    </div>
                    {customer.gstin && (
                      <div>
                        <p className="text-xs text-gray-600">GSTIN</p>
                        <p className="font-medium">{customer.gstin}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-3">
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingCustomer ? t('editCustomer') : t('createCustomer')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Information */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('companyInformation')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      value={formData.company_name}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., Acme Corporation"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('sector')} *
                    </label>
                    <select
                      name="sector"
                      value={formData.sector}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      {sectors.map((sector) => (
                        <option key={sector} value={sector}>{sector === 'Other' ? t('other') : sector}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('companySize')} *
                    </label>
                    <select
                      name="company_size"
                      value={formData.company_size}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('select')} {t('companySize')}</option>
                      {companySizes.map((size) => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('businessType')} *
                    </label>
                    <select
                      name="business_type"
                      value={formData.business_type}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      {businessTypes.map((type) => (
                        <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('contactInformation')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contactPerson')} *
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contactDesignation')} *
                    </label>
                    <input
                      type="text"
                      name="contact_designation"
                      value={formData.contact_designation}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., CEO, Manager, Director"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('email')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="john@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('phone')} *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="+91-9876543210"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('addressInformation')}</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('address')} *
                    </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Street address"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      value={formData.city}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., Mumbai"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('pincode')} *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="400001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('country')} *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., India"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Lead Information */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('leadInformation')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('generationMode')} *
                    </label>
                    <select
                      name="generation_mode"
                      value={formData.generation_mode}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      {generationModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>{t(mode.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('status')} *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="active">{t('active')}</option>
                      <option value="inactive">{t('inactive')}</option>
                    </select>
                  </div>

                  {/* GST Details */}
                  <div className="sm:col-span-2 border-t border-gray-200 pt-4 mt-4 mb-2">
                    <h3 className="text-base font-semibold text-gray-900">{t('gstDetails')}</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="27AAAAA0000A1Z5"
                      pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}Z[0-9A-Z]{1}"
                      maxLength="15"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('gstinFormat')}: 15 {t('characters')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('gstState')}
                    </label>
                    <input
                      type="text"
                      name="gst_state"
                      value={formData.gst_state}
                      onChange={handleChange}
                      className="input-field"
                      placeholder={t('stateName')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('gstRegistrationType')}
                    </label>
                    <select
                      name="gst_registration_type"
                      value={formData.gst_registration_type}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="regular">{t('regular')}</option>
                      <option value="composition">{t('composition')}</option>
                      <option value="unregistered">{t('unregistered')}</option>
                    </select>
                  </div>

                  {/* Total Deal Amount - Only for new customers */}
                  {!editingCustomer && (
                    <div className="sm:col-span-2 border-t border-gray-200 pt-4 mt-4">
                      <h3 className="text-base font-semibold text-gray-900 mb-3">
                        {t('totalDealAmount')} ({t('optional')})
                      </h3>
                      <div className="max-w-md">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('totalDealAmount')} (₹)
                        </label>
                        <input
                          type="number"
                          name="total_deal_amount"
                          value={formData.total_deal_amount}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t('totalDealAmountHelp')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editingCustomer ? t('update') : t('create')} {t('customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
