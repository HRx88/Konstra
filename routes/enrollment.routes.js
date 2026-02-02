const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/enrollmentController');

/**
 * @swagger
 * /api/enrollments/my-enrollments:
 *   get:
 *     summary: Get current user's enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 */
router.get('/my-enrollments', EnrollmentController.getMyEnrollments);

/**
 * @swagger
 * /api/enrollments/create:
 *   post:
 *     summary: Create a new enrollment
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *               - userId
 *             properties:
 *               programId:
 *                 type: integer
 *                 example: 1
 *               userId:
 *                 type: integer
 *                 example: 1
 *               slotId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 enrollment:
 *                   $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Invalid input or already enrolled
 *       401:
 *         description: Unauthorized
 */
router.post('/create', EnrollmentController.createEnrollment);

/**
 * @swagger
 * /api/enrollments/user/{userId}:
 *   get:
 *     summary: Get enrollments for a specific user
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user's enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 */
router.get('/user/:userId', EnrollmentController.getUserEnrollments);

/**
 * @swagger
 * /api/enrollments/{id}/progress:
 *   get:
 *     summary: Get progress for an enrollment
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment progress data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   type: number
 *                   format: float
 *                   example: 45.5
 *                 completedModules:
 *                   type: integer
 *                   example: 5
 *                 totalModules:
 *                   type: integer
 *                   example: 11
 *       404:
 *         description: Enrollment not found
 */
router.get('/:id/progress', EnrollmentController.getProgress);

module.exports = router;
