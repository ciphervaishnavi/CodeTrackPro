const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existingUser) {
        if (existingUser.email === email) {
            throw new AppError('User with this email already exists', 400);
        }
        if (existingUser.username === username) {
            throw new AppError('Username is already taken', 400);
        }
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName
    });

    // Generate email verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token for immediate login
    const token = user.getSignedJwtToken();

    // Set cookie options
    const cookieOptions = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    // Log successful registration
    logger.info(`New user registered: ${username} (${email})`);

    res.status(201)
        .cookie('token', token, cookieOptions)
        .json({
            status: 'success',
            message: 'User registered successfully. Please check your email for verification.',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isEmailVerified: user.isEmailVerified,
                    profileCompletion: user.profileCompletion
                },
                token
            }
        });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
        throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = user.getSignedJwtToken();

    // Set cookie options
    const cookieOptions = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    // Remove password from response
    user.password = undefined;

    // Log successful login
    logger.info(`User logged in: ${user.username} (${user.email})`);

    res.status(200)
        .cookie('token', token, cookieOptions)
        .json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    bio: user.bio,
                    profilePicture: user.profilePicture,
                    isEmailVerified: user.isEmailVerified,
                    profileCompletion: user.profileCompletion,
                    totalCScore: user.totalCScore,
                    settings: user.settings
                },
                token
            }
        });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        status: 'success',
        message: 'Logout successful'
    });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
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
            }
        }
    });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
        throw new AppError('Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.getSignedJwtToken();

    // Set cookie options
    const cookieOptions = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    logger.info(`Password updated for user: ${user.username}`);

    res.status(200)
        .cookie('token', token, cookieOptions)
        .json({
            status: 'success',
            message: 'Password updated successfully',
            data: {
                token
            }
        });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({
            status: 'success',
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    }

    // Generate reset token
    const resetToken = user.getPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    logger.info(`Password reset requested for user: ${user.username}`);

    // In a real application, you would send an email here
    // For now, we'll just log the reset URL
    if (process.env.NODE_ENV === 'development') {
        logger.info(`Password reset URL: ${resetUrl}`);
    }

    res.status(200).json({
        status: 'success',
        message: 'If an account with that email exists, a password reset link has been sent.',
        ...(process.env.NODE_ENV === 'development' && { resetUrl })
    });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        throw new AppError('Password is required', 400);
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by token and check expiration
        const user = await User.findOne({
            _id: decoded.id,
            passwordResetToken: token,
            passwordResetExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new AppError('Invalid or expired reset token', 400);
        }

        // Set new password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        await user.save();

        // Generate new JWT token
        const jwtToken = user.getSignedJwtToken();

        // Set cookie options
        const cookieOptions = {
            expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };

        logger.info(`Password reset successful for user: ${user.username}`);

        res.status(200)
            .cookie('token', jwtToken, cookieOptions)
            .json({
                status: 'success',
                message: 'Password reset successful',
                data: {
                    token: jwtToken
                }
            });

    } catch (error) {
        throw new AppError('Invalid or expired reset token', 400);
    }
});

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by token and check expiration
        const user = await User.findOne({
            _id: decoded.id,
            emailVerificationToken: token,
            emailVerificationExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new AppError('Invalid or expired verification token', 400);
        }

        // Verify email
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save({ validateBeforeSave: false });

        logger.info(`Email verified for user: ${user.username}`);

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully'
        });

    } catch (error) {
        throw new AppError('Invalid or expired verification token', 400);
    }
});

/**
 * @desc    Resend email verification
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(200).json({
            status: 'success',
            message: 'If an account with that email exists and is not verified, a verification email has been sent.'
        });
    }

    if (user.isEmailVerified) {
        return res.status(400).json({
            status: 'error',
            message: 'Email is already verified'
        });
    }

    // Generate new verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verification resent for user: ${user.username}`);

    res.status(200).json({
        status: 'success',
        message: 'If an account with that email exists and is not verified, a verification email has been sent.'
    });
});

module.exports = {
    register,
    login,
    logout,
    getMe,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail
};
