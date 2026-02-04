const Enrollment = require('../models/enrollment');
const ProgramModule = require('../models/programModule');

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
            const { userId, programId, details, slotId } = req.body;
            const result = await Enrollment.createEnrollment(userId, programId, { details, slotId });

            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(201).json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Get Enrollments for a specific user
    static async getUserEnrollments(req, res) {
        try {
            const userId = req.params.userId;
            const enrollments = await Enrollment.getEnrollmentsByUserId(userId);
            res.json(enrollments);
        } catch (err) {
            console.error('Get User Enrollments Error:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // Get progress for an enrollment
    static async getProgress(req, res) {
        try {
            const enrollmentId = parseInt(req.params.id);
            if (isNaN(enrollmentId)) {
                return res.status(400).json({ success: false, message: 'Invalid Enrollment ID' });
            }

            const progress = await ProgramModule.getUserProgress(enrollmentId);
            res.json(progress || []);
        } catch (err) {
            console.error('Get Progress Error:', err);
            res.status(500).json({ success: false, message: 'Server error fetching progress' });
        }
    }
}

module.exports = EnrollmentController;
