import { useState } from 'react';
import api from '../services/api';

const SmartReminder = ({ customerId, customerName, outstanding }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateReminder = async () => {
    if (parseFloat(outstanding) === 0) {
      setError('Koi outstanding nahi hai!');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.post('/ai/smart-reminder', { customerId });
      setData(res.data);
    } catch {
      setError('Reminder generate nahi hua. Dobara try karein.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        onClick={generateReminder}
        disabled={loading || parseFloat(outstanding) === 0}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={parseFloat(outstanding) === 0 ? 'No outstanding amount' : 'AI se reminder banayein'}
      >
        {loading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>🤖</span>
            <span>AI Reminder</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 flex justify-between items-center">
            <span className="text-sm font-semibold">AI Generated WhatsApp Reminder</span>
            <span className="text-xs opacity-80">Send via WhatsApp</span>
          </div>
          <div className="p-4">
            <div className="bg-[#e7ffd4] rounded-xl p-3 text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap border border-green-100">
              {data.message}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition-colors"
              >
                {copied ? '✅ Copied!' : '📋 Copy Message'}
              </button>
              {data.whatsappLink && (
                <a
                  href={data.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Send on WhatsApp
                </a>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-medium text-gray-700">Pending Since</div>
                <div>{data.daysPending} days</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-medium text-gray-700">Best Time to Send</div>
                <div>{data.suggestedTime}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartReminder;
