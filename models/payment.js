const sql = require('mssql');
const dbConfig = require('../dbConfig');
const Stripe = require('stripe');
// Ensure STRIPE_SECRET_KEY is in your .env file
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

class Payment {

    // 1. Create Stripe Checkout Session
    static async createCheckoutSession(amount, itemName, successUrl, cancelUrl, imageUrl = null, currency = 'usd', metadata = {}) {
        try {
            // Prepare product data
            const productData = {
                name: itemName,
            };

            // Only add images if we have one
            if (imageUrl) {
                productData.images = [imageUrl];
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency,
                            product_data: productData, // Use the object we created above
                            unit_amount: Math.round(amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl, // This should now be the backend handler URL with session_id
                cancel_url: cancelUrl,
                metadata: metadata, // Pass metadata to Stripe
            });
            return session;
        } catch (error) {
            throw error;
        }
    }

    // New: Retrieve Session for Verification
    static async retrieveSession(sessionId) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return session;
        } catch (error) {
            throw error;
        }
    }

    // 2. Log Payment Attempt to Database
    static async logPaymentAttempt(stripeId, amount, currency) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            // Ensure you have a 'Payments' table or remove this method if not tracking locally
            await pool.request()
                .input('stripeId', sql.NVarChar, stripeId)
                .input('amount', sql.Decimal(10, 2), amount)
                .input('currency', sql.NVarChar, currency)
                .query(`
                    IF EXISTS (SELECT * FROM sysobjects WHERE name='Payments' AND xtype='U')
                    BEGIN
                        INSERT INTO Payments (StripePaymentID, Amount, Currency, Status)
                        VALUES (@stripeId, @amount, @currency, 'Pending')
                    END
                `);
        } catch (err) {
            console.error('SQL Payment Log Warning:', err.message);
            // Non-blocking error, we continue even if logging fails
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = Payment;