const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const checkValidationResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * User registration validation rules
 */
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('firstName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    
    checkValidationResult
];

/**
 * User login validation rules
 */
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    checkValidationResult
];

/**
 * Profile update validation rules
 */
const validateProfileUpdate = [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    
    body('firstName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    
    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    
    body('github')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid GitHub username format'),
    
    body('linkedIn')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid LinkedIn username format'),
    
    body('website')
        .optional()
        .isURL()
        .withMessage('Please provide a valid URL'),
    
    checkValidationResult
];

/**
 * Platform account validation rules
 */
const validatePlatformAccount = [
    body('platformName')
        .isIn(['leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth'])
        .withMessage('Invalid platform name'),
    
    body('platformUsername')
        .trim()
        .notEmpty()
        .withMessage('Platform username is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('Platform username must be between 1 and 50 characters'),
    
    body('platformUserId')
        .optional()
        .trim(),
    
    checkValidationResult
];

/**
 * Chat message validation rules
 */
const validateChatMessage = [
    body('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    
    body('context')
        .optional()
        .isObject()
        .withMessage('Context must be an object'),
    
    checkValidationResult
];

/**
 * Event validation rules
 */
const validateEvent = [
    body('eventName')
        .trim()
        .notEmpty()
        .withMessage('Event name is required')
        .isLength({ max: 200 })
        .withMessage('Event name cannot exceed 200 characters'),
    
    body('platformName')
        .isIn(['leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth', 'general'])
        .withMessage('Invalid platform name'),
    
    body('eventDate')
        .isISO8601()
        .withMessage('Please provide a valid date')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Event date must be in the future');
            }
            return true;
        }),
    
    body('eventType')
        .optional()
        .isIn(['contest', 'hackathon', 'workshop', 'interview', 'challenge', 'tournament'])
        .withMessage('Invalid event type'),
    
    body('eventUrl')
        .optional()
        .isURL()
        .withMessage('Please provide a valid URL'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    
    checkValidationResult
];

/**
 * Query parameter validation rules
 */
const validatePlatformQuery = [
    query('platform')
        .optional()
        .isIn(['all', 'leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth'])
        .withMessage('Invalid platform name'),
    
    checkValidationResult
];

const validateChartQuery = [
    query('platform')
        .optional()
        .isIn(['all', 'leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth'])
        .withMessage('Invalid platform name'),
    
    query('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Days must be between 1 and 365'),
    
    checkValidationResult
];

const validatePaginationQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    checkValidationResult
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (field = 'id') => [
    param(field)
        .isMongoId()
        .withMessage(`Invalid ${field} format`),
    
    checkValidationResult
];

/**
 * Password change validation
 */
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        }),
    
    checkValidationResult
];

/**
 * Email validation
 */
const validateEmail = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    checkValidationResult
];

module.exports = {
    validateRegister,
    validateLogin,
    validateProfileUpdate,
    validatePlatformAccount,
    validateChatMessage,
    validateEvent,
    validatePlatformQuery,
    validateChartQuery,
    validatePaginationQuery,
    validateObjectId,
    validatePasswordChange,
    validateEmail,
    checkValidationResult
};
