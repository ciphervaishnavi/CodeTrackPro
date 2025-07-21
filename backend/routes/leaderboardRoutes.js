const express = require('express');
const router = express.Router();
const {
    getLeaderboard,
    getUserRank,
    getTopPerformers,
    getLeaderboardByCategory,
    getGlobalStats
} = require('../controllers/leaderboardController');
const { protect, optionalAuth } = require('../middleware/auth');
const { query } = require('express-validator');
const { validateInput } = require('../middleware/validation');

// Input validation rules
const leaderboardValidation = [
    query('platform')
        .optional()
        .isString()
        .isIn(['leetcode', 'codeforces', 'codechef', 'atcoder', 'hackerrank', 'overall'])
        .withMessage('Invalid platform'),
    query('category')
        .optional()
        .isString()
        .isIn(['problems', 'rating', 'cscore', 'streak'])
        .withMessage('Invalid category'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('timeframe')
        .optional()
        .isString()
        .isIn(['all', 'month', 'week'])
        .withMessage('Invalid timeframe')
];

/**
 * @route   GET /api/leaderboard
 * @desc    Get general leaderboard
 * @access  Public (with optional authentication for personalized data)
 */
router.get('/', optionalAuth, leaderboardValidation, validateInput, getLeaderboard);

/**
 * @route   GET /api/leaderboard/rank
 * @desc    Get current user's rank in leaderboard
 * @access  Private
 */
router.get('/rank', protect, getUserRank);

/**
 * @route   GET /api/leaderboard/top
 * @desc    Get top performers across categories
 * @access  Public
 */
router.get('/top', optionalAuth, getTopPerformers);

/**
 * @route   GET /api/leaderboard/category/:category
 * @desc    Get leaderboard by specific category
 * @access  Public (with optional authentication)
 */
router.get('/category/:category', optionalAuth, leaderboardValidation, validateInput, getLeaderboardByCategory);

/**
 * @route   GET /api/leaderboard/stats
 * @desc    Get global leaderboard statistics
 * @access  Public
 */
router.get('/stats', getGlobalStats);

module.exports = router;
