const User = require('../models/User');
const PlatformAccount = require('../models/PlatformAccount');
const StatsHistory = require('../models/StatsHistory');
const Event = require('../models/Event');
const logger = require('../utils/logger');

/**
 * Update all user statistics by syncing with platform APIs
 * This runs periodically to keep user data fresh
 */
const updateAllUserStats = async () => {
    try {
        logger.info('Starting scheduled stats update for all users');

        // Get all active platform accounts
        const platformAccounts = await PlatformAccount.find({ 
            isActive: true,
            lastSyncedAt: { 
                $lt: new Date(Date.now() - 6 * 60 * 60 * 1000) // Not synced in last 6 hours
            }
        }).populate('userId');

        logger.info(`Found ${platformAccounts.length} platform accounts to update`);

        let successCount = 0;
        let errorCount = 0;

        // Process accounts in batches to avoid overwhelming APIs
        const batchSize = 10;
        for (let i = 0; i < platformAccounts.length; i += batchSize) {
            const batch = platformAccounts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (account) => {
                try {
                    // Simulate API calls to different platforms
                    // In a real implementation, you would call actual platform APIs
                    const updatedStats = await simulateStatsFetch(account.platformName, account.username);
                    
                    if (updatedStats) {
                        // Update platform account stats
                        account.stats = {
                            ...account.stats,
                            ...updatedStats,
                            lastUpdated: new Date()
                        };
                        account.lastSyncedAt = new Date();
                        await account.save();

                        // Create stats history entry
                        await StatsHistory.create({
                            userId: account.userId._id,
                            platform: account.platformName,
                            date: new Date(),
                            stats: updatedStats
                        });

                        // Update user's C-Score
                        await updateUserCScore(account.userId._id);
                        
                        successCount++;
                        logger.debug(`Updated stats for ${account.platformName}:${account.username}`);
                    }
                } catch (error) {
                    errorCount++;
                    logger.error(`Failed to update stats for ${account.platformName}:${account.username}`, error);
                }
            });

            await Promise.all(batchPromises);
            
            // Add delay between batches to be respectful to APIs
            if (i + batchSize < platformAccounts.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        logger.info(`Stats update completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
        logger.error('Error in scheduled stats update:', error);
    }
};

/**
 * Update event statuses based on current time
 */
const updateAllEvents = async () => {
    try {
        logger.info('Starting scheduled event status update');

        const now = new Date();
        
        // Update events to 'ongoing' status
        const ongoingUpdate = await Event.updateMany(
            {
                startDate: { $lte: now },
                endDate: { $gt: now },
                status: 'upcoming'
            },
            {
                $set: { status: 'ongoing' }
            }
        );

        // Update events to 'completed' status
        const completedUpdate = await Event.updateMany(
            {
                endDate: { $lte: now },
                status: { $in: ['upcoming', 'ongoing'] }
            },
            {
                $set: { status: 'completed' }
            }
        );

        logger.info(`Event status update completed. Ongoing: ${ongoingUpdate.modifiedCount}, Completed: ${completedUpdate.modifiedCount}`);
    } catch (error) {
        logger.error('Error in scheduled event update:', error);
    }
};

/**
 * Clean up old stats history entries to manage database size
 */
const cleanupOldStatsHistory = async () => {
    try {
        logger.info('Starting cleanup of old stats history');

        // Keep only last 365 days of history
        const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        
        const deleteResult = await StatsHistory.deleteMany({
            date: { $lt: cutoffDate }
        });

        logger.info(`Cleaned up ${deleteResult.deletedCount} old stats history entries`);
    } catch (error) {
        logger.error('Error in stats history cleanup:', error);
    }
};

/**
 * Update user rankings based on C-Scores
 */
const updateUserRankings = async () => {
    try {
        logger.info('Starting user ranking update');

        // Get all users sorted by C-Score
        const users = await User.find({ isPublic: true })
            .sort({ cScore: -1 })
            .select('_id cScore');

        // Update rankings in batches
        const batchSize = 100;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            const updatePromises = batch.map((user, index) => {
                const newRank = i + index + 1;
                return User.findByIdAndUpdate(user._id, { rank: newRank });
            });

            await Promise.all(updatePromises);
        }

        logger.info(`Updated rankings for ${users.length} users`);
    } catch (error) {
        logger.error('Error in user ranking update:', error);
    }
};

/**
 * Simulate fetching stats from platform APIs
 * In a real implementation, this would make actual API calls
 */
const simulateStatsFetch = async (platform, username) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Simulate occasional API failures
    if (Math.random() < 0.05) { // 5% failure rate
        throw new Error('Simulated API failure');
    }

    // Generate realistic stat updates
    const baseStats = getBaseStatsForPlatform(platform);
    
    return {
        totalProblemsSolved: baseStats.totalProblemsSolved + Math.floor(Math.random() * 3),
        easyProblemsSolved: baseStats.easyProblemsSolved + Math.floor(Math.random() * 2),
        mediumProblemsSolved: baseStats.mediumProblemsSolved + Math.floor(Math.random() * 2),
        hardProblemsSolved: baseStats.hardProblemsSolved + Math.floor(Math.random() * 1),
        contestRating: baseStats.contestRating + Math.floor(Math.random() * 20 - 10),
        streak: {
            current: Math.max(0, baseStats.streak.current + Math.floor(Math.random() * 3 - 1)),
            max: baseStats.streak.max
        },
        acceptanceRate: Math.max(0, Math.min(100, baseStats.acceptanceRate + Math.random() * 2 - 1)),
        totalSubmissions: baseStats.totalSubmissions + Math.floor(Math.random() * 5)
    };
};

/**
 * Get base stats for a platform (this would typically come from database)
 */
const getBaseStatsForPlatform = (platform) => {
    const baseStats = {
        totalProblemsSolved: 100,
        easyProblemsSolved: 60,
        mediumProblemsSolved: 35,
        hardProblemsSolved: 5,
        contestRating: 1500,
        streak: { current: 5, max: 15 },
        acceptanceRate: 75,
        totalSubmissions: 150
    };

    // Platform-specific adjustments
    switch (platform) {
        case 'leetcode':
            baseStats.contestRating = 1600;
            break;
        case 'codeforces':
            baseStats.contestRating = 1400;
            break;
        case 'codechef':
            baseStats.contestRating = 1800;
            break;
        default:
            break;
    }

    return baseStats;
};

/**
 * Update a user's C-Score based on their platform accounts
 */
const updateUserCScore = async (userId) => {
    try {
        const platformAccounts = await PlatformAccount.find({ 
            userId: userId, 
            isActive: true 
        });

        if (platformAccounts.length === 0) {
            return;
        }

        // Calculate C-Score based on aggregated platform performance
        let totalProblems = 0;
        let totalRating = 0;
        let maxStreak = 0;
        let platformCount = 0;

        platformAccounts.forEach(account => {
            totalProblems += account.stats.totalProblemsSolved;
            totalRating += account.stats.contestRating;
            maxStreak = Math.max(maxStreak, account.stats.streak.max);
            platformCount++;
        });

        const avgRating = totalRating / platformCount;
        
        // C-Score formula: weighted combination of problems, rating, and streak
        const cScore = Math.round(
            (totalProblems * 10) + 
            (avgRating * 0.5) + 
            (maxStreak * 20) + 
            (platformCount * 50)
        );

        await User.findByIdAndUpdate(userId, { cScore });
    } catch (error) {
        logger.error(`Error updating C-Score for user ${userId}:`, error);
    }
};

module.exports = {
    updateAllUserStats,
    updateAllEvents,
    cleanupOldStatsHistory,
    updateUserRankings
};
