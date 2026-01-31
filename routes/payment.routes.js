const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

/**
 * @swagger
 * /api/payment/config:
 *   get:
 *     summary: Get Stripe publishable key
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Stripe configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publishableKey:
 *                   type: string
 *                   example: pk_test_xxxxxxxxxxxx
 */
router.get('/config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

/**
 * @swagger
 * /api/payment/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCheckoutRequest'
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Payment processing error
 */
router.post('/create-checkout-session', PaymentController.createCheckoutSession);

/**
 * @swagger
 * /api/payment/success:
 *   get:
 *     summary: Handle successful payment (Stripe redirect)
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe session ID
 *     responses:
 *       302:
 *         description: Redirects to success page after processing enrollment
 *       400:
 *         description: Invalid session
 */
router.get('/success', PaymentController.handleSuccess);

module.exports = router;