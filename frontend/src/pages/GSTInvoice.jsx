import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gstAPI } from '../services/gstAPI';
import { customersAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency } from '../utils/indianFormatters';

const GSTInvoice = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState([]);
  const [hsnCodes, setHSNCodes] = useState([]);
  const [gstRates, setGSTRates] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_type: 'B2B',
    place_of_supply: '',
    notes: ''
  });
  
  const [items, setItems] = useState([
    {
      description: '',
      hsn_code: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      gst_rate: 18
    }
  ]);
  
  const [searchHSN, setSearchHSN] = useState('');
  const [hsnSuggestions, setHSNSuggestions] = useState([]);
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const fetchInitialData = async () => {
    try {
      const [customersRes, ratesRes] = await Promise.all([
        customersAPI.getCustomers(),
        gstAPI.getRates()
      ]);
      setCustomers(customersRes.data);
      setGSTRates(ratesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  const searchHSNCodes = async (query) => {
    if (query.length < 2) {
      setHSNSuggestions([]);
      return;
    }
    
    try {
      const response = await gstAPI.searchHSNSAC(query);
      setHSNSuggestions(response.data);
    } catch (error) {
      console.error('Error searching HSN codes:', error);
    }
  };
  
  const addItem = () => {
    setItems([...items, {
      description: '',
      hsn_code: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      gst_rate: 18
    }]);
  };
  
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };
  
  const calculateItemTotal = (item) => {
    const taxable = item.quantity * item.rate;
    const gst = taxable * (item.gst_rate / 100);
    return taxable + gst;
  };
  
  const calculateTotals = () => {
    let taxable = 0;
    let totalGST = 0;
    
    items.forEach(item => {
      const itemTaxable = item.quantity * item.rate;
      const itemGST = itemTaxable * (item.gst_rate / 100);
      taxable += itemTaxable;
      totalGST += itemGST;
    });
    
    return {
      taxable,
      gst: totalGST,
      total: taxable + totalGST
    };
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const invoiceData = {
        ...formData,
        items: items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          gst_rate: parseFloat(item.gst_rate)
        }))
      };
      
      const response = await gstAPI.createInvoice(invoiceData);
      alert(t('invoiceCreatedSuccessfully') || 'Invoice created successfully!');
      navigate(`/gst/invoice/${response.data.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert(t('errorCreatingInvoice') || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  };
  
  const totals = calculateTotals();
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('createGSTInvoice')}</h1>
            <p className="text-gray-600 mt-1">{t('generateGSTCompliantInvoice')}</p>
          </div>
          <button
            onClick={() => navigate('/gst/invoices')}
            className="btn-secondary"
          >
            {t('viewInvoices')}
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Customer & Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customer')} *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="input-field"
                required
              >
                <option value="">{t('selectCustomer')}</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name} {customer.gstin ? `(${customer.gstin})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceType')} *
              </label>
              <select
                value={formData.invoice_type}
                onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
                className="input-field"
                required
              >
                <option value="B2B">B2B - {t('businessToBusiness')}</option>
                <option value="B2C">B2C - {t('businessToConsumer')}</option>
                <option value="Export">{t('export')}</option>
                <option value="SEZ">SEZ</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('placeOfSupply')} *
              </label>
              <input
                type="text"
                value={formData.place_of_supply}
                onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })}
                className="input-field"
                placeholder={t('stateCode') + " (e.g., 27-Maharashtra)"}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('notes')}
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field"
                placeholder={t('additionalNotes')}
              />
            </div>
          </div>
          
          {/* Invoice Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('invoiceItems')}</h2>
              <button
                type="button"
                onClick={addItem}
                className="btn-primary text-sm"
              >
                + {t('addItem')}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('description')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN/SAC</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('quantity')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('unit')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('rate')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('amount')}</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-sm">{index + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="input-field text-sm"
                          placeholder={t('itemDescription')}
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.hsn_code}
                          onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                          className="input-field text-sm"
                          placeholder="HSN/SAC"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="input-field text-sm w-20"
                          min="0.001"
                          step="0.001"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="input-field text-sm w-24"
                        >
                          <option value="NOS">NOS</option>
                          <option value="KG">KG</option>
                          <option value="LTR">LTR</option>
                          <option value="MTR">MTR</option>
                          <option value="BOX">BOX</option>
                          <option value="PCS">PCS</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          className="input-field text-sm w-28"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.gst_rate}
                          onChange={(e) => updateItem(index, 'gst_rate', e.target.value)}
                          className="input-field text-sm w-20"
                        >
                          {gstRates.map(rate => (
                            <option key={rate.rate} value={rate.rate}>
                              {rate.rate}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-sm font-medium">
                        {formatIndianCurrency(calculateItemTotal(item))}
                      </td>
                      <td className="px-3 py-2">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('taxableAmount')}:</span>
                <span className="font-medium">{formatIndianCurrency(totals.taxable)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('totalGST')}:</span>
                <span className="font-medium text-blue-600">{formatIndianCurrency(totals.gst)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t('totalAmount')}:</span>
                <span className="text-primary-600">{formatIndianCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="btn-primary"
            >
              {loading ? t('creating') : t('createInvoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GSTInvoice;
