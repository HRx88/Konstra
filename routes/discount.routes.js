const express = require('express');
const router = express.Router();
const DiscountController = require('../controllers/discountController');
const authenticateToken = require('../middleware/authMiddleware'); // Assuming this exists or similar

// Public
router.post('/validate', DiscountController.validate);
router.get('/public', DiscountController.getPublicCodes); // For user dashboard

// User (Protected)
router.get('/my', authenticateToken, DiscountController.getMyDiscounts);

// Admin (Protected)
// Note: authenticateToken should add req.user
router.get('/', authenticateToken, DiscountController.getAll);
router.post('/', authenticateToken, DiscountController.create);
router.post('/email', authenticateToken, DiscountController.emailToUsers); // Email to all users
router.delete('/:id', authenticateToken, DiscountController.delete);

module.exports = router;
