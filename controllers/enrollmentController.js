const Enrollment = require('../models/enrollment');

class EnrollmentController {

    static async getMyEnrollments(req, res) {
        try {
            const userId = req.query.userID;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'User ID is required' });
            }

            const enrollments = await Enrollment.getEnrollmentsByUserId(userId);
            res.json(enrollments);
        } catch (error) {
            console.error('Controller Error:', error);
            res.status(500).json({ success: false, message: 'Server error fetching enrollments' });
        }
    }

    static async createEnrollment(req, res) {
        try {
            const { userId, programId, slot, details } = req.body;
            if (!userId || !programId) {
                return res.status(400).json({ success: false, message: 'User ID and Program ID are required' });
            }

            const result = await Enrollment.createEnrollment(userId, programId, { slot, details });
            if (result.success) {
                res.json({ success: true, message: 'Enrollment successful' });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Controller Create Error:', error);
            res.status(500).json({ success: false, message: 'Server error creating enrollment' });
        }
    }
}

module.exports = EnrollmentController;
