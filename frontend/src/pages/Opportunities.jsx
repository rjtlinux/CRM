import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opportunitiesAPI, customersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Opportunities = () => {
  const { user } = useAuth();
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
    { value: 'new', label: 'New Business' },
    { value: 'old', label: 'Old Business' }
  ];

  const generationModes = [
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'web_enquiry', label: 'Web Enquiry' },
    { value: 'exhibition', label: 'Exhibition' },
    { value: 'reference', label: 'Reference' }
  ];

  const companySizes = [
    { value: 'micro', label: 'Micro (1-10 employees)' },
    { value: 'small', label: 'Small (11-50 employees)' },
    { value: 'medium', label: 'Medium (51-250 employees)' },
    { value: 'large', label: 'Large (251-1000 employees)' },
    { value: 'enterprise', label: 'Enterprise (1000+ employees)' }
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
    { key: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800', icon: '🎯' },
    { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800', icon: '✓' },
    { key: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-800', icon: '📄' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800', icon: '💬' },
    { key: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800', icon: '🎉' },
    { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800', icon: '❌' },
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
      alert('Failed to save opportunity');
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
      
      alert('Customer created successfully!');
    } catch (error) {
      console.error('Error creating customer:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create customer';
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
    return <div className="text-center py-8">Loading opportunities...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Opportunities Pipeline</h1>
          <p className="text-gray-600 mt-1">Manage your sales opportunities and deals</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'pipeline' ? 'list' : 'pipeline')}
            className="btn-secondary"
          >
            {viewMode === 'pipeline' ? '📋 List View' : '📊 Pipeline View'}
          </button>
          <button onClick={() => openModal()} className="btn-primary">
            + Add Opportunity
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50">
          <div className="text-sm text-gray-600">Total Opportunities</div>
          <div className="text-2xl font-bold text-blue-600">{opportunities.length}</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-green-600">
            ${opportunities.reduce((sum, o) => sum + parseFloat(o.value || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="card bg-purple-50">
          <div className="text-sm text-gray-600">Weighted Value</div>
          <div className="text-2xl font-bold text-purple-600">
            ${opportunities.reduce((sum, o) => sum + (parseFloat(o.value || 0) * (o.closing_probability / 100)), 0).toLocaleString()}
          </div>
        </div>
        <div className="card bg-orange-50">
          <div className="text-sm text-gray-600">Avg Probability</div>
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
                        <h3 className="font-bold text-gray-800">{stage.label}</h3>
                        <p className="text-xs text-gray-500">
                          {getOpportunitiesByStage(stage.key).length} deals • ${getTotalValueByStage(stage.key).toLocaleString()}
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
                            ${parseFloat(opp.value).toLocaleString()}
                          </span>
                          <span className="text-gray-500">{opp.closing_probability}%</span>
                        </div>
                        {opp.expected_close_date && (
                          <div className="text-xs text-gray-500 mt-2">
                            Due: {new Date(opp.expected_close_date).toLocaleDateString()}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Stage:</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="input-field w-64"
            >
              <option value="all">All Stages</option>
              {pipelineStages.map((stage) => (
                <option key={stage.key} value={stage.key}>{stage.label}</option>
              ))}
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Value</th>
                  <th className="text-left py-3 px-4">Stage</th>
                  <th className="text-left py-3 px-4">Probability</th>
                  <th className="text-left py-3 px-4">Close Date</th>
                  <th className="text-left py-3 px-4">Assigned To</th>
                  <th className="text-left py-3 px-4">Actions</th>
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
                      ${parseFloat(opp.value).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        pipelineStages.find(s => s.key === opp.pipeline_stage)?.color
                      }`}>
                        {pipelineStages.find(s => s.key === opp.pipeline_stage)?.label}
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
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
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
                {editingOpportunity ? 'Edit Opportunity' : 'Add New Opportunity'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Customer *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Create New Customer
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search customer..."
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
                    <option value="">Select Customer</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name} {customer.contact_person ? `(${customer.contact_person})` : ''}
                      </option>
                    ))}
                  </select>
                  {filteredCustomers.length === 0 && customerSearch && (
                    <p className="text-sm text-gray-500 mt-1">
                      No customers found. Click "Create New Customer" above.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Enterprise License Deal"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input-field"
                  rows="3"
                  placeholder="Describe the opportunity..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deal Value ($) *
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
                    Pipeline Stage *
                  </label>
                  <select
                    name="pipeline_stage"
                    value={formData.pipeline_stage}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {pipelineStages.map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {stage.icon} {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Probability (%) *
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
                    Expected Close Date
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
                    Lead Source
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="conference">Conference</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="inbound">Inbound</option>
                    <option value="existing_customer">Existing Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={user?.full_name || 'Current User'}
                    className="input-field bg-gray-100"
                    disabled
                  />
                  <input type="hidden" name="assigned_to" value={formData.assigned_to} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingOpportunity ? 'Update' : 'Create'} Opportunity
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
              <h2 className="text-2xl font-bold">Create New Customer</h2>
            </div>
            
            <form onSubmit={handleCreateNewCustomer} className="p-6 space-y-4">
              {/* Company Information */}
              <div className="border-b pb-3 mb-3">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Company Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
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
                      Sector *
                    </label>
                    <select
                      name="sector"
                      value={newCustomerData.sector}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      {sectors.map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size *
                    </label>
                    <select
                      name="company_size"
                      value={newCustomerData.company_size}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      <option value="">Select Size</option>
                      {companySizes.map((size) => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type *
                    </label>
                    <select
                      name="business_type"
                      value={newCustomerData.business_type}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      required
                    >
                      {businessTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b pb-3 mb-3">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person *
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
                      Designation *
                    </label>
                    <input
                      type="text"
                      name="contact_designation"
                      value={newCustomerData.contact_designation}
                      onChange={handleNewCustomerChange}
                      className="input-field"
                      placeholder="e.g., CEO, Manager"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
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
                      Phone *
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
                <h3 className="text-md font-semibold text-gray-700 mb-2">Address</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
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
                      City *
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
                      Pincode *
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
                      Country *
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
                <h3 className="text-md font-semibold text-gray-700 mb-2">Lead Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Generation Mode *
                  </label>
                  <select
                    name="generation_mode"
                    value={newCustomerData.generation_mode}
                    onChange={handleNewCustomerChange}
                    className="input-field"
                    required
                  >
                    {generationModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
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
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Customer
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
