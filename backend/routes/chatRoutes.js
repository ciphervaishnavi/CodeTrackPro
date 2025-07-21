const express = require('express');
const router = express.Router();
const {
    sendMessage,
    getChatHistory,
    clearChatHistory,
    getChatSuggestions
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validateInput } = require('../middleware/validation');

// Input validation rules
const messageValidation = [
    body('message')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    body('context')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .withMessage('Context must be a string with max 2000 characters')
];

/**
 * @route   POST /api/chat/message
 * @desc    Send a message to AI chat bot
 * @access  Private
 */
router.post('/message', protect, messageValidation, validateInput, sendMessage);

/**
 * @route   GET /api/chat/history
 * @desc    Get chat history for the user
 * @access  Private
 */
router.get('/history', protect, getChatHistory);

/**
 * @route   DELETE /api/chat/history
 * @desc    Clear chat history for the user
 * @access  Private
 */
router.delete('/history', protect, clearChatHistory);

/**
 * @route   GET /api/chat/suggestions
 * @desc    Get AI-powered suggestions based on user's profile
 * @access  Private
 */
router.get('/suggestions', protect, getChatSuggestions);

module.exports = router;
