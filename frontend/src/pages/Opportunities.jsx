import { useState, useEffect } from 'react';
import { opportunitiesAPI, customersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Opportunities = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'list'
  const [selectedStage, setSelectedStage] = useState('all');
  
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
                        className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${getUrgencyColor(opp.urgency_status)}`}
                        onClick={() => openModal(opp)}
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
                  <tr key={opp.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{opp.title}</td>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </option>
                    ))}
                  </select>
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
    </div>
  );
};

export default Opportunities;
