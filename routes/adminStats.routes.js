const express = require('express');
const router = express.Router();
const AdminStatsController = require('../controllers/adminStatsController');

/**
 * @swagger
 * /api/admin/stats/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', AdminStatsController.getDashboardStats);

module.exports = router;
