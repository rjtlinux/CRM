// Indian Number and Date Formatting Utilities

/**
 * Format number in Indian numbering system (₹1,00,000 not ₹100,000)
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} Formatted amount
 */
export const formatIndianCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹ 0' : '0';
  }

  const num = Math.abs(amount);
  const isNegative = amount < 0;
  
  // Convert to string and split into integer and decimal parts
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Indian numbering: Last 3 digits, then groups of 2
  let formatted = '';
  
  if (integerPart.length <= 3) {
    formatted = integerPart;
  } else {
    // Get last 3 digits
    const lastThree = integerPart.slice(-3);
    // Get remaining digits
    const remaining = integerPart.slice(0, -3);
    
    // Add commas every 2 digits from right to left for remaining
    formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  // Add decimal part
  const result = `${formatted}.${decimalPart}`;
  
  // Add negative sign if needed
  const finalResult = isNegative ? `-${result}` : result;
  
  return showSymbol ? `₹ ${finalResult}` : finalResult;
};

/**
 * Format number in lakhs and crores (Indian system)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount in lakhs/crores
 */
export const formatIndianShort = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹ 0';
  }

  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  
  let formatted = '';
  
  if (absAmount >= 10000000) {
    // Crores (1,00,00,000)
    formatted = `₹ ${(absAmount / 10000000).toFixed(2)} Cr`;
  } else if (absAmount >= 100000) {
    // Lakhs (1,00,000)
    formatted = `₹ ${(absAmount / 100000).toFixed(2)} L`;
  } else if (absAmount >= 1000) {
    // Thousands
    formatted = `₹ ${(absAmount / 1000).toFixed(1)}K`;
  } else {
    formatted = formatIndianCurrency(absAmount);
  }
  
  return isNegative ? `-${formatted}` : formatted;
};

/**
 * Format date in Indian format (DD/MM/YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export const formatIndianDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date with time in Indian format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date with time
 */
export const formatIndianDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const dateStr = formatIndianDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}`;
};

/**
 * Format relative time in Hindi/English
 * @param {Date|string} date - Date to format
 * @param {string} lang - Language (hi/en)
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date, lang = 'hi') => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  const translations = {
    hi: {
      justNow: 'अभी-अभी',
      minutesAgo: (n) => `${n} मिनट पहले`,
      hoursAgo: (n) => `${n} घंटे पहले`,
      daysAgo: (n) => `${n} दिन पहले`,
      weeksAgo: (n) => `${n} हफ्ते पहले`,
    },
    en: {
      justNow: 'just now',
      minutesAgo: (n) => `${n} min${n > 1 ? 's' : ''} ago`,
      hoursAgo: (n) => `${n} hour${n > 1 ? 's' : ''} ago`,
      daysAgo: (n) => `${n} day${n > 1 ? 's' : ''} ago`,
      weeksAgo: (n) => `${n} week${n > 1 ? 's' : ''} ago`,
    }
  };
  
  const t = translations[lang] || translations.en;
  
  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return t.minutesAgo(diffMins);
  if (diffHours < 24) return t.hoursAgo(diffHours);
  if (diffDays < 7) return t.daysAgo(diffDays);
  
  const weeks = Math.floor(diffDays / 7);
  return t.weeksAgo(weeks);
};

/**
 * Parse Indian formatted number to float
 * @param {string} value - Formatted number string
 * @returns {number} Parsed number
 */
export const parseIndianNumber = (value) => {
  if (!value) return 0;
  
  // Remove currency symbol and spaces
  const cleaned = value.replace(/[₹\s]/g, '');
  
  // Remove commas and parse
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
};

/**
 * Format phone number in Indian format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatIndianPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Indian mobile: +91 98765 43210
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    const mobile = digits.slice(2);
    return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  }
  
  return phone;
};

/**
 * Validate GST number
 * @param {string} gstin - GST number
 * @returns {boolean} Is valid
 */
export const validateGSTIN = (gstin) => {
  if (!gstin) return false;
  
  // GST format: 22AAAAA0000A1Z5
  // 2 digits state code + 10 chars PAN + 1 digit entity number + Z + checksum
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  return gstRegex.test(gstin);
};

/**
 * Format GST number with spaces for readability
 * @param {string} gstin - GST number
 * @returns {string} Formatted GST number
 */
export const formatGSTIN = (gstin) => {
  if (!gstin) return '';
  
  const cleaned = gstin.replace(/\s/g, '').toUpperCase();
  
  if (cleaned.length === 15) {
    // Format: 22 AAAAA 0000 A 1 Z 5
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 11)} ${cleaned.slice(11, 12)} ${cleaned.slice(12, 13)} ${cleaned.slice(13, 14)} ${cleaned.slice(14)}`;
  }
  
  return cleaned;
};

export default {
  formatIndianCurrency,
  formatIndianShort,
  formatIndianDate,
  formatIndianDateTime,
  formatRelativeTime,
  parseIndianNumber,
  formatIndianPhone,
  validateGSTIN,
  formatGSTIN
};
