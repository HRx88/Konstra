const express = require('express');
const router = express.Router();
const AnnouncementController = require('../controllers/announcementController');

// GET /api/announcements/stream - SSE Endpoint
router.get('/stream', AnnouncementController.streamAnnouncements);

// GET /api/announcements - Get all/latest active announcements
router.get('/', AnnouncementController.getAnnouncements);

// POST /api/announcements - Create new announcement (Admin only)
router.post('/', AnnouncementController.createAnnouncement);

module.exports = router;
