const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, optionalAuth } = require('../middleware/auth');
const { 
    validateProfileUpdate,
    validatePlatformAccount,
    validateObjectId 
} = require('../middleware/validation');
const {
    getProfile,
    updateProfile,
    uploadProfilePicture,
    deleteProfile,
    addPlatformAccount,
    updatePlatformAccount,
    removePlatformAccount,
    getUserProfiles,
    getPublicProfile
} = require('../controllers/profileController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/profiles/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// Public routes
router.get('/users', getUserProfiles); // Get all public profiles
router.get('/public/:username', getPublicProfile); // Get specific public profile

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.route('/')
    .get(getProfile)
    .put(validateProfileUpdate, updateProfile)
    .delete(deleteProfile);

router.post('/upload-picture', upload.single('profilePicture'), uploadProfilePicture);

// Platform account routes
router.post('/platforms', validatePlatformAccount, addPlatformAccount);
router.put('/platforms/:platformId', validateObjectId('platformId'), updatePlatformAccount);
router.delete('/platforms/:platformId', validateObjectId('platformId'), removePlatformAccount);

module.exports = router;
