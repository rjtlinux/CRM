import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { customersAPI } from '../services/api';

const Customers = () => {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
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

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('customers')}</h1>
        <button onClick={() => openModal()} className="btn-primary">
          + {t('add')} {t('customer')}
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">{t('company')}</th>
                <th className="text-left py-3 px-4">{t('contactPerson')}</th>
                <th className="text-left py-3 px-4">{t('email')}</th>
                <th className="text-left py-3 px-4">{t('phone')}</th>
                <th className="text-left py-3 px-4">{t('location')}</th>
                <th className="text-left py-3 px-4">{t('sector')}</th>
                <th className="text-left py-3 px-4">{t('status')}</th>
                <th className="text-left py-3 px-4">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{customer.company_name}</td>
                  <td className="py-3 px-4">{customer.contact_person}</td>
                  <td className="py-3 px-4">{customer.email}</td>
                  <td className="py-3 px-4">{customer.phone}</td>
                  <td className="py-3 px-4">{customer.city}, {customer.country}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {customer.sector || t('other')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.status === 'active' ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openModal(customer)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingCustomer ? t('editCustomer') : t('createCustomer')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Information */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('companyInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('companyName')} *
                    </label>
                    <input
                      type="text"
                      name="company_name"
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

                <div className="grid grid-cols-2 gap-4 mt-4">
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
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4 mt-4">
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

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('city')} *
                    </label>
                    <input
                      type="text"
                      name="city"
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
                <div className="grid grid-cols-2 gap-4">
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
