import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opportunitiesAPI, customersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';

const Opportunities = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'list'
  const [selectedStage, setSelectedStage] = useState('all');
  
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

  const sectorOptions = [
    { value: 'Manufacturing', labelKey: 'sectorManufacturing' },
    { value: 'Finance', labelKey: 'sectorFinance' },
    { value: 'IT', labelKey: 'sectorIT' },
    { value: 'Sales', labelKey: 'sectorSales' },
    { value: 'Supply Chain', labelKey: 'sectorSupplyChain' },
    { value: 'Law Firm', labelKey: 'sectorLawFirm' },
    { value: 'Healthcare', labelKey: 'sectorHealthcare' },
    { value: 'Education', labelKey: 'sectorEducation' },
    { value: 'Retail', labelKey: 'sectorRetail' },
    { value: 'Technology', labelKey: 'sectorTechnology' },
    { value: 'Construction', labelKey: 'sectorConstruction' },
    { value: 'Real Estate', labelKey: 'sectorRealEstate' },
    { value: 'Hospitality', labelKey: 'sectorHospitality' },
    { value: 'Transportation', labelKey: 'sectorTransportation' },
    { value: 'Other', labelKey: 'sectorOther' }
  ];

  const sourceOptions = [
    { value: 'website', labelKey: 'website' },
    { value: 'referral', labelKey: 'referral' },
    { value: 'cold_call', labelKey: 'coldCall' },
    { value: 'conference', labelKey: 'conference' },
    { value: 'linkedin', labelKey: 'linkedin' },
    { value: 'inbound', labelKey: 'inbound' },
    { value: 'existing_customer', labelKey: 'existingCustomer' }
  ];
  
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    value: '',
    pipeline_stage: 'lead',
    closing_probability: 50,
    expected_close_date: '',
    assigned_to: user?.id || '',
    source: 'website',
  });

  const pipelineStages = [
    { key: 'lead', labelKey: 'lead', color: 'bg-gray-100 text-gray-800', icon: '🎯' },
    { key: 'qualified', labelKey: 'qualified', color: 'bg-blue-100 text-blue-800', icon: '✓' },
    { key: 'proposal', labelKey: 'proposal', color: 'bg-yellow-100 text-yellow-800', icon: '📄' },
    { key: 'negotiation', labelKey: 'negotiation', color: 'bg-orange-100 text-orange-800', icon: '💬' },
    { key: 'closed_won', labelKey: 'closedWon', color: 'bg-green-100 text-green-800', icon: '🎉' },
    { key: 'closed_lost', labelKey: 'closedLost', color: 'bg-red-100 text-red-800', icon: '❌' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [oppsRes, customersRes] = await Promise.all([
        opportunitiesAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setOpportunities(oppsRes.data.opportunities);
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
      if (editingOpportunity) {
        await opportunitiesAPI.update(editingOpportunity.id, formData);
      } else {
        await opportunitiesAPI.create(formData);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      alert(t('failedToSaveOpportunity'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
    
    try {
      await opportunitiesAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      alert('Failed to delete opportunity');
    }
  };

  const openModal = (opportunity = null) => {
    if (opportunity) {
      setEditingOpportunity(opportunity);
      setFormData({
        customer_id: opportunity.customer_id,
        title: opportunity.title,
        description: opportunity.description,
        value: opportunity.value,
        pipeline_stage: opportunity.pipeline_stage,
        closing_probability: opportunity.closing_probability,
        expected_close_date: opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toISOString().split('T')[0] : '',
        assigned_to: opportunity.assigned_to,
        source: opportunity.source,
      });
    } else {
      setEditingOpportunity(null);
      setFormData({
        customer_id: '',
        title: '',
        description: '',
        value: '',
        pipeline_stage: 'lead',
        closing_probability: 50,
        expected_close_date: '',
        assigned_to: user?.id || '',
        source: 'website',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOpportunity(null);
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
      
      // Set as selected customer in opportunity form
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
      
      alert(t('customerCreatedSuccess'));
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

  const getOpportunitiesByStage = (stage) => {
    return opportunities.filter(opp => opp.pipeline_stage === stage);
  };

  const getTotalValueByStage = (stage) => {
    return getOpportunitiesByStage(stage).reduce((sum, opp) => sum + parseFloat(opp.value || 0), 0);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'overdue': return 'border-l-4 border-red-500';
      case 'due_soon': return 'border-l-4 border-yellow-500';
      default: return 'border-l-4 border-green-500';
    }
  };

  const filteredOpportunities = selectedStage === 'all' 
    ? opportunities 
    : opportunities.filter(opp => opp.pipeline_stage === selectedStage);

  if (loading) {
    return <div className="text-center py-8">{t('loadingOpportunities')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('opportunitiesPipeline')}</h1>
          <p className="text-gray-600 mt-1">{t('manageOpportunitiesSubtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'pipeline' ? 'list' : 'pipeline')}
            className="btn-secondary"
          >
            {viewMode === 'pipeline' ? `📋 ${t('listView')}` : `📊 ${t('pipelineView')}`}
          </button>
          <button onClick={() => openModal()} className="btn-primary">
            + {t('addOpportunity')}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50">
          <div className="text-sm text-gray-600">{t('totalOpportunities')}</div>
          <div className="text-2xl font-bold text-blue-600">{opportunities.length}</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">{t('totalValue')}</div>
          <div className="text-2xl font-bold text-green-600">
            {formatIndianCurrency(opportunities.reduce((sum, o) => sum + parseFloat(o.value || 0), 0))}
          </div>
        </div>
        <div className="card bg-purple-50">
          <div className="text-sm text-gray-600">{t('weightedValue')}</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatIndianCurrency(opportunities.reduce((sum, o) => sum + (parseFloat(o.value || 0) * (o.closing_probability / 100)), 0))}
          </div>
        </div>
        <div className="card bg-orange-50">
          <div className="text-sm text-gray-600">{t('avgProbability')}</div>
          <div className="text-2xl font-bold text-orange-600">
            {opportunities.length > 0 
              ? Math.round(opportunities.reduce((sum, o) => sum + o.closing_probability, 0) / opportunities.length)
              : 0}%
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {pipelineStages.map((stage) => (
              <div key={stage.key} className="flex-shrink-0 w-80">
                <div className="card bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stage.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800">{t(stage.labelKey)}</h3>
                        <p className="text-xs text-gray-500">
                          {getOpportunitiesByStage(stage.key).length} {t('deals')} • {formatIndianCurrency(getTotalValueByStage(stage.key))}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {getOpportunitiesByStage(stage.key).map((opp) => (
                      <div
                        key={opp.id}
                        className={`bg-white p-4 rounded-lg shadow hover:shadow-md hover:scale-105 transition-all cursor-pointer ${getUrgencyColor(opp.urgency_status)}`}
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                      >
                        <h4 className="font-semibold text-gray-800 mb-2">{opp.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{opp.customer_name}</p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-green-600">
                            {formatIndianCurrency(parseFloat(opp.value))}
                          </span>
                          <span className="text-gray-500">{opp.closing_probability}%</span>
                        </div>
                        {opp.expected_close_date && (
                          <div className="text-xs text-gray-500 mt-2">
                            {t('due')}: {new Date(opp.expected_close_date).toLocaleDateString()}
                          </div>
                        )}
                        {opp.assigned_to_name && (
                          <div className="text-xs text-blue-600 mt-1">
                            👤 {opp.assigned_to_name}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {getOpportunitiesByStage(stage.key).length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        No opportunities
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByStage')}</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="input-field w-64"
            >
              <option value="all">{t('allStages')}</option>
              {pipelineStages.map((stage) => (
                <option key={stage.key} value={stage.key}>{t(stage.labelKey)}</option>
              ))}
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">{t('title')}</th>
                  <th className="text-left py-3 px-4">{t('customer')}</th>
                  <th className="text-left py-3 px-4">{t('value')}</th>
                  <th className="text-left py-3 px-4">{t('stage')}</th>
                  <th className="text-left py-3 px-4">{t('probability')}</th>
                  <th className="text-left py-3 px-4">{t('closeDate')}</th>
                  <th className="text-left py-3 px-4">{t('assignedTo')}</th>
                  <th className="text-left py-3 px-4">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opp) => (
                  <tr 
                    key={opp.id} 
                    className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/opportunities/${opp.id}`)}
                  >
                    <td className="py-3 px-4 font-medium text-blue-600 hover:text-blue-800">{opp.title}</td>
                    <td className="py-3 px-4">{opp.customer_name}</td>
                    <td className="py-3 px-4 font-bold text-green-600">
                      {formatIndianCurrency(parseFloat(opp.value))}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        pipelineStages.find(s => s.key === opp.pipeline_stage)?.color
                      }`}>
                        {t(pipelineStages.find(s => s.key === opp.pipeline_stage)?.labelKey)}
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
                      {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">{opp.assigned_to_name || '-'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openModal(opp)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingOpportunity ? t('editOpportunity') : t('addNewOpportunity')}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('customerRequired')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + {t('createNewCustomer')}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={t('searchCustomer')}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="input-field mb-2"
                  />
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="input-field"
                    size="5"
                    required
                  >
                    <option value="">{t('selectCustomer')}</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name} {customer.contact_person ? `(${customer.contact_person})` : ''}
                      </option>
                    ))}
                  </select>
                  {filteredCustomers.length === 0 && customerSearch && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t('noCustomersFoundCreate')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('opportunityTitle')}
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="input-field"
                    placeholder={t('opportunityTitlePlaceholder')}
                    required
                  />
                </div>
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
                  rows="3"
                  placeholder={t('describeOpportunityPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('dealValue')}
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                    min="0"
                    placeholder="50000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('pipelineStage')} *
                  </label>
                  <select
                    name="pipeline_stage"
                    value={formData.pipeline_stage}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {pipelineStages.map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {stage.icon} {t(stage.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('closingProbabilityPct')}
                  </label>
                  <input
                    type="range"
                    name="closing_probability"
                    value={formData.closing_probability}
                    onChange={handleChange}
                    className="w-full"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <div className="text-center text-lg font-bold text-gray-700 mt-1">
                    {formData.closing_probability}%
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('expectedCloseDate')}
                  </label>
                  <input
                    type="date"
                    name="expected_close_date"
                    value={formData.expected_close_date}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leadSource')}
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {sourceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('assignedTo')}
                  </label>
                  <input
                    type="text"
                    value={user?.full_name || t('currentUser')}
                    className="input-field bg-gray-100"
                    disabled
                  />
                  <input type="hidden" name="assigned_to" value={formData.assigned_to} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editingOpportunity ? t('updateOpportunity') : t('createOpportunity')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">{t('createNewCustomer')}</h2>
            </div>
            
            <form onSubmit={handleCreateNewCustomer} className="p-6 space-y-4">
              {/* Company Information */}
              <div className="border-b pb-3 mb-3">
                <h3 className="text-md font-semibold text-gray-700 mb-2">{t('companyInformation')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('sector')} *
                    </label>
                    <select
                      name="sector"
                      value={newCustomerData.sector}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      {sectorOptions.map((sector) => (
                        <option key={sector.value} value={sector.value}>{t(sector.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('companySize')} *
                    </label>
                    <select
                      name="company_size"
                      value={newCustomerData.company_size}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('selectSize')}</option>
                      {companySizes.map((size) => (
                        <option key={size.value} value={size.value}>{t(size.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('businessType')} *
                    </label>
                    <select
                      name="business_type"
                      value={newCustomerData.business_type}
                      onChange={handleNewCustomerChange}
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
              <div className="border-b pb-3 mb-3">
                <h3 className="text-md font-semibold text-gray-700 mb-2">{t('contactInformation')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contactDesignation')} *
                    </label>
                    <input
                      type="text"
                      name="contact_designation"
                      value={newCustomerData.contact_designation}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      placeholder={t('designationPlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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

              {/* Address Information */}
              <div className="border-b pb-3 mb-3">
                <h3 className="text-md font-semibold text-gray-700 mb-2">{t('addressLabel')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')} *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={newCustomerData.address}
                    onChange={handleNewCustomerChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('city')} *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={newCustomerData.city}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('pincode')} *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={newCustomerData.pincode}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('country')} *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={newCustomerData.country}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Lead Information */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-2">{t('leadInformation')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('generationMode')} *
                  </label>
                  <select
                    name="generation_mode"
                    value={newCustomerData.generation_mode}
                    onChange={handleNewCustomerChange}
                    className="input-field"
                    required
                  >
                    {generationModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>{t(mode.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
    </div>
  );
};

export default Opportunities;
