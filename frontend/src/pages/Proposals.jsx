import { useState, useEffect } from 'react';
import { proposalsAPI, customersAPI } from '../services/api';

const Proposals = () => {
  const [proposals, setProposals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
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
      alert('Failed to save proposal');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;
    
    try {
      await proposalsAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      alert('Failed to delete proposal');
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
    return <div className="text-center py-8">Loading proposals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Proposals</h1>
        <button onClick={() => openModal()} className="btn-primary">
          + Create Proposal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card bg-gray-50">
          <div className="text-sm text-gray-600">Draft</div>
          <div className="text-2xl font-bold text-gray-600">
            {proposals.filter(p => p.status === 'draft').length}
          </div>
        </div>
        <div className="card bg-blue-50">
          <div className="text-sm text-gray-600">Sent</div>
          <div className="text-2xl font-bold text-blue-600">
            {proposals.filter(p => p.status === 'sent').length}
          </div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">Accepted</div>
          <div className="text-2xl font-bold text-green-600">
            {proposals.filter(p => p.status === 'accepted').length}
          </div>
        </div>
        <div className="card bg-red-50">
          <div className="text-sm text-gray-600">Rejected</div>
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
                <th className="text-left py-3 px-4">Proposal #</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Title</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Valid Until</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
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
                      {proposal.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openModal(proposal)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(proposal.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingProposal ? 'Edit Proposal' : 'Create New Proposal'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposal Number *
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
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
                  Description
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
                    Total Amount *
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
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid Until
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
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProposal ? 'Update' : 'Create'} Proposal
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
