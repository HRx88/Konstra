const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Google Auth
router.get('/google', require('passport').authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    require('passport').authenticate('google', { failureRedirect: '/login.html', session: false }),
    AuthController.googleCallback
);

// Protected routes
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, AuthController.updateProfile);

// Administrative routes (protected by middleware, role checked in controller)
router.post('/register-ngo', authMiddleware, AuthController.registerNGO);
router.post('/reset-password', authMiddleware, AuthController.resetUserPassword);
router.get('/users', authMiddleware, AuthController.getAllUsers);

module.exports = router;