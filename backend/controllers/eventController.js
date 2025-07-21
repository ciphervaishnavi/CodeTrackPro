const Event = require('../models/Event');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get all events with filtering and pagination
 * @route   GET /api/events
 * @access  Public
 */
const getEvents = asyncHandler(async (req, res) => {
    const {
        type,
        status,
        platform,
        difficulty,
        page = 1,
        limit = 20,
        sortBy = 'startDate',
        sortOrder = 'asc',
        search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (difficulty) filter.difficulty = difficulty;
    
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await Event.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('organizer', 'name username')
        .lean();

    // Get total count for pagination
    const total = await Event.countDocuments(filter);

    // Add computed fields
    const eventsWithStatus = events.map(event => {
        const now = new Date();
        let computedStatus = 'upcoming';
        
        if (now >= event.startDate && now <= event.endDate) {
            computedStatus = 'ongoing';
        } else if (now > event.endDate) {
            computedStatus = 'completed';
        }

        return {
            ...event,
            computedStatus,
            isRegistrationOpen: event.registrationDeadline ? 
                now < event.registrationDeadline : 
                now < event.startDate,
            participantCount: event.participants.length,
            spotsRemaining: event.maxParticipants ? 
                Math.max(0, event.maxParticipants - event.participants.length) : 
                null
        };
    });

    res.status(200).json({
        status: 'success',
        data: {
            events: eventsWithStatus,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalEvents: total,
                hasNext: skip + parseInt(limit) < total,
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private (Admin)
 */
const createEvent = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        type,
        platform,
        startDate,
        endDate,
        registrationDeadline,
        maxParticipants,
        tags,
        difficulty,
        prizes,
        externalLink
    } = req.body;

    // Set default registration deadline if not provided
    const finalRegistrationDeadline = registrationDeadline || 
        new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000); // 1 day before start

    const event = await Event.create({
        title,
        description,
        type,
        platform,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: new Date(finalRegistrationDeadline),
        maxParticipants,
        tags: tags || [],
        difficulty,
        prizes: prizes || [],
        externalLink,
        organizer: req.user.id,
        status: 'upcoming'
    });

    await event.populate('organizer', 'name username');

    res.status(201).json({
        status: 'success',
        data: {
            event
        }
    });
});

/**
 * @desc    Update an event
 * @route   PUT /api/events/:id
 * @access  Private (Admin)
 */
const updateEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const event = await Event.findById(id);
    
    if (!event) {
        throw new AppError('Event not found', 404);
    }

    // Check if event has already started (restrict updates to ongoing/completed events)
    const now = new Date();
    if (now >= event.startDate && req.body.startDate) {
        throw new AppError('Cannot modify start date of an ongoing or completed event', 400);
    }

    // Validate end date if provided
    if (req.body.endDate) {
        const newEndDate = new Date(req.body.endDate);
        const startDate = new Date(req.body.startDate || event.startDate);
        
        if (newEndDate <= startDate) {
            throw new AppError('End date must be after start date', 400);
        }
    }

    // Update allowed fields
    const allowedUpdates = [
        'title', 'description', 'type', 'platform', 'startDate', 'endDate',
        'registrationDeadline', 'maxParticipants', 'tags', 'difficulty',
        'prizes', 'externalLink', 'status'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    const updatedEvent = await Event.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    ).populate('organizer', 'name username');

    res.status(200).json({
        status: 'success',
        data: {
            event: updatedEvent
        }
    });
});

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Private (Admin)
 */
const deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const event = await Event.findById(id);
    
    if (!event) {
        throw new AppError('Event not found', 404);
    }

    // Check if event has participants
    if (event.participants.length > 0) {
        throw new AppError('Cannot delete event with registered participants', 400);
    }

    await Event.findByIdAndDelete(id);

    res.status(200).json({
        status: 'success',
        message: 'Event deleted successfully'
    });
});

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
const getEventById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const event = await Event.findById(id)
        .populate('organizer', 'name username avatar')
        .populate('participants.user', 'name username avatar')
        .lean();
    
    if (!event) {
        throw new AppError('Event not found', 404);
    }

    // Add computed fields
    const now = new Date();
    let computedStatus = 'upcoming';
    
    if (now >= event.startDate && now <= event.endDate) {
        computedStatus = 'ongoing';
    } else if (now > event.endDate) {
        computedStatus = 'completed';
    }

    const eventWithDetails = {
        ...event,
        computedStatus,
        isRegistrationOpen: event.registrationDeadline ? 
            now < event.registrationDeadline : 
            now < event.startDate,
        participantCount: event.participants.length,
        spotsRemaining: event.maxParticipants ? 
            Math.max(0, event.maxParticipants - event.participants.length) : 
            null,
        timeUntilStart: event.startDate > now ? 
            Math.ceil((event.startDate - now) / (1000 * 60 * 60 * 24)) : 
            null,
        duration: Math.ceil((event.endDate - event.startDate) / (1000 * 60 * 60))
    };

    res.status(200).json({
        status: 'success',
        data: {
            event: eventWithDetails
        }
    });
});

/**
 * @desc    Join an event
 * @route   POST /api/events/:id/join
 * @access  Private
 */
const joinEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    const event = await Event.findById(id);
    
    if (!event) {
        throw new AppError('Event not found', 404);
    }

    // Check if registration is still open
    const now = new Date();
    if (event.registrationDeadline && now > event.registrationDeadline) {
        throw new AppError('Registration deadline has passed', 400);
    }

    if (now >= event.startDate) {
        throw new AppError('Event has already started', 400);
    }

    // Check if user is already registered
    const isAlreadyRegistered = event.participants.some(
        participant => participant.user.toString() === userId
    );

    if (isAlreadyRegistered) {
        throw new AppError('Already registered for this event', 400);
    }

    // Check if event is full
    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
        throw new AppError('Event is full', 400);
    }

    // Add user to participants
    event.participants.push({
        user: userId,
        registrationDate: new Date(),
        status: 'registered'
    });

    await event.save();

    res.status(200).json({
        status: 'success',
        message: 'Successfully registered for the event'
    });
});

/**
 * @desc    Leave an event
 * @route   POST /api/events/:id/leave
 * @access  Private
 */
const leaveEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    const event = await Event.findById(id);
    
    if (!event) {
        throw new AppError('Event not found', 404);
    }

    // Check if event has already started
    const now = new Date();
    if (now >= event.startDate) {
        throw new AppError('Cannot leave an event that has already started', 400);
    }

    // Check if user is registered
    const participantIndex = event.participants.findIndex(
        participant => participant.user.toString() === userId
    );

    if (participantIndex === -1) {
        throw new AppError('Not registered for this event', 400);
    }

    // Remove user from participants
    event.participants.splice(participantIndex, 1);
    await event.save();

    res.status(200).json({
        status: 'success',
        message: 'Successfully left the event'
    });
});

/**
 * @desc    Get upcoming events
 * @route   GET /api/events/upcoming
 * @access  Public
 */
const getUpcomingEvents = asyncHandler(async (req, res) => {
    const { limit = 10, type, difficulty } = req.query;
    
    const now = new Date();
    const filter = {
        startDate: { $gt: now },
        status: { $in: ['upcoming', 'active'] }
    };

    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;

    const events = await Event.find(filter)
        .sort({ startDate: 1 })
        .limit(parseInt(limit))
        .populate('organizer', 'name username')
        .select('-participants')
        .lean();

    // Add computed fields
    const eventsWithDetails = events.map(event => ({
        ...event,
        isRegistrationOpen: event.registrationDeadline ? 
            now < event.registrationDeadline : 
            now < event.startDate,
        timeUntilStart: Math.ceil((event.startDate - now) / (1000 * 60 * 60 * 24)),
        spotsRemaining: event.maxParticipants ? 
            Math.max(0, event.maxParticipants - (event.participants?.length || 0)) : 
            null
    }));

    res.status(200).json({
        status: 'success',
        data: {
            events: eventsWithDetails
        }
    });
});

/**
 * @desc    Get event participants
 * @route   GET /api/events/:id/participants
 * @access  Public
 */
const getEventParticipants = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const event = await Event.findById(id)
        .populate({
            path: 'participants.user',
            select: 'name username avatar cScore rank'
        })
        .lean();
    
    if (!event) {
        throw new AppError('Event not found', 404);
    }

    // Paginate participants
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const participants = event.participants
        .slice(skip, skip + parseInt(limit))
        .map((participant, index) => ({
            ...participant,
            position: skip + index + 1
        }));

    res.status(200).json({
        status: 'success',
        data: {
            participants,
            totalParticipants: event.participants.length,
            eventTitle: event.title,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(event.participants.length / parseInt(limit)),
                hasNext: skip + parseInt(limit) < event.participants.length,
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    joinEvent,
    leaveEvent,
    getUpcomingEvents,
    getEventParticipants
};
