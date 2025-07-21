const express = require('express');
const { protect } = require('../middleware/auth');
const { 
    validatePlatformQuery,
    validateObjectId 
} = require('../middleware/validation');
const {
    getStats,
    getPlatformStats,
    updateStats,
    syncAllPlatforms,
    syncPlatform,
    getStatsHistory,
    getGrowthMetrics
} = require('../controllers/statsController');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', validatePlatformQuery, getStats);
router.get('/history', getStatsHistory);
router.get('/growth', getGrowthMetrics);
router.get('/:platform', getPlatformStats);
router.post('/sync', syncAllPlatforms);
router.post('/sync/:platform', syncPlatform);
router.put('/update', updateStats);

module.exports = router;
