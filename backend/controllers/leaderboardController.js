const User = require('../models/User');
const PlatformAccount = require('../models/PlatformAccount');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get general leaderboard
 * @route   GET /api/leaderboard
 * @access  Public (with optional authentication for personalized data)
 */
const getLeaderboard = asyncHandler(async (req, res) => {
    const { 
        platform = 'overall', 
        category = 'cscore', 
        limit = 50, 
        timeframe = 'all' 
    } = req.query;

    let leaderboardData;
    let sortField;
    let pipeline = [];

    // Determine sort field based on category
    switch (category) {
        case 'cscore':
            sortField = { cScore: -1 };
            break;
        case 'problems':
            sortField = { 'aggregatedStats.totalProblems': -1 };
            break;
        case 'rating':
            sortField = { 'aggregatedStats.avgRating': -1 };
            break;
        case 'streak':
            sortField = { 'aggregatedStats.maxStreak': -1 };
            break;
        default:
            sortField = { cScore: -1 };
    }

    if (platform === 'overall') {
        // Overall leaderboard - aggregate user stats across all platforms
        pipeline = [
            {
                $lookup: {
                    from: 'platformaccounts',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'platforms'
                }
            },
            {
                $addFields: {
                    aggregatedStats: {
                        $reduce: {
                            input: '$platforms',
                            initialValue: {
                                totalProblems: 0,
                                totalRating: 0,
                                platformCount: 0,
                                maxStreak: 0,
                                avgRating: 0
                            },
                            in: {
                                totalProblems: {
                                    $add: ['$$value.totalProblems', '$$this.stats.totalProblemsSolved']
                                },
                                totalRating: {
                                    $add: ['$$value.totalRating', '$$this.stats.contestRating']
                                },
                                platformCount: {
                                    $add: ['$$value.platformCount', 1]
                                },
                                maxStreak: {
                                    $max: ['$$value.maxStreak', '$$this.stats.streak.max']
                                },
                                avgRating: 0 // Will be calculated after
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    'aggregatedStats.avgRating': {
                        $cond: {
                            if: { $gt: ['$aggregatedStats.platformCount', 0] },
                            then: { $divide: ['$aggregatedStats.totalRating', '$aggregatedStats.platformCount'] },
                            else: 0
                        }
                    }
                }
            },
            {
                $match: {
                    'aggregatedStats.platformCount': { $gt: 0 }
                }
            },
            {
                $sort: sortField
            },
            {
                $limit: parseInt(limit)
            },
            {
                $project: {
                    name: 1,
                    username: 1,
                    avatar: 1,
                    cScore: 1,
                    rank: 1,
                    isPublic: 1,
                    aggregatedStats: 1,
                    joinDate: '$createdAt'
                }
            }
        ];

        leaderboardData = await User.aggregate(pipeline);
    } else {
        // Platform-specific leaderboard
        const platformAccounts = await PlatformAccount.find({ 
            platformName: platform, 
            isActive: true 
        })
        .populate('userId', 'name username avatar cScore rank isPublic createdAt')
        .sort(`stats.${category === 'problems' ? 'totalProblemsSolved' : 
                       category === 'rating' ? 'contestRating' : 
                       category === 'streak' ? 'streak.max' : 'totalProblemsSolved'} -1`)
        .limit(parseInt(limit));

        leaderboardData = platformAccounts
            .filter(account => account.userId && account.userId.isPublic)
            .map((account, index) => ({
                _id: account.userId._id,
                name: account.userId.name,
                username: account.userId.username,
                avatar: account.userId.avatar,
                cScore: account.userId.cScore,
                rank: account.userId.rank,
                platformUsername: account.username,
                platformStats: account.stats,
                joinDate: account.userId.createdAt,
                position: index + 1
            }));
    }

    // Add position numbers
    leaderboardData = leaderboardData.map((user, index) => ({
        ...user,
        position: index + 1
    }));

    // If user is authenticated, find their position
    let userPosition = null;
    if (req.user) {
        if (platform === 'overall') {
            const allUsers = await User.aggregate(pipeline.slice(0, -2)); // Remove limit and project
            userPosition = allUsers.findIndex(user => 
                user._id.toString() === req.user.id
            ) + 1;
        } else {
            const userAccount = await PlatformAccount.findOne({
                userId: req.user.id,
                platformName: platform,
                isActive: true
            });
            
            if (userAccount) {
                const allAccounts = await PlatformAccount.find({ 
                    platformName: platform, 
                    isActive: true 
                })
                .populate('userId', 'isPublic')
                .sort(`stats.${category === 'problems' ? 'totalProblemsSolved' : 
                               category === 'rating' ? 'contestRating' : 
                               category === 'streak' ? 'streak.max' : 'totalProblemsSolved'} -1`);
                
                userPosition = allAccounts
                    .filter(account => account.userId && account.userId.isPublic)
                    .findIndex(account => account._id.toString() === userAccount._id.toString()) + 1;
            }
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            leaderboard: leaderboardData,
            meta: {
                platform,
                category,
                timeframe,
                total: leaderboardData.length,
                userPosition,
                lastUpdated: new Date()
            }
        }
    });
});

/**
 * @desc    Get current user's rank in leaderboard
 * @route   GET /api/leaderboard/rank
 * @access  Private
 */
const getUserRank = asyncHandler(async (req, res) => {
    const { platform = 'overall', category = 'cscore' } = req.query;
    const userId = req.user.id;

    let userRank = {};

    if (platform === 'overall') {
        // Get user's overall rank
        const pipeline = [
            {
                $lookup: {
                    from: 'platformaccounts',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'platforms'
                }
            },
            {
                $addFields: {
                    aggregatedStats: {
                        $reduce: {
                            input: '$platforms',
                            initialValue: {
                                totalProblems: 0,
                                totalRating: 0,
                                platformCount: 0,
                                maxStreak: 0,
                                avgRating: 0
                            },
                            in: {
                                totalProblems: {
                                    $add: ['$$value.totalProblems', '$$this.stats.totalProblemsSolved']
                                },
                                totalRating: {
                                    $add: ['$$value.totalRating', '$$this.stats.contestRating']
                                },
                                platformCount: {
                                    $add: ['$$value.platformCount', 1]
                                },
                                maxStreak: {
                                    $max: ['$$value.maxStreak', '$$this.stats.streak.max']
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    'aggregatedStats.avgRating': {
                        $cond: {
                            if: { $gt: ['$aggregatedStats.platformCount', 0] },
                            then: { $divide: ['$aggregatedStats.totalRating', '$aggregatedStats.platformCount'] },
                            else: 0
                        }
                    }
                }
            },
            {
                $match: {
                    'aggregatedStats.platformCount': { $gt: 0 }
                }
            },
            {
                $sort: { 
                    [category === 'cscore' ? 'cScore' : 
                     category === 'problems' ? 'aggregatedStats.totalProblems' :
                     category === 'rating' ? 'aggregatedStats.avgRating' :
                     'aggregatedStats.maxStreak']: -1 
                }
            }
        ];

        const allUsers = await User.aggregate(pipeline);
        const userIndex = allUsers.findIndex(user => user._id.toString() === userId);
        
        userRank = {
            position: userIndex + 1,
            total: allUsers.length,
            percentile: Math.round(((allUsers.length - userIndex) / allUsers.length) * 100),
            platform: 'overall',
            category
        };
    } else {
        // Get user's platform-specific rank
        const userAccount = await PlatformAccount.findOne({
            userId: userId,
            platformName: platform,
            isActive: true
        });

        if (!userAccount) {
            throw new AppError(`No ${platform} account found`, 404);
        }

        const sortField = category === 'problems' ? 'stats.totalProblemsSolved' : 
                         category === 'rating' ? 'stats.contestRating' : 
                         category === 'streak' ? 'stats.streak.max' : 
                         'stats.totalProblemsSolved';

        const totalUsers = await PlatformAccount.countDocuments({
            platformName: platform,
            isActive: true
        });

        const usersAbove = await PlatformAccount.countDocuments({
            platformName: platform,
            isActive: true,
            [sortField]: { $gt: userAccount.stats[sortField.split('.')[1]] }
        });

        userRank = {
            position: usersAbove + 1,
            total: totalUsers,
            percentile: Math.round(((totalUsers - usersAbove) / totalUsers) * 100),
            platform,
            category,
            value: userAccount.stats[sortField.split('.')[1]]
        };
    }

    res.status(200).json({
        status: 'success',
        data: {
            rank: userRank
        }
    });
});

/**
 * @desc    Get top performers across categories
 * @route   GET /api/leaderboard/top
 * @access  Public
 */
const getTopPerformers = asyncHandler(async (req, res) => {
    const categories = ['cscore', 'problems', 'rating', 'streak'];
    const topPerformers = {};

    for (const category of categories) {
        let sortField;
        
        switch (category) {
            case 'cscore':
                sortField = { cScore: -1 };
                break;
            case 'problems':
                sortField = { 'aggregatedStats.totalProblems': -1 };
                break;
            case 'rating':
                sortField = { 'aggregatedStats.avgRating': -1 };
                break;
            case 'streak':
                sortField = { 'aggregatedStats.maxStreak': -1 };
                break;
        }

        const pipeline = [
            {
                $lookup: {
                    from: 'platformaccounts',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'platforms'
                }
            },
            {
                $addFields: {
                    aggregatedStats: {
                        $reduce: {
                            input: '$platforms',
                            initialValue: {
                                totalProblems: 0,
                                totalRating: 0,
                                platformCount: 0,
                                maxStreak: 0,
                                avgRating: 0
                            },
                            in: {
                                totalProblems: {
                                    $add: ['$$value.totalProblems', '$$this.stats.totalProblemsSolved']
                                },
                                totalRating: {
                                    $add: ['$$value.totalRating', '$$this.stats.contestRating']
                                },
                                platformCount: {
                                    $add: ['$$value.platformCount', 1]
                                },
                                maxStreak: {
                                    $max: ['$$value.maxStreak', '$$this.stats.streak.max']
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    'aggregatedStats.avgRating': {
                        $cond: {
                            if: { $gt: ['$aggregatedStats.platformCount', 0] },
                            then: { $divide: ['$aggregatedStats.totalRating', '$aggregatedStats.platformCount'] },
                            else: 0
                        }
                    }
                }
            },
            {
                $match: {
                    'aggregatedStats.platformCount': { $gt: 0 },
                    isPublic: true
                }
            },
            {
                $sort: sortField
            },
            {
                $limit: 3
            },
            {
                $project: {
                    name: 1,
                    username: 1,
                    avatar: 1,
                    cScore: 1,
                    rank: 1,
                    aggregatedStats: 1
                }
            }
        ];

        topPerformers[category] = await User.aggregate(pipeline);
    }

    res.status(200).json({
        status: 'success',
        data: {
            topPerformers
        }
    });
});

/**
 * @desc    Get leaderboard by specific category
 * @route   GET /api/leaderboard/category/:category
 * @access  Public (with optional authentication)
 */
const getLeaderboardByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { platform = 'overall', limit = 50 } = req.query;

    // Validate category
    const validCategories = ['cscore', 'problems', 'rating', 'streak'];
    if (!validCategories.includes(category)) {
        throw new AppError('Invalid category', 400);
    }

    // Reuse the main leaderboard function with specific category
    req.query.category = category;
    return getLeaderboard(req, res);
});

/**
 * @desc    Get global leaderboard statistics
 * @route   GET /api/leaderboard/stats
 * @access  Public
 */
const getGlobalStats = asyncHandler(async (req, res) => {
    // Get total users and platform accounts
    const totalUsers = await User.countDocuments({ isPublic: true });
    const totalAccounts = await PlatformAccount.countDocuments({ isActive: true });

    // Get platform distribution
    const platformDistribution = await PlatformAccount.aggregate([
        {
            $match: { isActive: true }
        },
        {
            $group: {
                _id: '$platformName',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    // Get top statistics
    const topStats = await User.aggregate([
        {
            $lookup: {
                from: 'platformaccounts',
                localField: '_id',
                foreignField: 'userId',
                as: 'platforms'
            }
        },
        {
            $addFields: {
                totalProblems: {
                    $sum: '$platforms.stats.totalProblemsSolved'
                },
                avgRating: {
                    $avg: '$platforms.stats.contestRating'
                },
                maxStreak: {
                    $max: '$platforms.stats.streak.max'
                }
            }
        },
        {
            $group: {
                _id: null,
                maxCScore: { $max: '$cScore' },
                maxProblems: { $max: '$totalProblems' },
                maxRating: { $max: '$avgRating' },
                maxStreak: { $max: '$maxStreak' },
                totalProblemsGlobal: { $sum: '$totalProblems' }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            globalStats: {
                totalUsers,
                totalAccounts,
                platformDistribution,
                records: topStats[0] || {
                    maxCScore: 0,
                    maxProblems: 0,
                    maxRating: 0,
                    maxStreak: 0,
                    totalProblemsGlobal: 0
                },
                lastUpdated: new Date()
            }
        }
    });
});

module.exports = {
    getLeaderboard,
    getUserRank,
    getTopPerformers,
    getLeaderboardByCategory,
    getGlobalStats
};
