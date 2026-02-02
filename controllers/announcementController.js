const Announcement = require('../models/announcement');

// SSE Clients List (kept in memory for simplicity)
let clients = [];

class AnnouncementController {

    // GET /api/announcements/stream - SSE Endpoint
    static streamAnnouncements(req, res) {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send initial connection message
        const initData = JSON.stringify({ type: 'connected' });
        res.write(`data: ${initData}\n\n`);

        // Add client to list
        const clientId = Date.now();
        const newClient = {
            id: clientId,
            res
        };
        clients.push(newClient);
        console.log(`[SSE] Client connected. Total: ${clients.length}`);

        // Keep-Alive Heartbeat (every 30s) to prevent timeouts
        const keepAlive = setInterval(() => {
            res.write(': keep-alive\n\n');
        }, 30000);

        // Remove client on close
        req.on('close', () => {
            clearInterval(keepAlive);
            console.log(`[SSE] Client ${clientId} disconnected`);
            clients = clients.filter(c => c.id !== clientId);
        });
    }

    // GET /api/announcements
    static async getAnnouncements(req, res) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : null;
            let announcements;

            if (limit) {
                announcements = await Announcement.getLatest(limit);
            } else {
                announcements = await Announcement.getAllActive();
            }

            res.json(announcements);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // POST /api/announcements
    static async createAnnouncement(req, res) {
        try {
            const { title, content, priority, createdBy } = req.body;

            if (!title || !content || !createdBy) {
                return res.status(400).json({ message: 'Title, content, and createdBy are required' });
            }

            const newAnnouncement = await Announcement.create({
                title,
                content,
                priority,
                createdBy
            });

            // Broadcast to all SSE clients
            AnnouncementController.broadcastToClients(newAnnouncement);

            res.status(201).json(newAnnouncement);
        } catch (error) {
            console.error('Error creating announcement:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Helper to broadcast new announcements
    static broadcastToClients(announcement) {
        const eventData = JSON.stringify({ type: 'new_announcement', data: announcement });
        clients.forEach(client => {
            try {
                client.res.write(`data: ${eventData}\n\n`);
            } catch (err) {
                console.error(`[SSE] Error broadcasting to client ${client.id}:`, err);
                // Client will likely be removed by the 'close' event handler, but we can try to clean up if needed
            }
        });
    }
}

module.exports = AnnouncementController;
