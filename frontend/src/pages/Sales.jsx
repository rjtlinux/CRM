import { useState, useEffect } from 'react';
import { salesAPI, customersAPI } from '../services/api';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    status: 'pending',
    payment_method: 'credit_card',
    invoice_number: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesRes, customersRes] = await Promise.all([
        salesAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setSales(salesRes.data.sales);
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
      if (editingSale) {
        await salesAPI.update(editingSale.id, formData);
      } else {
        await salesAPI.create(formData);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Failed to save sale');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;
    
    try {
      await salesAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale');
    }
  };

  const openModal = (sale = null) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        customer_id: sale.customer_id,
        sale_date: new Date(sale.sale_date).toISOString().split('T')[0],
        amount: sale.amount,
        description: sale.description,
        status: sale.status,
        payment_method: sale.payment_method,
        invoice_number: sale.invoice_number,
      });
    } else {
      setEditingSale(null);
      setFormData({
        customer_id: '',
        sale_date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        status: 'pending',
        payment_method: 'credit_card',
        invoice_number: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSale(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
  const completedSales = sales.filter(s => s.status === 'completed').length;

  if (loading) {
    return <div className="text-center py-8">Loading sales...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Sales</h1>
        <button onClick={() => openModal()} className="btn-primary">
          + Add Sale
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card bg-blue-50">
          <div className="text-sm text-gray-600">Total Sales</div>
          <div className="text-2xl font-bold text-blue-600">{sales.length}</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">Completed Sales</div>
          <div className="text-2xl font-bold text-green-600">{completedSales}</div>
        </div>
        <div className="card bg-purple-50">
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold text-purple-600">${totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Invoice #</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Payment Method</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{sale.invoice_number || '-'}</td>
                  <td className="py-3 px-4">{sale.customer_name}</td>
                  <td className="py-3 px-4">{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-bold text-green-600">
                    ${parseFloat(sale.amount).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{sale.payment_method || '-'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openModal(sale)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
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
              {editingSale ? 'Edit Sale' : 'Add New Sale'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    Sale Date *
                  </label>
                  <input
                    type="date"
                    name="sale_date"
                    value={formData.sale_date}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    className="input-field"
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
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSale ? 'Update' : 'Create'} Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
