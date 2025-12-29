const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/enrollmentController');

router.get('/my-enrollments', EnrollmentController.getMyEnrollments);
router.post('/create', EnrollmentController.createEnrollment);

module.exports = router;
