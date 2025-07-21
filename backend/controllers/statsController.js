const User = require('../models/User');
const PlatformAccount = require('../models/PlatformAccount');
const StatsHistory = require('../models/StatsHistory');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { syncPlatformData } = require('../services/platformSync');
const logger = require('../utils/logger');

/**
 * @desc    Get aggregated stats for user
 * @route   GET /api/stats
 * @access  Private
 */
const getStats = asyncHandler(async (req, res) => {
    const { platform } = req.query;
    
    let platformAccounts;
    
    if (platform && platform !== 'all') {
        // Get specific platform stats
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            platformName: platform,
            isActive: true
        });
    } else {
        // Get all platform stats
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            isActive: true
        });
    }

    // Aggregate stats
    const aggregatedStats = {
        totalProblemsSolved: 0,
        easyProblemsSolved: 0,
        mediumProblemsSolved: 0,
        hardProblemsSolved: 0,
        totalContestsParticipated: 0,
        averageContestRating: 0,
        maxContestRating: 0,
        totalCScore: 0,
        platformBreakdown: {},
        streakData: {
            currentStreak: 0,
            maxStreak: 0
        },
        submissionStats: {
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            acceptanceRate: 0
        },
        languageStats: new Map(),
        recentActivity: []
    };

    let totalRating = 0;
    let platformsWithRating = 0;

    platformAccounts.forEach(account => {
        const stats = account.stats;
        
        // Aggregate problem counts
        aggregatedStats.totalProblemsSolved += stats.totalProblemsSolved;
        aggregatedStats.easyProblemsSolved += stats.easyProblemsSolved;
        aggregatedStats.mediumProblemsSolved += stats.mediumProblemsSolved;
        aggregatedStats.hardProblemsSolved += stats.hardProblemsSolved;
        
        // Aggregate contest data
        aggregatedStats.totalContestsParticipated += stats.contestsParticipated;
        if (stats.contestRating > 0) {
            totalRating += stats.contestRating;
            platformsWithRating++;
        }
        aggregatedStats.maxContestRating = Math.max(aggregatedStats.maxContestRating, stats.maxContestRating);
        
        // Aggregate C-Score
        aggregatedStats.totalCScore += account.platformCScore;
        
        // Aggregate submission stats
        aggregatedStats.submissionStats.totalSubmissions += stats.submissionStats.totalSubmissions;
        aggregatedStats.submissionStats.acceptedSubmissions += stats.submissionStats.acceptedSubmissions;
        
        // Aggregate streak data
        aggregatedStats.streakData.currentStreak = Math.max(aggregatedStats.streakData.currentStreak, stats.streak.current);
        aggregatedStats.streakData.maxStreak = Math.max(aggregatedStats.streakData.maxStreak, stats.streak.max);
        
        // Platform breakdown
        aggregatedStats.platformBreakdown[account.platformName] = {
            problems: stats.totalProblemsSolved,
            rating: stats.contestRating,
            contests: stats.contestsParticipated,
            rank: stats.globalRank,
            lastUpdated: account.lastUpdated
        };
        
        // Aggregate language stats
        if (stats.languageStats) {
            stats.languageStats.forEach((langData, language) => {
                if (aggregatedStats.languageStats.has(language)) {
                    const existing = aggregatedStats.languageStats.get(language);
                    existing.problemsSolved += langData.problemsSolved;
                    existing.submissions += langData.submissions;
                } else {
                    aggregatedStats.languageStats.set(language, { ...langData });
                }
            });
        }
        
        // Collect recent activity
        if (stats.recentActivity && stats.recentActivity.length > 0) {
            aggregatedStats.recentActivity.push(...stats.recentActivity.map(activity => ({
                ...activity,
                platform: account.platformName
            })));
        }
    });

    // Calculate average rating
    if (platformsWithRating > 0) {
        aggregatedStats.averageContestRating = Math.round(totalRating / platformsWithRating);
    }

    // Calculate overall acceptance rate
    if (aggregatedStats.submissionStats.totalSubmissions > 0) {
        aggregatedStats.submissionStats.acceptanceRate = Math.round(
            (aggregatedStats.submissionStats.acceptedSubmissions / aggregatedStats.submissionStats.totalSubmissions) * 100
        );
    }

    // Sort recent activity by date
    aggregatedStats.recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    aggregatedStats.recentActivity = aggregatedStats.recentActivity.slice(0, 20); // Keep only recent 20

    // Convert Map to Object for JSON response
    aggregatedStats.languageStats = Object.fromEntries(aggregatedStats.languageStats);

    res.status(200).json({
        status: 'success',
        data: {
            stats: aggregatedStats,
            platformCount: platformAccounts.length,
            lastUpdated: platformAccounts.length > 0 
                ? Math.max(...platformAccounts.map(acc => new Date(acc.lastUpdated).getTime()))
                : null
        }
    });
});

/**
 * @desc    Get stats for specific platform
 * @route   GET /api/stats/:platform
 * @access  Private
 */
const getPlatformStats = asyncHandler(async (req, res) => {
    const { platform } = req.params;

    const platformAccount = await PlatformAccount.findOne({
        userId: req.user.id,
        platformName: platform,
        isActive: true
    });

    if (!platformAccount) {
        throw new AppError(`No ${platform} account found`, 404);
    }

    res.status(200).json({
        status: 'success',
        data: {
            platform: platform,
            username: platformAccount.platformUsername,
            stats: platformAccount.stats,
            platformCScore: platformAccount.platformCScore,
            lastUpdated: platformAccount.lastUpdated,
            syncStatus: platformAccount.syncStatus,
            lastSyncError: platformAccount.lastSyncError
        }
    });
});

/**
 * @desc    Update stats manually
 * @route   PUT /api/stats/update
 * @access  Private
 */
const updateStats = asyncHandler(async (req, res) => {
    // This endpoint allows manual stat updates for testing
    // In production, you might want to restrict this or remove it
    
    const { platform, stats } = req.body;

    if (!platform || !stats) {
        throw new AppError('Platform and stats are required', 400);
    }

    const platformAccount = await PlatformAccount.findOne({
        userId: req.user.id,
        platformName: platform,
        isActive: true
    });

    if (!platformAccount) {
        throw new AppError(`No ${platform} account found`, 404);
    }

    await platformAccount.updateStats(stats);

    // Update user's total C-Score
    await updateUserCScore(req.user.id);

    logger.info(`Stats manually updated for ${platform} - User: ${req.user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'Stats updated successfully',
        data: {
            platform: platform,
            stats: platformAccount.stats,
            platformCScore: platformAccount.platformCScore,
            lastUpdated: platformAccount.lastUpdated
        }
    });
});

/**
 * @desc    Sync all platforms for user
 * @route   POST /api/stats/sync
 * @access  Private
 */
const syncAllPlatforms = asyncHandler(async (req, res) => {
    const platformAccounts = await PlatformAccount.find({
        userId: req.user.id,
        isActive: true
    });

    if (platformAccounts.length === 0) {
        throw new AppError('No platform accounts found', 404);
    }

    const syncResults = [];

    // Sync each platform
    for (const account of platformAccounts) {
        try {
            const updatedStats = await syncPlatformData(account.platformName, account.platformUsername);
            await account.updateStats(updatedStats);
            
            syncResults.push({
                platform: account.platformName,
                status: 'success',
                stats: account.stats
            });
        } catch (error) {
            await account.recordSyncError(error);
            syncResults.push({
                platform: account.platformName,
                status: 'error',
                error: error.message
            });
        }
    }

    // Update user's total C-Score
    await updateUserCScore(req.user.id);

    logger.info(`All platforms synced for user: ${req.user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'Platform sync completed',
        data: {
            syncResults,
            totalPlatforms: platformAccounts.length,
            successCount: syncResults.filter(r => r.status === 'success').length,
            errorCount: syncResults.filter(r => r.status === 'error').length
        }
    });
});

/**
 * @desc    Sync specific platform for user
 * @route   POST /api/stats/sync/:platform
 * @access  Private
 */
const syncPlatform = asyncHandler(async (req, res) => {
    const { platform } = req.params;

    const platformAccount = await PlatformAccount.findOne({
        userId: req.user.id,
        platformName: platform,
        isActive: true
    });

    if (!platformAccount) {
        throw new AppError(`No ${platform} account found`, 404);
    }

    try {
        const updatedStats = await syncPlatformData(platform, platformAccount.platformUsername);
        await platformAccount.updateStats(updatedStats);

        // Update user's total C-Score
        await updateUserCScore(req.user.id);

        logger.info(`${platform} synced for user: ${req.user.username}`);

        res.status(200).json({
            status: 'success',
            message: `${platform} stats synced successfully`,
            data: {
                platform: platform,
                stats: platformAccount.stats,
                platformCScore: platformAccount.platformCScore,
                lastUpdated: platformAccount.lastUpdated
            }
        });
    } catch (error) {
        await platformAccount.recordSyncError(error);
        throw new AppError(`Failed to sync ${platform}: ${error.message}`, 500);
    }
});

/**
 * @desc    Get stats history for charts
 * @route   GET /api/stats/history
 * @access  Private
 */
const getStatsHistory = asyncHandler(async (req, res) => {
    const { platform = 'overall', days = 30 } = req.query;

    const progressData = await StatsHistory.getProgressData(req.user.id, platform, parseInt(days));

    res.status(200).json({
        status: 'success',
        data: {
            platform,
            period: `${days} days`,
            progressData
        }
    });
});

/**
 * @desc    Get growth metrics
 * @route   GET /api/stats/growth
 * @access  Private
 */
const getGrowthMetrics = asyncHandler(async (req, res) => {
    const { platform = 'overall' } = req.query;

    const growthMetrics = await StatsHistory.getGrowthMetrics(req.user.id, platform);

    res.status(200).json({
        status: 'success',
        data: {
            platform,
            growth: growthMetrics
        }
    });
});

/**
 * Helper function to update user's total C-Score
 */
const updateUserCScore = async (userId) => {
    const platformAccounts = await PlatformAccount.find({
        userId,
        isActive: true
    });

    const totalCScore = platformAccounts.reduce((total, account) => {
        return total + account.platformCScore;
    }, 0);

    await User.findByIdAndUpdate(userId, { totalCScore });
};

module.exports = {
    getStats,
    getPlatformStats,
    updateStats,
    syncAllPlatforms,
    syncPlatform,
    getStatsHistory,
    getGrowthMetrics
};
