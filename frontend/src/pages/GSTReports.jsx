import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const GSTReports = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [reportType, setReportType] = useState('gstr1');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const months = [
    { value: 1, label: t('january') || 'January' },
    { value: 2, label: t('february') || 'February' },
    { value: 3, label: t('march') || 'March' },
    { value: 4, label: t('april') || 'April' },
    { value: 5, label: t('may') || 'May' },
    { value: 6, label: t('june') || 'June' },
    { value: 7, label: t('july') || 'July' },
    { value: 8, label: t('august') || 'August' },
    { value: 9, label: t('september') || 'September' },
    { value: 10, label: t('october') || 'October' },
    { value: 11, label: t('november') || 'November' },
    { value: 12, label: t('december') || 'December' },
  ];
  
  const handleGenerate = () => {
    // Navigate to report generation
    alert(`${t('generating')} ${reportType.toUpperCase()} ${t('report')} for ${months[month-1].label} ${year}`);
    // TODO: Implement actual report generation
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('gstReports')}</h1>
          <p className="text-gray-600 mt-1">{t('generateGSTReturns')}</p>
        </div>
        <button
          onClick={() => navigate('/gst')}
          className="btn-secondary"
        >
          ← {t('back')}
        </button>
      </div>
      
      {/* Report Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('selectReport')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setReportType('gstr1')}
            className={`p-6 border-2 rounded-xl text-left transition-all ${
              reportType === 'gstr1'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">GSTR-1</h3>
                <p className="text-sm text-gray-600 mt-2">{t('outwardSuppliesReport')}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {t('detailsOfOutwardSupplies')}
                </p>
              </div>
              {reportType === 'gstr1' && (
                <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setReportType('gstr3b')}
            className={`p-6 border-2 rounded-xl text-left transition-all ${
              reportType === 'gstr3b'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">GSTR-3B</h3>
                <p className="text-sm text-gray-600 mt-2">{t('monthlySummaryReturn')}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {t('summaryOfOutwardInward')}
                </p>
              </div>
              {reportType === 'gstr3b' && (
                <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        </div>
        
        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('month')} *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="input-field"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('year')} *
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="input-field"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={handleGenerate}
          className="btn-primary w-full md:w-auto"
        >
          📊 {t('generateReport')}
        </button>
      </div>
      
      {/* Report Information */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3">ℹ️ {t('aboutReports')}</h3>
        {reportType === 'gstr1' ? (
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>GSTR-1</strong> {t('isMonthlyStatement')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('b2bInvoices')}</li>
              <li>{t('b2cLarge')}</li>
              <li>{t('b2cSmall')}</li>
              <li>{t('exportInvoices')}</li>
            </ul>
            <p className="mt-3"><strong>{t('dueDate')}:</strong> {t('11thOfNextMonth')}</p>
          </div>
        ) : (
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>GSTR-3B</strong> {t('isMonthlySummary')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('outwardTaxableSupplies')}</li>
              <li>{t('inwardSuppliesCredit')}</li>
              <li>{t('taxPayable')}</li>
              <li>{t('interestLateFee')}</li>
            </ul>
            <p className="mt-3"><strong>{t('dueDate')}:</strong> {t('20thOfNextMonth')}</p>
          </div>
        )}
      </div>
      
      {/* Coming Soon Notice */}
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex gap-3">
          <span className="text-2xl">🚧</span>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('comingSoon')}</h3>
            <p className="text-sm text-gray-700">
              {t('fullReportGeneration')} {t('willBeAvailable')} {t('inNextUpdate')}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>{t('currentFeatures')}:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 text-sm text-gray-700 mt-1">
              <li>{t('viewInvoiceData')}</li>
              <li>{t('gstSummary')}</li>
              <li>{t('exportToExcel')} (Coming Soon)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTReports;
