import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitch from '../components/LanguageSwitch';

const Login = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email: formData.email, password: formData.password });

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitch />
      </div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <img src="/buzeye-logo.png" alt="Buzeye" className="h-20 w-auto object-contain mx-auto mb-2" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Buzeye
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Business CRM</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2 w-full">
            {t('welcomeBack')}
          </h1>
          <p className="text-gray-600 w-full">
            {t('signInToCRM')}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('emailAddress')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              required
              placeholder={t('placeholderEmail')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('password')}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
              placeholder="••••••••"
              minLength="6"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('pleaseWait') : t('signIn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('contactAdminForAccess')}
        </p>
      </div>
    </div>
  );
};

export default Login;
