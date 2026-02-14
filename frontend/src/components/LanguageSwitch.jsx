import { useLanguage } from '../context/LanguageContext';

const LanguageSwitch = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
      title={language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
    >
      <span className="text-sm font-medium">
        {language === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
      </span>
    </button>
  );
};

export default LanguageSwitch;
