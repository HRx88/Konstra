const express = require('express');
const router = express.Router();
const AdminStatsController = require('../controllers/adminStatsController');

// GET /api/admin/stats/dashboard
router.get('/dashboard', AdminStatsController.getDashboardStats);

module.exports = router;
