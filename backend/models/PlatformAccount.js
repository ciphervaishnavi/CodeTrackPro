const mongoose = require('mongoose');

const platformAccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    platformName: {
        type: String,
        required: true,
        enum: ['leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth'],
        lowercase: true
    },
    platformUsername: {
        type: String,
        required: true,
        trim: true
    },
    platformUserId: {
        type: String, // Some platforms use numeric IDs
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    stats: {
        totalProblemsSolved: {
            type: Number,
            default: 0
        },
        easyProblemsSolved: {
            type: Number,
            default: 0
        },
        mediumProblemsSolved: {
            type: Number,
            default: 0
        },
        hardProblemsSolved: {
            type: Number,
            default: 0
        },
        contestRating: {
            type: Number,
            default: 0
        },
        maxContestRating: {
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
        countryRank: {
            type: Number,
            default: 0
        },
        badges: {
            type: Number,
            default: 0
        },
        streak: {
            current: {
                type: Number,
                default: 0
            },
            max: {
                type: Number,
                default: 0
            }
        },
        submissionStats: {
            totalSubmissions: {
                type: Number,
                default: 0
            },
            acceptedSubmissions: {
                type: Number,
                default: 0
            },
            acceptanceRate: {
                type: Number,
                default: 0
            }
        },
        languageStats: {
            type: Map,
            of: {
                problemsSolved: Number,
                submissions: Number
            },
            default: new Map()
        },
        recentActivity: [{
            date: {
                type: Date,
                required: true
            },
            problemTitle: String,
            problemDifficulty: {
                type: String,
                enum: ['easy', 'medium', 'hard']
            },
            status: {
                type: String,
                enum: ['accepted', 'wrong-answer', 'time-limit-exceeded', 'runtime-error', 'compilation-error']
            },
            language: String,
            contestName: String
        }]
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    lastSyncError: {
        message: String,
        timestamp: Date
    },
    syncStatus: {
        type: String,
        enum: ['success', 'error', 'pending', 'never'],
        default: 'never'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
platformAccountSchema.index({ userId: 1, platformName: 1 }, { unique: true });
platformAccountSchema.index({ platformName: 1, platformUsername: 1 });
platformAccountSchema.index({ userId: 1 });
platformAccountSchema.index({ lastUpdated: 1 });

// Virtual for calculating platform-specific C-Score
platformAccountSchema.virtual('platformCScore').get(function() {
    const stats = this.stats;
    return Math.round(
        (stats.totalProblemsSolved * 0.7) + 
        (stats.contestRating * 0.3) + 
        (stats.badges * 10)
    );
});

// Virtual for acceptance rate calculation
platformAccountSchema.virtual('acceptanceRate').get(function() {
    const { totalSubmissions, acceptedSubmissions } = this.stats.submissionStats;
    return totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;
});

// Method to update stats safely
platformAccountSchema.methods.updateStats = function(newStats) {
    // Merge new stats with existing stats
    this.stats = {
        ...this.stats.toObject(),
        ...newStats,
        submissionStats: {
            ...this.stats.submissionStats,
            ...(newStats.submissionStats || {})
        },
        streak: {
            ...this.stats.streak,
            ...(newStats.streak || {})
        }
    };
    
    this.lastUpdated = new Date();
    this.syncStatus = 'success';
    this.lastSyncError = undefined;
    
    return this.save();
};

// Method to record sync error
platformAccountSchema.methods.recordSyncError = function(error) {
    this.syncStatus = 'error';
    this.lastSyncError = {
        message: error.message || 'Unknown error',
        timestamp: new Date()
    };
    
    return this.save();
};

// Static method to find user's platform accounts
platformAccountSchema.statics.findByUser = function(userId) {
    return this.find({ userId, isActive: true }).populate('userId', 'username email');
};

// Static method to find accounts that need updating
platformAccountSchema.statics.findStaleAccounts = function(hoursOld = 24) {
    const staleDate = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));
    return this.find({
        isActive: true,
        $or: [
            { lastUpdated: { $lt: staleDate } },
            { syncStatus: 'never' }
        ]
    }).populate('userId', 'username email');
};

// Pre-save middleware to calculate acceptance rate
platformAccountSchema.pre('save', function(next) {
    const { totalSubmissions, acceptedSubmissions } = this.stats.submissionStats;
    if (totalSubmissions > 0) {
        this.stats.submissionStats.acceptanceRate = Math.round((acceptedSubmissions / totalSubmissions) * 100);
    }
    next();
});

module.exports = mongoose.model('PlatformAccount', platformAccountSchema);
