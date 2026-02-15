import { useState, useEffect } from 'react';
import { proposalsAPI, customersAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Proposals = () => {
  const { t } = useLanguage();
  const [proposals, setProposals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  
  // Customer search and inline creation
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
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
    'Manufacturing', 'Finance', 'IT', 'Sales', 'Supply Chain', 'Law Firm',
    'Healthcare', 'Education', 'Retail', 'Technology', 'Construction',
    'Real Estate', 'Hospitality', 'Transportation', 'Other'
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
    { value: 'micro', labelKey: 'companySizeMicro' },
    { value: 'small', labelKey: 'companySizeSmall' },
    { value: 'medium', labelKey: 'companySizeMedium' },
    { value: 'large', labelKey: 'companySizeLarge' },
    { value: 'enterprise', labelKey: 'companySizeEnterprise' }
  ];
  
  const [formData, setFormData] = useState({
    customer_id: '',
    proposal_number: '',
    title: '',
    description: '',
    total_amount: '',
    status: 'draft',
    valid_until: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [proposalsRes, customersRes] = await Promise.all([
        proposalsAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setProposals(proposalsRes.data.proposals);
      setCustomers(customersRes.data.customers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProposal) {
        await proposalsAPI.update(editingProposal.id, formData);
      } else {
        await proposalsAPI.create(formData);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving proposal:', error);
      alert(t('failedToSaveProposal'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteProposal'))) return;
    
    try {
      await proposalsAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      alert(t('failedToDeleteProposal'));
    }
  };

  const openModal = (proposal = null) => {
    if (proposal) {
      setEditingProposal(proposal);
      setFormData({
        customer_id: proposal.customer_id,
        proposal_number: proposal.proposal_number,
        title: proposal.title,
        description: proposal.description,
        total_amount: proposal.total_amount,
        status: proposal.status,
        valid_until: proposal.valid_until ? new Date(proposal.valid_until).toISOString().split('T')[0] : '',
      });
    } else {
      setEditingProposal(null);
      const nextNumber = `PROP-${new Date().getFullYear()}-${String(proposals.length + 1).padStart(3, '0')}`;
      setFormData({
        customer_id: '',
        proposal_number: nextNumber,
        title: '',
        description: '',
        total_amount: '',
        status: 'draft',
        valid_until: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProposal(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNewCustomerChange = (e) => {
    setNewCustomerData({
      ...newCustomerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateNewCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await customersAPI.create(newCustomerData);
      const newCustomer = response.data.customer;
      
      // Add to customers list
      setCustomers([...customers, newCustomer]);
      
      // Set as selected customer in proposal form
      setFormData({
        ...formData,
        customer_id: newCustomer.id
      });
      
      // Close customer modal
      setShowCustomerModal(false);
      
      // Reset customer form
      setNewCustomerData({
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
      
      alert(t('successfullyCreated'));
    } catch (error) {
      console.error('Error creating customer:', error);
      const errorMessage = error.response?.data?.error || t('failedToCreateCustomer');
      alert(errorMessage);
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    c.company_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">{t('loadingProposals')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('proposals')}</h1>
        <button onClick={() => openModal()} className="btn-primary">
          + {t('createProposal')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card bg-gray-50">
          <div className="text-sm text-gray-600">{t('draft')}</div>
          <div className="text-2xl font-bold text-gray-600">
            {proposals.filter(p => p.status === 'draft').length}
          </div>
        </div>
        <div className="card bg-blue-50">
          <div className="text-sm text-gray-600">{t('sent')}</div>
          <div className="text-2xl font-bold text-blue-600">
            {proposals.filter(p => p.status === 'sent').length}
          </div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">{t('accepted')}</div>
          <div className="text-2xl font-bold text-green-600">
            {proposals.filter(p => p.status === 'accepted').length}
          </div>
        </div>
        <div className="card bg-red-50">
          <div className="text-sm text-gray-600">{t('rejected')}</div>
          <div className="text-2xl font-bold text-red-600">
            {proposals.filter(p => p.status === 'rejected').length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">{t('proposalHash')}</th>
                <th className="text-left py-3 px-4">{t('customer')}</th>
                <th className="text-left py-3 px-4">{t('title')}</th>
                <th className="text-left py-3 px-4">{t('amount')}</th>
                <th className="text-left py-3 px-4">{t('validUntil')}</th>
                <th className="text-left py-3 px-4">{t('status')}</th>
                <th className="text-left py-3 px-4">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{proposal.proposal_number}</td>
                  <td className="py-3 px-4">{proposal.customer_name}</td>
                  <td className="py-3 px-4">{proposal.title}</td>
                  <td className="py-3 px-4 font-bold text-primary-600">
                    ${parseFloat(proposal.total_amount).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(proposal.status)}`}>
                      {t(proposal.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openModal(proposal)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(proposal.id)}
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

      {/* Inline Customer Creation Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{t('createNewCustomer')}</h2>
            <form onSubmit={handleCreateNewCustomer} className="space-y-4">
              {/* Company Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3">{t('companyInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('companyName')} *
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={newCustomerData.company_name}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('sector')} *
                    </label>
                    <select
                      name="sector"
                      value={newCustomerData.sector}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      {sectors.map(sector => (
                        <option key={sector} value={sector}>{t('sector' + sector.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('companySize')}
                    </label>
                    <select
                      name="company_size"
                      value={newCustomerData.company_size}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                    >
                      <option value="">{t('selectSize')}</option>
                      {companySizes.map(size => (
                        <option key={size.value} value={size.value}>{t(size.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('businessType')} *
                    </label>
                    <select
                      name="business_type"
                      value={newCustomerData.business_type}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3">{t('contactInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contactPerson')} *
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={newCustomerData.contact_person}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contactDesignation')}
                    </label>
                    <input
                      type="text"
                      name="contact_designation"
                      value={newCustomerData.contact_designation}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('email')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newCustomerData.email}
                      onChange={handleNewCustomerChange}
                      className="input-field"
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
                      value={newCustomerData.phone}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address & Lead Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">{t('addressAndLeadInfo')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('address')}
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={newCustomerData.address}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('city')}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={newCustomerData.city}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('pincode')}
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={newCustomerData.pincode}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('country')}
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={newCustomerData.country}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('generationMode')} *
                    </label>
                    <select
                      name="generation_mode"
                      value={newCustomerData.generation_mode}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      {generationModes.map(mode => (
                        <option key={mode.value} value={mode.value}>{t(mode.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('createCustomer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingProposal ? t('editProposal') : t('createNewProposal')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('proposalNumber')} *
                  </label>
                  <input
                    type="text"
                    name="proposal_number"
                    value={formData.proposal_number}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('customer')} *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={`🔍 ${t('searchCustomer')}`}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="w-full text-left px-3 py-2 border border-dashed border-blue-500 rounded text-blue-600 hover:bg-blue-50 transition-colors text-sm"
                    >
                      + {t('createNewCustomer')}
                    </button>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('selectCustomer')}</option>
                      {filteredCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.company_name} - {customer.contact_person}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('title')} *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input-field"
                  rows="4"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('totalAmount')} *
                  </label>
                  <input
                    type="number"
                    name="total_amount"
                    value={formData.total_amount}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('status')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="draft">{t('draft')}</option>
                    <option value="sent">{t('sent')}</option>
                    <option value="accepted">{t('accepted')}</option>
                    <option value="rejected">{t('rejected')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('validUntil')}
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editingProposal ? t('updateProposal') : t('createProposal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proposals;
