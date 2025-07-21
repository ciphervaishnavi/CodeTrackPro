const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const User = require('../models/User');
const PlatformAccount = require('../models/PlatformAccount');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Get current user's profile
 * @route   GET /api/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    // Get platform accounts
    const platformAccounts = await PlatformAccount.find({ 
        userId: req.user.id, 
        isActive: true 
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                bio: user.bio,
                profilePicture: user.profilePicture,
                location: user.location,
                github: user.github,
                linkedIn: user.linkedIn,
                website: user.website,
                isEmailVerified: user.isEmailVerified,
                profileCompletion: user.profileCompletion,
                totalCScore: user.totalCScore,
                settings: user.settings,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            platformAccounts: platformAccounts.map(account => ({
                id: account._id,
                platformName: account.platformName,
                platformUsername: account.platformUsername,
                stats: account.stats,
                lastUpdated: account.lastUpdated,
                syncStatus: account.syncStatus,
                platformCScore: account.platformCScore
            }))
        }
    });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = [
        'username', 'firstName', 'lastName', 'bio', 'location', 
        'github', 'linkedIn', 'website', 'settings'
    ];
    
    const updates = {};
    
    // Only include allowed fields
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updates[key] = req.body[key];
        }
    });

    // Check if username is being changed and if it's available
    if (updates.username && updates.username !== req.user.username) {
        const existingUser = await User.findOne({ 
            username: updates.username,
            _id: { $ne: req.user.id }
        });
        
        if (existingUser) {
            throw new AppError('Username is already taken', 400);
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        {
            new: true,
            runValidators: true
        }
    );

    logger.info(`Profile updated for user: ${user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                bio: user.bio,
                profilePicture: user.profilePicture,
                location: user.location,
                github: user.github,
                linkedIn: user.linkedIn,
                website: user.website,
                profileCompletion: user.profileCompletion,
                settings: user.settings
            }
        }
    });
});

/**
 * @desc    Upload profile picture
 * @route   POST /api/profile/upload-picture
 * @access  Private
 */
const uploadProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload a file', 400);
    }

    const user = await User.findById(req.user.id);
    
    // Delete old profile picture if it exists
    if (user.profilePicture) {
        const oldImagePath = path.join(__dirname, '../uploads/profiles/', path.basename(user.profilePicture));
        try {
            await fs.unlink(oldImagePath);
        } catch (error) {
            logger.warn(`Failed to delete old profile picture: ${error.message}`);
        }
    }

    try {
        // Process image with Sharp (resize and optimize)
        const processedImagePath = path.join(
            path.dirname(req.file.path),
            'processed-' + path.basename(req.file.path)
        );

        await sharp(req.file.path)
            .resize(300, 300, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toFile(processedImagePath);

        // Delete original file
        await fs.unlink(req.file.path);

        // Update user profile picture URL
        const profilePictureUrl = `/uploads/profiles/${path.basename(processedImagePath)}`;
        
        user.profilePicture = profilePictureUrl;
        await user.save({ validateBeforeSave: false });

        logger.info(`Profile picture updated for user: ${user.username}`);

        res.status(200).json({
            status: 'success',
            message: 'Profile picture updated successfully',
            data: {
                profilePicture: profilePictureUrl
            }
        });

    } catch (error) {
        // Clean up uploaded file on error
        try {
            await fs.unlink(req.file.path);
        } catch (unlinkError) {
            logger.error(`Failed to cleanup uploaded file: ${unlinkError.message}`);
        }
        
        throw new AppError('Error processing image', 500);
    }
});

/**
 * @desc    Delete user profile (deactivate account)
 * @route   DELETE /api/profile
 * @access  Private
 */
const deleteProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    // Deactivate account instead of deleting
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.username = `deleted_${Date.now()}_${user.username}`;
    await user.save({ validateBeforeSave: false });

    // Deactivate platform accounts
    await PlatformAccount.updateMany(
        { userId: req.user.id },
        { isActive: false }
    );

    logger.info(`Account deactivated for user: ${req.user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'Account deactivated successfully'
    });
});

/**
 * @desc    Add platform account
 * @route   POST /api/profile/platforms
 * @access  Private
 */
const addPlatformAccount = asyncHandler(async (req, res) => {
    const { platformName, platformUsername, platformUserId } = req.body;

    // Check if platform account already exists
    const existingAccount = await PlatformAccount.findOne({
        userId: req.user.id,
        platformName,
        isActive: true
    });

    if (existingAccount) {
        throw new AppError(`You already have a ${platformName} account linked`, 400);
    }

    // Create platform account
    const platformAccount = await PlatformAccount.create({
        userId: req.user.id,
        platformName,
        platformUsername,
        platformUserId,
        syncStatus: 'pending'
    });

    logger.info(`Platform account added: ${platformName} for user: ${req.user.username}`);

    res.status(201).json({
        status: 'success',
        message: 'Platform account added successfully',
        data: {
            platformAccount: {
                id: platformAccount._id,
                platformName: platformAccount.platformName,
                platformUsername: platformAccount.platformUsername,
                stats: platformAccount.stats,
                syncStatus: platformAccount.syncStatus,
                createdAt: platformAccount.createdAt
            }
        }
    });
});

/**
 * @desc    Update platform account
 * @route   PUT /api/profile/platforms/:platformId
 * @access  Private
 */
const updatePlatformAccount = asyncHandler(async (req, res) => {
    const { platformUsername, platformUserId } = req.body;

    const platformAccount = await PlatformAccount.findOne({
        _id: req.params.platformId,
        userId: req.user.id,
        isActive: true
    });

    if (!platformAccount) {
        throw new AppError('Platform account not found', 404);
    }

    // Update fields
    if (platformUsername) platformAccount.platformUsername = platformUsername;
    if (platformUserId) platformAccount.platformUserId = platformUserId;
    
    platformAccount.syncStatus = 'pending'; // Mark for re-sync
    await platformAccount.save();

    logger.info(`Platform account updated: ${platformAccount.platformName} for user: ${req.user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'Platform account updated successfully',
        data: {
            platformAccount: {
                id: platformAccount._id,
                platformName: platformAccount.platformName,
                platformUsername: platformAccount.platformUsername,
                platformUserId: platformAccount.platformUserId,
                stats: platformAccount.stats,
                syncStatus: platformAccount.syncStatus,
                lastUpdated: platformAccount.lastUpdated
            }
        }
    });
});

/**
 * @desc    Remove platform account
 * @route   DELETE /api/profile/platforms/:platformId
 * @access  Private
 */
const removePlatformAccount = asyncHandler(async (req, res) => {
    const platformAccount = await PlatformAccount.findOne({
        _id: req.params.platformId,
        userId: req.user.id,
        isActive: true
    });

    if (!platformAccount) {
        throw new AppError('Platform account not found', 404);
    }

    // Deactivate instead of deleting to preserve history
    platformAccount.isActive = false;
    await platformAccount.save();

    logger.info(`Platform account removed: ${platformAccount.platformName} for user: ${req.user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'Platform account removed successfully'
    });
});

/**
 * @desc    Get all public user profiles
 * @route   GET /api/profile/users
 * @access  Public
 */
const getUserProfiles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, sortBy = 'totalCScore' } = req.query;
    
    const query = {
        isActive: true,
        'settings.publicProfile': true
    };

    // Add search functionality
    if (search) {
        query.$or = [
            { username: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = -1; // Descending order

    const users = await User.find(query)
        .select('username firstName lastName bio profilePicture location totalCScore createdAt')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
        status: 'success',
        data: {
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalUsers: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        }
    });
});

/**
 * @desc    Get public profile by username
 * @route   GET /api/profile/public/:username
 * @access  Public
 */
const getPublicProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne({
        username,
        isActive: true,
        'settings.publicProfile': true
    }).select('username firstName lastName bio profilePicture location totalCScore createdAt');

    if (!user) {
        throw new AppError('User not found or profile is private', 404);
    }

    // Get public platform accounts
    const platformAccounts = await PlatformAccount.find({
        userId: user._id,
        isActive: true
    }).select('platformName platformUsername stats lastUpdated');

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                username: user.username,
                fullName: user.fullName,
                bio: user.bio,
                profilePicture: user.profilePicture,
                location: user.location,
                totalCScore: user.totalCScore,
                joinedAt: user.createdAt
            },
            platformAccounts: platformAccounts.map(account => ({
                platformName: account.platformName,
                platformUsername: account.platformUsername,
                stats: {
                    totalProblemsSolved: account.stats.totalProblemsSolved,
                    contestRating: account.stats.contestRating,
                    globalRank: account.stats.globalRank
                },
                lastUpdated: account.lastUpdated
            }))
        }
    });
});

module.exports = {
    getProfile,
    updateProfile,
    uploadProfilePicture,
    deleteProfile,
    addPlatformAccount,
    updatePlatformAccount,
    removePlatformAccount,
    getUserProfiles,
    getPublicProfile
};
