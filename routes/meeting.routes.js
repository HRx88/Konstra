// ========== Packages ==========
const express = require('express');
const router = express.Router();

// ========== Controllers ==========
const MeetingController = require('../controllers/meetingController');

// ========== API Routes ==========

// Create a new Meeting (triggered after Calendly selection)
router.post("/create", MeetingController.createMeeting);

// Get meetings (Logic inside controller decides if it returns ALL or specific User's)
router.get("/user/:userID/:userType", MeetingController.getUserMeetings);

// NEW: Join Meeting (Get Link)
router.get("/join/:meetingID", MeetingController.joinMeeting);

// ========== Export ==========
module.exports = router;