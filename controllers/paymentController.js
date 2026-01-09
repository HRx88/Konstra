const Payment = require('../models/payment'); // Import the Model
const Enrollment = require('../models/enrollment'); // Import Enrollment Model

class PaymentController {

    static async createCheckoutSession(req, res) {
        try {
            // 1. Get data from Frontend (payment.html)
            const { amount, item, image, userId, programId, slot, details } = req.body;

            // 2. Define Redirect URLs
            // CHANGE THIS DOMAIN IF DEPLOYING (e.g., https://your-site.com)
            const domain = 'http://localhost:8000';

            // Success URL now points to our backend handler with the session_id
            const successUrl = `${domain}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${domain}/payment.html?error=cancelled`;

            // 3. Prepare Metadata for Enrollment
            const metadata = {
                userId: userId.toString(),
                programId: programId.toString(),
                slot: slot ? slot.toString() : null,
                details: details // Assuming details is a JSON string or stringifiable
            };

            // 4. Call Model with correct arguments
            const session = await Payment.createCheckoutSession(amount, item, successUrl, cancelUrl, image, 'usd', metadata);

            // 5. Return Session ID to frontend (NOT clientSecret)
            res.status(200).json({
                sessionId: session.id,
            });

        } catch (error) {
            console.error('[STRIPE ERROR]:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // New: Handle Success Redirect
    static async handleSuccess(req, res) {
        try {
            const session_id = req.query.session_id;

            if (!session_id) {
                return res.redirect('/payment.html?error=no_session');
            }

            // 1. Verify Session with Stripe
            const session = await Payment.retrieveSession(session_id);
            if (session.payment_status !== 'paid') {
                return res.redirect('/payment.html?error=payment_not_paid');
            }

            // 2. Extract Metadata
            const { userId, programId, slot, details } = session.metadata;

            // 3. Create Enrollment
            // Parse details if it was stored as a string
            const detailsObj = details ? { details: JSON.parse(details), slotId: slot } : { slotId: slot };

            const enrollmentResult = await Enrollment.createEnrollment(userId, programId, detailsObj);

            // 4. Redirect to Dashboard with success message
            // We can append a flag to show a success modal
            return res.redirect('/user-dashboard.html?payment=success');

        } catch (error) {
            console.error('[PAYMENT SUCCESS ERROR]:', error);
            // On error, still redirect but maybe with an error flag
            return res.redirect('/user-dashboard.html?payment=error');
        }
    }
}

module.exports = PaymentController;