import { useState, useEffect } from 'react';
import { costsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';

const Costs = () => {
  const { t } = useLanguage();
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    cost_date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_status: 'pending',
    receipt_number: '',
  });

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const response = await costsAPI.getAll();
      setCosts(response.data.costs);
    } catch (error) {
      console.error('Error fetching costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCost) {
        await costsAPI.update(editingCost.id, formData);
      } else {
        await costsAPI.create(formData);
      }
      fetchCosts();
      closeModal();
    } catch (error) {
      console.error('Error saving cost:', error);
      alert(t('failedToSaveCost'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteCost'))) return;
    
    try {
      await costsAPI.delete(id);
      fetchCosts();
    } catch (error) {
      console.error('Error deleting cost:', error);
      alert(t('failedToDeleteCost'));
    }
  };

  const openModal = (cost = null) => {
    if (cost) {
      setEditingCost(cost);
      setFormData({
        category: cost.category,
        description: cost.description,
        amount: cost.amount,
        cost_date: new Date(cost.cost_date).toISOString().split('T')[0],
        vendor: cost.vendor,
        payment_status: cost.payment_status,
        receipt_number: cost.receipt_number,
      });
    } else {
      setEditingCost(null);
      setFormData({
        category: '',
        description: '',
        amount: '',
        cost_date: new Date().toISOString().split('T')[0],
        vendor: '',
        payment_status: 'pending',
        receipt_number: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCost(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const totalCosts = costs.reduce((sum, cost) => sum + parseFloat(cost.amount), 0);
  const paidCosts = costs.filter(c => c.payment_status === 'paid').reduce((sum, cost) => sum + parseFloat(cost.amount), 0);
  const pendingCosts = costs.filter(c => c.payment_status === 'pending').reduce((sum, cost) => sum + parseFloat(cost.amount), 0);

  const getCategoryLabel = (cat) => {
    const keys = { Software: 'categorySoftware', Marketing: 'categoryMarketing', Operations: 'categoryOperations', Salaries: 'categorySalaries', Utilities: 'categoryUtilities', Office: 'categoryOffice', Travel: 'categoryTravel', Other: 'categoryOther' };
    return t(keys[cat] || cat);
  };

  const getPaymentStatusLabel = (status) => status === 'paid' ? t('paid') : t('pending');

  if (loading) {
    return <div className="text-center py-8">{t('loadingCosts')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('costsAndExpenses')}</h1>
        <button onClick={() => openModal()} className="btn-primary">
          + {t('addCost')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card bg-red-50">
          <div className="text-sm text-gray-600">{t('totalCosts')}</div>
          <div className="text-2xl font-bold text-red-600">{formatIndianCurrency(totalCosts)}</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">{t('paid')}</div>
          <div className="text-2xl font-bold text-green-600">{formatIndianCurrency(paidCosts)}</div>
        </div>
        <div className="card bg-yellow-50">
          <div className="text-sm text-gray-600">{t('pending')}</div>
          <div className="text-2xl font-bold text-yellow-600">{formatIndianCurrency(pendingCosts)}</div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">{t('date')}</th>
                <th className="text-left py-3 px-4">{t('category')}</th>
                <th className="text-left py-3 px-4">{t('description')}</th>
                <th className="text-left py-3 px-4">{t('vendor')}</th>
                <th className="text-left py-3 px-4">{t('amount')}</th>
                <th className="text-left py-3 px-4">{t('status')}</th>
                <th className="text-left py-3 px-4">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <tr key={cost.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{new Date(cost.cost_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {getCategoryLabel(cost.category)}
                    </span>
                  </td>
                  <td className="py-3 px-4">{cost.description}</td>
                  <td className="py-3 px-4">{cost.vendor || '-'}</td>
                  <td className="py-3 px-4 font-bold text-red-600">
                    {formatIndianCurrency(parseFloat(cost.amount))}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      cost.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getPaymentStatusLabel(cost.payment_status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openModal(cost)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(cost.id)}
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
              {editingCost ? t('editCost') : t('addNewCost')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('category')} *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">{t('selectCategory')}</option>
                    <option value="Software">{t('categorySoftware')}</option>
                    <option value="Marketing">{t('categoryMarketing')}</option>
                    <option value="Operations">{t('categoryOperations')}</option>
                    <option value="Salaries">{t('categorySalaries')}</option>
                    <option value="Utilities">{t('categoryUtilities')}</option>
                    <option value="Office">{t('categoryOffice')}</option>
                    <option value="Travel">{t('categoryTravel')}</option>
                    <option value="Other">{t('categoryOther')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('date')} *
                  </label>
                  <input
                    type="date"
                    name="cost_date"
                    value={formData.cost_date}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('description')} *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input-field"
                  rows="3"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('amount')} *
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
                    {t('vendor')}
                  </label>
                  <input
                    type="text"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('paymentStatus')}
                  </label>
                  <select
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="pending">{t('pending')}</option>
                    <option value="paid">{t('paid')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('receiptNumber')}
                  </label>
                  <input
                    type="text"
                    name="receipt_number"
                    value={formData.receipt_number}
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
                  {editingCost ? t('update') : t('create')} {t('cost')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Costs;
