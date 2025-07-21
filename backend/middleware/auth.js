const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookies first (more secure)
        if (req.cookies.token) {
            token = req.cookies.token;
        }
        // Fallback to Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token is valid but user no longer exists'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    status: 'error',
                    message: 'User account is deactivated'
                });
            }

            // Add user to request object
            req.user = user;
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token has expired'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid token'
                });
            } else {
                throw error;
            }
        }

    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Server error during authentication'
        });
    }
};

/**
 * Middleware to authorize specific roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookies first
        if (req.cookies.token) {
            token = req.cookies.token;
        }
        // Fallback to Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                // Verify token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Get user from database
                const user = await User.findById(decoded.id).select('-password');
                
                if (user && user.isActive) {
                    req.user = user;
                }
            } catch (error) {
                // Token invalid, but continue without user
                logger.warn('Invalid token in optional auth:', error.message);
            }
        }

        next();
    } catch (error) {
        logger.error('Optional auth middleware error:', error);
        next(); // Continue without authentication
    }
};

/**
 * Middleware to check if user owns the resource or is admin
 */
const checkResourceOwnership = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        // Admin can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user owns the resource
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        
        if (resourceUserId && resourceUserId !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. You can only access your own resources.'
            });
        }

        next();
    };
};

/**
 * Middleware to verify email before accessing certain routes
 */
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }

    if (!req.user.isEmailVerified) {
        return res.status(403).json({
            status: 'error',
            message: 'Email verification required. Please verify your email address.'
        });
    }

    next();
};

/**
 * Middleware to rate limit sensitive operations per user
 */
const userRateLimit = (maxRequests = 5, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user._id.toString();
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        const userRequests = requests.get(userId) || [];
        const validRequests = userRequests.filter(time => time > windowStart);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                status: 'error',
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
            });
        }

        validRequests.push(now);
        requests.set(userId, validRequests);

        next();
    };
};

module.exports = {
    protect,
    authorize,
    optionalAuth,
    checkResourceOwnership,
    requireEmailVerification,
    userRateLimit
};
