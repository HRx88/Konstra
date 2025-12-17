const Program = require('../models/program');

class ProgramController {

   // Create Checkout Session
    static async createCheckoutSession(req, res) {
        try {
            const { amount, item, currency = 'usd' } = req.body;

            // Determine base URL dynamically (works for localhost and production)
            const origin = req.headers.origin || 'http://localhost:8000';
            
            // Stripe requires absolute URLs
            // {CHECKOUT_SESSION_ID} is a template string that Stripe replaces automatically
            const successUrl = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${origin}/printadobe.html`;

            const session = await Payment.createCheckoutSession(
                amount, 
                item, 
                successUrl, 
                cancelUrl, 
                currency
            );

            res.status(200).json({
                sessionId: session.id
            });

        } catch (error) {
            console.error('[STRIPE CHECKOUT ERROR]:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ProgramController;