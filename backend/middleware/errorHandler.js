const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error details
    logger.error(`Error ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous'
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Invalid resource ID format';
        error = {
            message,
            statusCode: 400
        };
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
        error = {
            message,
            statusCode: 400
        };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            message,
            statusCode: 400
        };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = {
            message,
            statusCode: 401
        };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token has expired';
        error = {
            message,
            statusCode: 401
        };
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File size too large';
        error = {
            message,
            statusCode: 400
        };
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        const message = 'Too many files uploaded';
        error = {
            message,
            statusCode: 400
        };
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const message = 'Unexpected file field';
        error = {
            message,
            statusCode: 400
        };
    }

    // Rate limiting errors
    if (err.status === 429) {
        const message = 'Too many requests, please try again later';
        error = {
            message,
            statusCode: 429
        };
    }

    // External API errors
    if (err.isAxiosError) {
        const message = 'External service unavailable';
        error = {
            message,
            statusCode: 503
        };
    }

    // Database connection errors
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
        const message = 'Database service unavailable';
        error = {
            message,
            statusCode: 503
        };
    }

    // OpenAI API errors
    if (err.type === 'invalid_request_error') {
        const message = 'AI service error: Invalid request';
        error = {
            message,
            statusCode: 400
        };
    }

    if (err.type === 'rate_limit_exceeded') {
        const message = 'AI service temporarily unavailable due to rate limits';
        error = {
            message,
            statusCode: 429
        };
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    // Don't send error details in production
    const errorResponse = {
        status: 'error',
        message
    };

    // Add additional details in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error = {
            name: err.name,
            stack: err.stack,
            details: err
        };
    }

    // Add request ID for tracking
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

/**
 * Custom error class
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    errorHandler,
    asyncHandler,
    notFound,
    AppError
};
