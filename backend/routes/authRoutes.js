const express = require('express');
const { protect, userRateLimit } = require('../middleware/auth');
const { 
    validateRegister, 
    validateLogin, 
    validateEmail,
    validatePasswordChange 
} = require('../middleware/validation');
const {
    register,
    login,
    logout,
    getMe,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/forgot-password', validateEmail, userRateLimit(3, 15 * 60 * 1000), forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', validateEmail, userRateLimit(3, 15 * 60 * 1000), resendVerificationEmail);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/me', getMe);
router.put('/update-password', validatePasswordChange, updatePassword);

module.exports = router;
