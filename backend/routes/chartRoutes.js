const express = require('express');
const { protect } = require('../middleware/auth');
const { validateChartQuery } = require('../middleware/validation');
const {
    getProblemsOverTime,
    getProblemDistribution,
    getLanguageDistribution,
    getRatingHistory,
    getPlatformComparison,
    getStreakData,
    getSubmissionCalendar
} = require('../controllers/chartController');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/problems-over-time', validateChartQuery, getProblemsOverTime);
router.get('/problem-distribution', validateChartQuery, getProblemDistribution);
router.get('/language-distribution', validateChartQuery, getLanguageDistribution);
router.get('/rating-history', validateChartQuery, getRatingHistory);
router.get('/platform-comparison', getPlatformComparison);
router.get('/streak-data', validateChartQuery, getStreakData);
router.get('/submission-calendar', validateChartQuery, getSubmissionCalendar);

module.exports = router;
