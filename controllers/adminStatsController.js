const AdminStats = require('../models/adminStats');

class AdminStatsController {

    // GET /api/admin/stats/dashboard
    static async getDashboardStats(req, res) {
        try {
            const stats = await AdminStats.getDashboardStats();
            res.json(stats);
        } catch (err) {
            console.error('Controller Error fetching admin stats:', err);
            res.status(500).json({ message: 'Error fetching admin stats' });
        }
    }
}

module.exports = AdminStatsController;
