// WhatsApp Integration Utilities

/**
 * Format phone number for WhatsApp
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone for WhatsApp
 */
export const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');
  
  // If it starts with 0, remove it (Indian mobile numbers)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // If it doesn't start with 91, add it
  if (!digits.startsWith('91') && digits.length === 10) {
    digits = '91' + digits;
  }
  
  return digits;
};

/**
 * Generate WhatsApp chat link
 * @param {string} phone - Phone number
 * @param {string} message - Pre-filled message (optional)
 * @returns {string} WhatsApp URL
 */
export const getWhatsAppLink = (phone, message = '') => {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${formattedPhone}${message ? `?text=${encodedMessage}` : ''}`;
};

/**
 * Generate payment reminder message
 * @param {string} customerName - Customer name
 * @param {number} amount - Outstanding amount
 * @param {string} lang - Language (hi/en)
 * @returns {string} Reminder message
 */
export const generatePaymentReminderMessage = (customerName, amount, lang = 'hi') => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
  
  if (lang === 'hi') {
    return `नमस्ते ${customerName} जी,

आपका बकाया राशि ${formattedAmount} है।

कृपया जल्द भुगतान करें।

धन्यवाद! 🙏`;
  } else {
    return `Hello ${customerName},

Your outstanding amount is ${formattedAmount}.

Please make the payment at the earliest.

Thank you!`;
  }
};

/**
 * Generate invoice sharing message
 * @param {string} customerName - Customer name
 * @param {string} invoiceNumber - Invoice number
 * @param {number} amount - Invoice amount
 * @param {string} lang - Language (hi/en)
 * @returns {string} Invoice message
 */
export const generateInvoiceMessage = (customerName, invoiceNumber, amount, lang = 'hi') => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
  
  if (lang === 'hi') {
    return `नमस्ते ${customerName} जी,

आपका इनवॉइस तैयार है।

इनवॉइस नंबर: ${invoiceNumber}
राशि: ${formattedAmount}

धन्यवाद! 🙏`;
  } else {
    return `Hello ${customerName},

Your invoice is ready.

Invoice Number: ${invoiceNumber}
Amount: ${formattedAmount}

Thank you!`;
  }
};

/**
 * Generate quotation message
 * @param {string} customerName - Customer name
 * @param {string} quotationNumber - Quotation number
 * @param {number} amount - Quotation amount
 * @param {string} validity - Validity date
 * @param {string} lang - Language (hi/en)
 * @returns {string} Quotation message
 */
export const generateQuotationMessage = (customerName, quotationNumber, amount, validity, lang = 'hi') => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
  
  if (lang === 'hi') {
    return `नमस्ते ${customerName} जी,

आपका कोटेशन तैयार है।

कोटेशन नंबर: ${quotationNumber}
राशि: ${formattedAmount}
वैधता: ${validity} तक

कृपया समीक्षा करें।

धन्यवाद! 🙏`;
  } else {
    return `Hello ${customerName},

Your quotation is ready.

Quotation Number: ${quotationNumber}
Amount: ${formattedAmount}
Valid Until: ${validity}

Please review and confirm.

Thank you!`;
  }
};

/**
 * Generate order confirmation message
 * @param {string} customerName - Customer name
 * @param {string} orderNumber - Order number
 * @param {number} amount - Order amount
 * @param {string} deliveryDate - Expected delivery date
 * @param {string} lang - Language (hi/en)
 * @returns {string} Order confirmation message
 */
export const generateOrderConfirmationMessage = (customerName, orderNumber, amount, deliveryDate, lang = 'hi') => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
  
  if (lang === 'hi') {
    return `नमस्ते ${customerName} जी,

आपका ऑर्डर कन्फर्म हो गया है! ✅

ऑर्डर नंबर: ${orderNumber}
राशि: ${formattedAmount}
डिलीवरी: ${deliveryDate} तक

धन्यवाद! 🙏`;
  } else {
    return `Hello ${customerName},

Your order is confirmed! ✅

Order Number: ${orderNumber}
Amount: ${formattedAmount}
Delivery: By ${deliveryDate}

Thank you!`;
  }
};

/**
 * Generate thank you message after payment
 * @param {string} customerName - Customer name
 * @param {number} amount - Payment amount
 * @param {string} lang - Language (hi/en)
 * @returns {string} Thank you message
 */
export const generateThankYouMessage = (customerName, amount, lang = 'hi') => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
  
  if (lang === 'hi') {
    return `नमस्ते ${customerName} जी,

${formattedAmount} का भुगतान मिल गया है। धन्यवाद! 🙏

आपके साथ व्यापार करके खुशी हुई।

हमेशा आपकी सेवा में।`;
  } else {
    return `Hello ${customerName},

Payment of ${formattedAmount} received. Thank you!

It's always a pleasure doing business with you.

Looking forward to serving you again.`;
  }
};

/**
 * Open WhatsApp with message
 * @param {string} phone - Phone number
 * @param {string} message - Message to send
 */
export const openWhatsApp = (phone, message) => {
  const link = getWhatsAppLink(phone, message);
  window.open(link, '_blank');
};

/**
 * Share via WhatsApp (for mobile)
 * @param {string} phone - Phone number
 * @param {string} message - Message to share
 */
export const shareViaWhatsApp = (phone, message) => {
  if (navigator.share) {
    // Use native share if available (mobile)
    navigator.share({
      title: 'Share via WhatsApp',
      text: message,
      url: `https://wa.me/${formatWhatsAppPhone(phone)}`
    }).catch((error) => {
      console.log('Error sharing:', error);
      // Fallback to opening WhatsApp directly
      openWhatsApp(phone, message);
    });
  } else {
    // Fallback for desktop
    openWhatsApp(phone, message);
  }
};

export default {
  formatWhatsAppPhone,
  getWhatsAppLink,
  generatePaymentReminderMessage,
  generateInvoiceMessage,
  generateQuotationMessage,
  generateOrderConfirmationMessage,
  generateThankYouMessage,
  openWhatsApp,
  shareViaWhatsApp
};
