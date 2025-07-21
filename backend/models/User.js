const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in queries by default
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },
    profilePicture: {
        type: String,
        default: ''
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    location: {
        type: String,
        maxlength: [100, 'Location cannot exceed 100 characters']
    },
    github: {
        type: String,
        match: [/^[a-zA-Z0-9_-]+$/, 'Invalid GitHub username format']
    },
    linkedIn: {
        type: String,
        match: [/^[a-zA-Z0-9_-]+$/, 'Invalid LinkedIn username format']
    },
    website: {
        type: String,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL']
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    totalCScore: {
        type: Number,
        default: 0
    },
    settings: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'dark'
        },
        emailNotifications: {
            type: Boolean,
            default: true
        },
        publicProfile: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.username;
});

// Virtual for profile completion percentage
userSchema.virtual('profileCompletion').get(function() {
    let completion = 0;
    const fields = ['bio', 'firstName', 'lastName', 'location', 'profilePicture'];
    
    fields.forEach(field => {
        if (this[field] && this[field].length > 0) {
            completion += 20;
        }
    });
    
    return completion;
});

// Index for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ totalCScore: -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { 
            id: this._id,
            username: this.username,
            email: this.email,
            role: this.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

// Instance method to generate email verification token
userSchema.methods.getEmailVerificationToken = function() {
    // Generate token
    const verificationToken = jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Set token and expiration
    this.emailVerificationToken = verificationToken;
    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
};

// Instance method to generate password reset token
userSchema.methods.getPasswordResetToken = function() {
    // Generate token
    const resetToken = jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // Set token and expiration
    this.passwordResetToken = resetToken;
    this.passwordResetExpire = Date.now() + 60 * 60 * 1000; // 1 hour

    return resetToken;
};

// Static method to calculate C-Score
userSchema.statics.calculateCScore = function(totalProblems, contestRating, badges = 0) {
    // C-Score formula: (problems * 0.7) + (rating * 0.3) + (badges * 10)
    const problemScore = totalProblems * 0.7;
    const ratingScore = contestRating * 0.3;
    const badgeScore = badges * 10;
    
    return Math.round(problemScore + ratingScore + badgeScore);
};

module.exports = mongoose.model('User', userSchema);
