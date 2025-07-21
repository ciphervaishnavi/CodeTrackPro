const mongoose = require('mongoose');

const statsHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    platformName: {
        type: String,
        required: true,
        enum: ['leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth', 'overall'],
        lowercase: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    snapshotType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
    },
    stats: {
        problemsSolved: {
            total: { type: Number, default: 0 },
            easy: { type: Number, default: 0 },
            medium: { type: Number, default: 0 },
            hard: { type: Number, default: 0 }
        },
        contestRating: {
            type: Number,
            default: 0
        },
        maxRating: {
            type: Number,
            default: 0
        },
        contestsParticipated: {
            type: Number,
            default: 0
        },
        globalRank: {
            type: Number,
            default: 0
        },
        cScore: {
            type: Number,
            default: 0
        },
        submissionStats: {
            totalSubmissions: { type: Number, default: 0 },
            acceptedSubmissions: { type: Number, default: 0 },
            acceptanceRate: { type: Number, default: 0 }
        },
        streakData: {
            currentStreak: { type: Number, default: 0 },
            maxStreak: { type: Number, default: 0 }
        }
    },
    metadata: {
        // Additional platform-specific data
        rankChange: {
            type: Number,
            default: 0
        },
        ratingChange: {
            type: Number,
            default: 0
        },
        problemsChange: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for efficient queries
statsHistorySchema.index({ userId: 1, platformName: 1, date: -1 });
statsHistorySchema.index({ userId: 1, date: -1 });
statsHistorySchema.index({ platformName: 1, date: -1 });
statsHistorySchema.index({ date: -1 });
statsHistorySchema.index({ userId: 1, platformName: 1, snapshotType: 1, date: -1 });

// Virtual for date formatting
statsHistorySchema.virtual('formattedDate').get(function() {
    return this.date.toISOString().split('T')[0];
});

// Static method to create snapshot
statsHistorySchema.statics.createSnapshot = async function(userId, platformName, stats, snapshotType = 'daily') {
    try {
        // Check if snapshot already exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existing = await this.findOne({
            userId,
            platformName,
            snapshotType,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (existing) {
            // Update existing snapshot
            existing.stats = stats;
            existing.date = new Date(); // Update timestamp
            return await existing.save();
        } else {
            // Create new snapshot
            return await this.create({
                userId,
                platformName,
                stats,
                snapshotType,
                date: new Date()
            });
        }
    } catch (error) {
        throw new Error(`Failed to create stats snapshot: ${error.message}`);
    }
};

// Static method to get progress data for charts
statsHistorySchema.statics.getProgressData = async function(userId, platformName = 'overall', days = 30) {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const data = await this.find({
        userId,
        platformName,
        date: { $gte: startDate }
    }).sort({ date: 1 }).select('date stats.problemsSolved stats.contestRating');

    return data.map(entry => ({
        date: entry.formattedDate,
        problems: entry.stats.problemsSolved.total,
        rating: entry.stats.contestRating,
        easy: entry.stats.problemsSolved.easy,
        medium: entry.stats.problemsSolved.medium,
        hard: entry.stats.problemsSolved.hard
    }));
};

// Static method to get weekly aggregated data
statsHistorySchema.statics.getWeeklyData = async function(userId, platformName = 'overall', weeks = 12) {
    const startDate = new Date(Date.now() - (weeks * 7 * 24 * 60 * 60 * 1000));
    
    const data = await this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                platformName,
                date: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    week: { $week: '$date' }
                },
                avgProblems: { $avg: '$stats.problemsSolved.total' },
                maxProblems: { $max: '$stats.problemsSolved.total' },
                avgRating: { $avg: '$stats.contestRating' },
                maxRating: { $max: '$stats.contestRating' },
                date: { $first: '$date' }
            }
        },
        {
            $sort: { 'date': 1 }
        }
    ]);

    return data;
};

// Static method to calculate growth metrics
statsHistorySchema.statics.getGrowthMetrics = async function(userId, platformName = 'overall') {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    const [currentData, monthAgoData, weekAgoData] = await Promise.all([
        this.findOne({ userId, platformName }).sort({ date: -1 }),
        this.findOne({ userId, platformName, date: { $lte: thirtyDaysAgo } }).sort({ date: -1 }),
        this.findOne({ userId, platformName, date: { $lte: sevenDaysAgo } }).sort({ date: -1 })
    ]);

    const growth = {
        monthly: {
            problems: 0,
            rating: 0,
            contests: 0
        },
        weekly: {
            problems: 0,
            rating: 0,
            contests: 0
        }
    };

    if (currentData && monthAgoData) {
        growth.monthly.problems = currentData.stats.problemsSolved.total - monthAgoData.stats.problemsSolved.total;
        growth.monthly.rating = currentData.stats.contestRating - monthAgoData.stats.contestRating;
        growth.monthly.contests = currentData.stats.contestsParticipated - monthAgoData.stats.contestsParticipated;
    }

    if (currentData && weekAgoData) {
        growth.weekly.problems = currentData.stats.problemsSolved.total - weekAgoData.stats.problemsSolved.total;
        growth.weekly.rating = currentData.stats.contestRating - weekAgoData.stats.contestRating;
        growth.weekly.contests = currentData.stats.contestsParticipated - weekAgoData.stats.contestsParticipated;
    }

    return growth;
};

// Method to cleanup old records (keep only recent snapshots)
statsHistorySchema.statics.cleanupOldRecords = async function(daysToKeep = 365) {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    
    return await this.deleteMany({
        date: { $lt: cutoffDate },
        snapshotType: 'daily'
    });
};

module.exports = mongoose.model('StatsHistory', statsHistorySchema);
