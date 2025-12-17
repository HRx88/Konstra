const Payment = require('../models/payment'); // Import the Model

class PaymentController {
    
    static async createCheckoutSession(req, res) {
        try {
            // 1. Get data from Frontend (payment.html)
            const { amount, item, image } = req.body;

            // 2. Define Redirect URLs (Where user goes after payment)
            // CHANGE THIS DOMAIN IF DEPLOYING (e.g., https://your-site.com)
            const domain = 'http://localhost:8000'; 
            const successUrl = `${domain}/success.html`; // Make sure you create this file!
            const cancelUrl = `${domain}/payment.html?error=cancelled`;

            // 3. Call Model with correct arguments
            const session = await Payment.createCheckoutSession(amount, item, successUrl, cancelUrl, image);

            // 4. Return Session ID to frontend (NOT clientSecret)
            res.status(200).json({
                sessionId: session.id, 
            });

        } catch (error) {
            console.error('[STRIPE ERROR]:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PaymentController;