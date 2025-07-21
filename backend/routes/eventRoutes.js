const express = require('express');
const router = express.Router();
const {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    joinEvent,
    leaveEvent,
    getUpcomingEvents,
    getEventParticipants
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validateInput } = require('../middleware/validation');

// Input validation rules
const eventValidation = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be max 500 characters'),
    body('type')
        .isIn(['contest', 'hackathon', 'workshop', 'webinar', 'competition'])
        .withMessage('Invalid event type'),
    body('platform')
        .optional()
        .isString()
        .isLength({ max: 50 })
        .withMessage('Platform name must be max 50 characters'),
    body('startDate')
        .isISO8601()
        .withMessage('Invalid start date format'),
    body('endDate')
        .isISO8601()
        .withMessage('Invalid end date format')
        .custom((endDate, { req }) => {
            if (new Date(endDate) <= new Date(req.body.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    body('registrationDeadline')
        .optional()
        .isISO8601()
        .withMessage('Invalid registration deadline format'),
    body('maxParticipants')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Max participants must be a positive integer'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    body('tags.*')
        .optional()
        .isString()
        .isLength({ max: 30 })
        .withMessage('Each tag must be max 30 characters'),
    body('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid difficulty level'),
    body('prizes')
        .optional()
        .isArray()
        .withMessage('Prizes must be an array'),
    body('externalLink')
        .optional()
        .isURL()
        .withMessage('Invalid external link URL')
];

const updateEventValidation = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be max 500 characters'),
    body('type')
        .optional()
        .isIn(['contest', 'hackathon', 'workshop', 'webinar', 'competition'])
        .withMessage('Invalid event type'),
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    body('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid difficulty level')
];

/**
 * @route   GET /api/events
 * @desc    Get all events with filtering and pagination
 * @access  Public
 */
router.get('/', getEvents);

/**
 * @route   POST /api/events
 * @desc    Create a new event (admin only)
 * @access  Private (Admin)
 */
router.post('/', protect, authorize('admin'), eventValidation, validateInput, createEvent);

/**
 * @route   GET /api/events/upcoming
 * @desc    Get upcoming events
 * @access  Public
 */
router.get('/upcoming', getUpcomingEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Public
 */
router.get('/:id', param('id').isMongoId().withMessage('Invalid event ID'), validateInput, getEventById);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', 
    protect, 
    authorize('admin'), 
    param('id').isMongoId().withMessage('Invalid event ID'),
    updateEventValidation, 
    validateInput, 
    updateEvent
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', 
    protect, 
    authorize('admin'),
    param('id').isMongoId().withMessage('Invalid event ID'),
    validateInput,
    deleteEvent
);

/**
 * @route   POST /api/events/:id/join
 * @desc    Join an event
 * @access  Private
 */
router.post('/:id/join', 
    protect,
    param('id').isMongoId().withMessage('Invalid event ID'),
    validateInput,
    joinEvent
);

/**
 * @route   POST /api/events/:id/leave
 * @desc    Leave an event
 * @access  Private
 */
router.post('/:id/leave', 
    protect,
    param('id').isMongoId().withMessage('Invalid event ID'),
    validateInput,
    leaveEvent
);

/**
 * @route   GET /api/events/:id/participants
 * @desc    Get event participants
 * @access  Public
 */
router.get('/:id/participants',
    param('id').isMongoId().withMessage('Invalid event ID'),
    validateInput,
    getEventParticipants
);

module.exports = router;
