const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    platformName: {
        type: String,
        required: true,
        enum: ['leetcode', 'codeforces', 'hackerrank', 'codechef', 'atcoder', 'hackerearth', 'general'],
        lowercase: true
    },
    eventName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Event name cannot exceed 200 characters']
    },
    eventType: {
        type: String,
        enum: ['contest', 'hackathon', 'workshop', 'interview', 'challenge', 'tournament'],
        default: 'contest'
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    eventDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    duration: {
        hours: {
            type: Number,
            min: 0,
            max: 168 // Max 1 week
        },
        minutes: {
            type: Number,
            min: 0,
            max: 59
        }
    },
    eventUrl: {
        type: String,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL']
    },
    registrationUrl: {
        type: String,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL']
    },
    isRegistrationRequired: {
        type: Boolean,
        default: true
    },
    maxParticipants: {
        type: Number,
        min: 1
    },
    currentParticipants: {
        type: Number,
        default: 0,
        min: 0
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    },
    prizes: [{
        position: {
            type: String,
            required: true
        },
        prize: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            min: 0
        }
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    languages: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    eligibility: {
        minRating: {
            type: Number,
            min: 0
        },
        maxRating: {
            type: Number,
            min: 0
        },
        ageRestriction: {
            min: Number,
            max: Number
        },
        geographicRestrictions: [String],
        studentOnly: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sourceId: {
        type: String, // External platform's event ID
        sparse: true
    },
    metadata: {
        // Additional platform-specific data
        contestType: String,
        ratingChange: Boolean,
        editorialAvailable: Boolean,
        solutions: Boolean
    },
    reminders: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reminderTime: {
            type: Number, // Minutes before event
            enum: [5, 15, 30, 60, 120, 1440], // 5min to 24h
            default: 30
        },
        sent: {
            type: Boolean,
            default: false
        }
    }],
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['registered', 'participated', 'no-show'],
            default: 'registered'
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient queries
eventSchema.index({ eventDate: 1 });
eventSchema.index({ platformName: 1, eventDate: 1 });
eventSchema.index({ status: 1, eventDate: 1 });
eventSchema.index({ platformName: 1, sourceId: 1 }, { unique: true, sparse: true });
eventSchema.index({ tags: 1 });
eventSchema.index({ 'participants.userId': 1 });

// Virtual for event status based on current time
eventSchema.virtual('currentStatus').get(function() {
    const now = new Date();
    const eventStart = this.eventDate;
    const eventEnd = this.endDate || new Date(eventStart.getTime() + ((this.duration?.hours || 2) * 60 * 60 * 1000));

    if (now < eventStart) {
        return 'upcoming';
    } else if (now >= eventStart && now <= eventEnd) {
        return 'ongoing';
    } else {
        return 'completed';
    }
});

// Virtual for time until event
eventSchema.virtual('timeUntilEvent').get(function() {
    const now = new Date();
    const timeDiff = this.eventDate - now;
    
    if (timeDiff <= 0) {
        return null;
    }

    const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));

    return { days, hours, minutes };
});

// Virtual for event duration in readable format
eventSchema.virtual('durationFormatted').get(function() {
    if (!this.duration?.hours && !this.duration?.minutes) {
        return 'Duration not specified';
    }
    
    const hours = this.duration.hours || 0;
    const minutes = this.duration.minutes || 0;
    
    if (hours === 0) {
        return `${minutes} minutes`;
    } else if (minutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return `${hours}h ${minutes}m`;
    }
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(platformName = null, limit = 10) {
    const query = {
        eventDate: { $gte: new Date() },
        isActive: true
    };
    
    if (platformName && platformName !== 'all') {
        query.platformName = platformName;
    }
    
    return this.find(query)
        .sort({ eventDate: 1 })
        .limit(limit);
};

// Static method to find events in date range
eventSchema.statics.findInDateRange = function(startDate, endDate, platformName = null) {
    const query = {
        eventDate: {
            $gte: startDate,
            $lte: endDate
        },
        isActive: true
    };
    
    if (platformName && platformName !== 'all') {
        query.platformName = platformName;
    }
    
    return this.find(query).sort({ eventDate: 1 });
};

// Static method to find events requiring reminders
eventSchema.statics.findEventsForReminders = function() {
    const now = new Date();
    
    return this.find({
        eventDate: { $gte: now },
        'reminders.sent': false,
        isActive: true
    }).populate('reminders.userId', 'email username settings.emailNotifications');
};

// Method to add participant
eventSchema.methods.addParticipant = function(userId, reminderTime = 30) {
    // Check if user is already registered
    const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
    
    if (existingParticipant) {
        throw new Error('User is already registered for this event');
    }
    
    // Add participant
    this.participants.push({
        userId,
        registeredAt: new Date(),
        status: 'registered'
    });
    
    // Add reminder if requested
    if (reminderTime) {
        this.reminders.push({
            userId,
            reminderTime,
            sent: false
        });
    }
    
    this.currentParticipants += 1;
    
    return this.save();
};

// Method to remove participant
eventSchema.methods.removeParticipant = function(userId) {
    this.participants = this.participants.filter(p => p.userId.toString() !== userId.toString());
    this.reminders = this.reminders.filter(r => r.userId.toString() !== userId.toString());
    this.currentParticipants = Math.max(0, this.currentParticipants - 1);
    
    return this.save();
};

// Pre-save middleware to update status and end date
eventSchema.pre('save', function(next) {
    // Auto-calculate end date if not provided
    if (!this.endDate && this.duration?.hours) {
        this.endDate = new Date(this.eventDate.getTime() + (this.duration.hours * 60 * 60 * 1000));
    }
    
    // Update status based on current time
    const now = new Date();
    if (this.eventDate <= now && (!this.endDate || this.endDate >= now)) {
        this.status = 'ongoing';
    } else if (this.endDate && this.endDate < now) {
        this.status = 'completed';
    }
    
    next();
});

module.exports = mongoose.model('Event', eventSchema);
