const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

// Serve Publishable Key to Frontend
router.get('/config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Create Checkout Session
router.post('/create-checkout-session', PaymentController.createCheckoutSession);

module.exports = router;