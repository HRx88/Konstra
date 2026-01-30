const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/enrollmentController');

router.get('/my-enrollments', EnrollmentController.getMyEnrollments);
router.post('/create', EnrollmentController.createEnrollment);
router.get('/user/:userId', EnrollmentController.getUserEnrollments);
router.get('/:id/progress', EnrollmentController.getProgress);

module.exports = router;
