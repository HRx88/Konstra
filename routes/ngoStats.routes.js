const express = require('express');
const router = express.Router();
const NGOStatsController = require('../controllers/ngoStatsController');

// Get all NGOs
router.get('/ngos', NGOStatsController.getNGOs);

// Get stats for an NGO
router.get('/:userId', NGOStatsController.getStats);

// Update stats for an NGO
router.post('/:userId', NGOStatsController.updateStats);

module.exports = router;
