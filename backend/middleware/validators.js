const { body, validationResult } = require('express-validator');
const xss = require('xss');

/**
 * Sanitize all text inputs to prevent XSS attacks
 * Recursively sanitizes strings in request body
 */
const sanitize = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return xss(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  req.body = sanitizeValue(req.body);
  next();
};

/**
 * Check validation results and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 */
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (!password || password.length < minLength) {
    return 'Password must be at least 8 characters long';
  }
  if (!hasUpperCase) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!hasLowerCase) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!hasNumbers) {
    return 'Password must contain at least one number';
  }
  if (!hasSpecialChar) {
    return 'Password must contain at least one special character (!@#$%^&*...)';
  }
  return null;
};

/**
 * Validation rules for customer creation/update
 */
const customerValidationRules = () => [
  body('company_name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[+]?[0-9\s\-()]{10,15}$/)
    .withMessage('Invalid phone number format'),
];

/**
 * Validation rules for sales creation/update
 */
const salesValidationRules = () => [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('sale_date')
    .isISO8601()
    .withMessage('Valid sale date is required'),
  body('payment_method')
    .optional({ nullable: true })
    .isIn(['cash', 'udhar', 'card', 'upi', 'bank_transfer'])
    .withMessage('Invalid payment method'),
];

/**
 * Validation rules for cost creation/update
 */
const costValidationRules = () => [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('cost_date')
    .isISO8601()
    .withMessage('Valid cost date is required'),
];

/**
 * Validation rules for proposal creation/update
 */
const proposalValidationRules = () => [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('total_amount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number'),
];

/**
 * Validation rules for opportunity creation/update
 */
const opportunityValidationRules = () => [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Value must be a non-negative number'),
  body('closing_probability')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 100 })
    .withMessage('Closing probability must be between 0 and 100'),
];

const opportunityUpdateRules = () => [
  body('customer_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a non-negative number'),
  body('closing_probability')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 100 })
    .withMessage('Closing probability must be between 0 and 100'),
];

/**
 * Validation rules for user registration
 */
const registerValidationRules = () => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),
];

/**
 * Validation rules for user login
 */
const loginValidationRules = () => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = {
  sanitize,
  validate,
  validateEmail,
  validatePassword,
  customerValidationRules,
  salesValidationRules,
  costValidationRules,
  proposalValidationRules,
  opportunityValidationRules,
  opportunityUpdateRules,
  registerValidationRules,
  loginValidationRules,
};
