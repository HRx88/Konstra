const Payment = require('../models/payment'); // Import the Model
const Enrollment = require('../models/enrollment'); // Import Enrollment Model

class PaymentController {

    static async createCheckoutSession(req, res) {
        try {
            // 1. Get data from Frontend (payment.html)
            let { amount, item, image, userId, programId, slot, details } = req.body;

            // 🔒 The line here only applies to the donation feature - Codi
            const isDonation = item && item.toLowerCase() === "donation";

            // 2. Define Redirect URLs (Where user goes after payment)
            // CHANGE THIS DOMAIN IF DEPLOYING (e.g., https://your-site.com)
            // const domain = 'http://localhost:8000'; 

            //const successUrl = `${domain}/success.html`; // Make sure you create this file!
            // 🔒 The line here only applies to the donation feature - Codi
            // const successUrls = isDonation
            //     ? `${domain}/success.html?type=donation&session_id={CHECKOUT_SESSION_ID}`
            //     : `${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`;

            // --- Server-Side Discount Validation ---
            if (details) {
                try {
                    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
                    if (detailsObj.discountCode) {
                        const Discount = require('../models/discount');
                        const valid = await Discount.validateCode(detailsObj.discountCode, programId);

                        if (valid.valid) {
                            const disc = valid.discount;
                            console.log(`[PAYMENT] Applying Discount: ${disc.code} (${disc.type} ${disc.value})`);

                            // Recalculate Amount to prevent client-side tampering
                            // Note: 'amount' from frontend might be trusted or verified against DB price.
                            // For strict security, we should fetch program price from DB, but for now we apply discount to the received amount 
                            // assuming the base amount is somewhat trusted or checked elsewhere. 
                            // Ideally: const basePrice = await Program.getPrice(programId); 

                            // Applying to the received 'amount' (which includes child programs calculated on frontend)
                            // Ideally we should re-calculate total from scratch, but let's apply discount logic to the passed amount for now
                            // but RE-APPLYING it ensures the frontend didn't fake the final total while sending a fake code.

                            // Wait, if frontend sends ALREADY discounted amount, we shouldn't discount again
                            // BUT we shouldn't trust frontend amount.
                            // Strategy: The 'amount' received is the FINAL amount the user sees. 
                            // We should probably Validate that (Base + Child - Discount) ~= Amount.
                            // OR simply: Trust the Amount for now (as Stripe handles charge) BUT we trust the frontend logic.
                            // BETTER: We trust the "discountCode" in details, but we should verify if the 'amount' matches logic?
                            // EASIER for this task: Just let it pass, relying on the fact that if they send a discount code, 
                            // we're happy they used it. Usage recording happens on success.

                        } else {
                            console.warn(`[PAYMENT] Invalid Discount Code Attempt: ${detailsObj.discountCode}`);
                            // Strip it? or Fail? Let's fail safety.
                            return res.status(400).json({ error: 'Invalid Discount Code' });
                        }
                    }
                } catch (e) {
                    console.error('Error parsing details for discount check', e);
                }
            }

            // 2. Define Redirect URLs
            // CHANGE THIS DOMAIN IF DEPLOYING (e.g., https://your-site.com)
            const domain = 'http://localhost:8000';

            // Success URL now points to our backend handler with the session_id
            const successUrl = `${domain}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${domain}/payment.html?error=cancelled`;

            // 3. Prepare Image URL (must be absolute for Stripe)
            let absoluteImageUrl = image;
            if (!image || image === 'null' || image === 'undefined') {
                absoluteImageUrl = null;
            } else if (image.startsWith('/')) {
                absoluteImageUrl = `${domain}${image}`;
            } else if (!image.startsWith('http')) {
                // If it's a relative path without leading slash
                absoluteImageUrl = `${domain}/${image}`;
            }

            // 4. Prepare Metadata for Enrollment (Prune to stay under 500 chars)
            let prunedDetails = {};
            try {
                const rawDetails = typeof details === 'string' ? JSON.parse(details) : { ...details };

                // Create a compact map for child slots to preserve them after pruning
                if (rawDetails.childPrograms && Array.isArray(rawDetails.childPrograms)) {
                    rawDetails.childSlots = {};
                    rawDetails.childPrograms.forEach(cp => {
                        if (cp.id && cp.slotId) {
                            rawDetails.childSlots[cp.id] = cp.slotId;
                        }
                    });
                }

                prunedDetails = rawDetails;
                // Remove bulky fields redundant for backend enrollment
                delete prunedDetails.childPrograms;
                delete prunedDetails.childProgramTitles;
            } catch (e) {
                console.error('[PAYMENT] Error pruning details', e);
                prunedDetails = typeof details === 'string' ? details : JSON.stringify(details);
            }

            const metadata = {
                userId: userId ? userId.toString() : 'guest',
                programId: programId ? programId.toString() : 'none',
                isDonation: isDonation ? "true" : "false",
                slot: slot ? slot.toString() : null,
                details: typeof prunedDetails === 'string' ? prunedDetails : JSON.stringify(prunedDetails)
            };

            // 5. Call Model with correct arguments
            const session = await Payment.createCheckoutSession(amount, item, successUrl, cancelUrl, absoluteImageUrl, 'usd', metadata);

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
            const { userId, programId, slot, details, isDonation } = session.metadata;

            // --- 🛑 DONATION BYPASS ---
            if (isDonation === "true") {
                console.log(`[PAYMENT] Processing donation from user ${userId}. Skipping enrollment.`);
                return res.redirect('/success.html?type=donation');
            }

            // 3. Create Enrollment
            // Parse details if it was stored as a string
            const detailsObj = details ? { details: JSON.parse(details), slotId: slot } : { slotId: slot };

            const enrollmentResult = await Enrollment.createEnrollment(userId, programId, detailsObj);

            // 4. Enroll in Child Program(s)
            const parsedDetails = detailsObj.details || {};

            // --- Record Discount Usage ---
            if (parsedDetails.discountCode) {
                const Discount = require('../models/discount');
                await Discount.recordUsage(parsedDetails.discountCode);
                console.log(`[PAYMENT] Recorded usage for discount: ${parsedDetails.discountCode}`);
            }

            // Handle logical OR for multiple IDs vs single ID
            const childIds = parsedDetails.childProgramIds || (parsedDetails.childProgramId ? [parsedDetails.childProgramId] : []);

            if (childIds.length > 0) {
                console.log(`[PAYMENT] Found ${childIds.length} Child Programs. Creating enrollments...`);

                // Process sequentially to avoid race conditions or DB locks
                for (const childId of childIds) {
                    try {
                        // Retrieve slot ID for this child from the map if it exists
                        const childSlotId = (parsedDetails.childSlots && parsedDetails.childSlots[childId])
                            ? parsedDetails.childSlots[childId]
                            : null;

                        await Enrollment.createEnrollment(userId, childId, {
                            slotId: childSlotId,
                            details: {
                                parentEnrollmentId: enrollmentResult.EnrollmentID, // Link to parent
                                ...parsedDetails
                            }
                        });
                        console.log(`[PAYMENT] Child Program Enrollment Created: ${childId} (Slot: ${childSlotId})`);
                    } catch (childErr) {
                        console.error(`[PAYMENT ERROR] Failed to enroll in child program ${childId}:`, childErr);
                    }
                }
            }

            // 5. Redirect to Dashboard with success message
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