// ========== Packages ==========
const express = require('express');
const router = express.Router();

// ========== Controllers ==========
const MeetingController = require('../controllers/meetingController');

// ========== API Routes ==========

/**
 * @swagger
 * /api/meetings/create:
 *   post:
 *     summary: Create a new meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userID
 *               - userType
 *               - meetingType
 *             properties:
 *               userID:
 *                 type: integer
 *                 example: 1
 *               userType:
 *                 type: string
 *                 example: User
 *               meetingType:
 *                 type: string
 *                 example: Consultation
 *               meetingLink:
 *                 type: string
 *                 example: https://calendly.com/xxx
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-01T10:00:00Z"
 *     responses:
 *       201:
 *         description: Meeting created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 meeting:
 *                   $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/create", MeetingController.createMeeting);

/**
 * @swagger
 * /api/meetings/user/{userID}/{userType}:
 *   get:
 *     summary: Get meetings for a user
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [User, Admin, NGO]
 *         description: User type
 *     responses:
 *       200:
 *         description: List of meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 meetings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Meeting'
 */
router.get("/user/:userID/:userType", MeetingController.getUserMeetings);

/**
 * @swagger
 * /api/meetings/join/{meetingID}:
 *   get:
 *     summary: Get meeting join link
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: meetingID
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting join details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 meetingLink:
 *                   type: string
 *       404:
 *         description: Meeting not found
 */
router.get("/join/:meetingID", MeetingController.joinMeeting);

// ========== Export ==========
module.exports = router;