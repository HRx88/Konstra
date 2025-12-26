const NGOStats = require('../models/ngoStats');
const User = require('../models/user');

class NGOStatsController {
    // 1. Get all NGOs for dropdown
    static async getNGOs(req, res) {
        try {
            const ngos = await User.getAllByRole('NGO');
            res.status(200).json(ngos);
        } catch (error) {
            console.error('Controller Error - getNGOs:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 2. Get stats for a selected NGO
    static async getStats(req, res) {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        try {
            const stats = await NGOStats.getStatsByUserId(userId);
            res.status(200).json(stats || {});
        } catch (error) {
            console.error('Controller Error - getStats:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 3. Update stats
    static async updateStats(req, res) {
        const userId = parseInt(req.params.userId);
        const data = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        try {
            await NGOStats.updateStats(userId, data);
            res.status(200).json({ message: 'NGO stats updated successfully' });
        } catch (error) {
            console.error('Controller Error - updateStats:', error);
            res.status(500).json({ error: 'Failed to update NGO stats' });
        }
    }
}

module.exports = NGOStatsController;
