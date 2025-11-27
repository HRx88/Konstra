const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, AuthController.updateProfile);

module.exports = router;