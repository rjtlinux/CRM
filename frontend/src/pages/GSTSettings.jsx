import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gstAPI } from '../services/gstAPI';
import { useLanguage } from '../context/LanguageContext';

const GSTSettings = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: null,
    company_name: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    bank_name: '',
    bank_account: '',
    bank_ifsc: '',
    bank_branch: '',
  });
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      const response = await gstAPI.getCompanySettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await gstAPI.updateCompanySettings(settings.id, settings);
      alert(t('settingsSavedSuccessfully') || 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(t('errorSavingSettings') || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">{t('loading')}</div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('gstSettings')}</h1>
          <p className="text-gray-600 mt-1">{t('companyGSTDetails')}</p>
        </div>
        <button
          onClick={() => navigate('/gst')}
          className="btn-secondary"
        >
          ← {t('back')}
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="card">
        {/* Company Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('companyInformation')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('companyName')} *
              </label>
              <input
                type="text"
                name="company_name"
                value={settings.company_name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN *
              </label>
              <input
                type="text"
                name="gstin"
                value={settings.gstin}
                onChange={handleChange}
                className="input-field"
                pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}Z[0-9A-Z]{1}"
                maxLength="15"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('gstinFormat')}: 27AAAAA0000A1Z5
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAN
              </label>
              <input
                type="text"
                name="pan"
                value={settings.pan}
                onChange={handleChange}
                className="input-field"
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                maxLength="10"
              />
            </div>
          </div>
        </div>
        
        {/* Address Details */}
        <div className="mb-6 border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('address')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('address')} *
              </label>
              <textarea
                name="address"
                value={settings.address}
                onChange={handleChange}
                className="input-field"
                rows="3"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('city')} *
              </label>
              <input
                type="text"
                name="city"
                value={settings.city}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('state')} *
              </label>
              <input
                type="text"
                name="state"
                value={settings.state}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('pincode')}
              </label>
              <input
                type="text"
                name="pincode"
                value={settings.pincode}
                onChange={handleChange}
                className="input-field"
                pattern="[0-9]{6}"
                maxLength="6"
              />
            </div>
          </div>
        </div>
        
        {/* Contact Details */}
        <div className="mb-6 border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('contactInformation')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('email')} *
              </label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('website')}
              </label>
              <input
                type="url"
                name="website"
                value={settings.website}
                onChange={handleChange}
                className="input-field"
                placeholder="https://www.example.com"
              />
            </div>
          </div>
        </div>
        
        {/* Bank Details */}
        <div className="mb-6 border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('bankDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bankName')}
              </label>
              <input
                type="text"
                name="bank_name"
                value={settings.bank_name}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('accountNumber')}
              </label>
              <input
                type="text"
                name="bank_account"
                value={settings.bank_account}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IFSC {t('code')}
              </label>
              <input
                type="text"
                name="bank_ifsc"
                value={settings.bank_ifsc}
                onChange={handleChange}
                className="input-field"
                pattern="[A-Z]{4}0[A-Z0-9]{6}"
                maxLength="11"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('branch')}
              </label>
              <input
                type="text"
                name="bank_branch"
                value={settings.bank_branch}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/gst')}
            className="btn-secondary"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? t('saving') : t('save')} {t('settings')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GSTSettings;
