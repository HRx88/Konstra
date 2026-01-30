const Discount = require('../models/discount');

class DiscountController {

    // Public: Validate a code
    static async validate(req, res) {
        try {
            const { code, programId } = req.body;

            if (!code) {
                return res.status(400).json({ valid: false, message: 'Code is required' });
            }

            const result = await Discount.validateCode(code, programId);
            res.json(result);

        } catch (error) {
            console.error('Validate Discount Error:', error);
            res.status(500).json({ valid: false, message: 'Server error validating code' });
        }
    }

    // Admin: Get All
    static async getAll(req, res) {
        try {
            // Ensure Admin (handled by middleware usually, but double check)
            if (req.user.userType !== 'Admin') {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            const discounts = await Discount.getAll();
            res.json({ success: true, discounts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Admin: Create
    static async create(req, res) {
        try {
            if (req.user.userType !== 'Admin') {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            const { code, type, value, maxUses, expiry, programId } = req.body;

            if (!code || !type || !value) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            await Discount.create({
                code, type, value, maxUses, expiry, programId,
                createdBy: req.user.username
            });

            res.json({ success: true, message: 'Discount created successfully' });

        } catch (error) {
            if (error.code === 'EREQUEST' && error.message.includes('UNIQUE KEY')) {
                return res.status(400).json({ success: false, message: 'Code already exists' });
            }
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Admin: Delete
    static async delete(req, res) {
        try {
            if (req.user.userType !== 'Admin') {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            const { id } = req.params;
            await Discount.delete(id);
            res.json({ success: true, message: 'Discount deleted' });

        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // User: Get my discount codes
    static async getMyDiscounts(req, res) {
        try {
            const userId = req.user.userId;
            const discounts = await Discount.getByUserId(userId);
            res.json({ success: true, discounts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Admin: Email discount to all users
    static async emailToUsers(req, res) {
        try {
            const { subject, body, discountCode } = req.body;
            const EmailService = require('../utils/emailService');
            const User = require('../models/user');

            // Fetch all users - filter to only User role (not Admins)
            const allUsers = await User.getAllUsers();
            const users = allUsers.filter(u => u.UserType === 'User' && u.Role === 'User');
            let successCount = 0;

            // Send email to each user (batch in production)
            for (const user of users) {
                if (user.Email) {
                    try {
                        await EmailService.sendCustomEmail(user.Email, subject, body);
                        successCount++;
                    } catch (emailErr) {
                        console.error(`Failed to send to ${user.Email}:`, emailErr.message);
                    }
                }
            }

            res.json({ success: true, count: successCount, message: `Emailed ${successCount} users` });
        } catch (error) {
            console.error('Email to users error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Public: Get all global (non-user-specific) active discount codes
    static async getPublicCodes(req, res) {
        try {
            const discounts = await Discount.getPublicCodes();
            res.json({ success: true, discounts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = DiscountController;
