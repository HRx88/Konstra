const express = require('express');
const router = express.Router();
const AnnouncementController = require('../controllers/announcementController');

/**
 * @swagger
 * /api/announcements/stream:
 *   get:
 *     summary: SSE stream for real-time announcements
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/stream', AnnouncementController.streamAnnouncements);

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all active announcements
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: List of announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 announcements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Announcement'
 */
router.get('/', AnnouncementController.getAnnouncements);

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     summary: Create a new announcement (Admin only)
 *     tags: [Announcements, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: New Course Available!
 *               content:
 *                 type: string
 *                 example: Check out our new web development course.
 *               type:
 *                 type: string
 *                 enum: [info, warning, success]
 *                 example: info
 *     responses:
 *       201:
 *         description: Announcement created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 announcement:
 *                   $ref: '#/components/schemas/Announcement'
 *       403:
 *         description: Admin access required
 */
router.post('/', AnnouncementController.createAnnouncement);

module.exports = router;
