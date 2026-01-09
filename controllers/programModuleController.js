const ProgramModule = require('../models/programModule');

class ProgramModuleController {

    // Get all modules for a program
    static async getModules(req, res) {
        try {
            const programId = req.params.programId;
            const modules = await ProgramModule.getModulesByProgramId(programId);
            res.json(modules);
        } catch (error) {
            console.error('Get Modules Error:', error);
            res.status(500).json({ success: false, message: 'Server error fetching modules' });
        }
    }

    // Get user progress for an enrollment
    static async getUserProgress(req, res) {
        try {
            const enrollmentId = req.params.enrollmentId;
            const progress = await ProgramModule.getUserProgress(enrollmentId);
            res.json(progress);
        } catch (error) {
            console.error('Get User Progress Error:', error);
            res.status(500).json({ success: false, message: 'Server error fetching progress' });
        }
    }

    // Mark a module as complete
    static async completeModule(req, res) {
        try {
            const enrollmentId = req.params.enrollmentId;
            const moduleId = req.params.moduleId;

            const result = await ProgramModule.markModuleComplete(enrollmentId, moduleId);

            if (result.success) {
                res.json({ success: true, message: 'Module completed successfully' });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Complete Module Error:', error);
            res.status(500).json({ success: false, message: 'Server error completing module' });
        }
    }

    // Store active SSE clients
    static clients = [];

    // SSE Endpoint for real-time updates
    static async sseEvents(req, res) {
        const programId = req.params.programId;

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Initial connection message
        res.write('data: {"type":"connected"}\n\n');

        // Add client to list
        const client = {
            id: Date.now(),
            programId,
            res
        };
        ProgramModuleController.clients.push(client);

        // Handle client disconnect
        req.on('close', () => {
            ProgramModuleController.clients = ProgramModuleController.clients.filter(c => c.id !== client.id);
        });
    }

    // Helper to notify clients of updates
    static notifyClients(programId) {
        ProgramModuleController.clients.forEach(client => {
            // Use loose equality (==) to handle string/number comparison
            // req.params.programId is string, db ProgramID is int
            if (client.programId == programId) {
                client.res.write(`data: ${JSON.stringify({ type: 'moduleUpdate', programId })}\n\n`);
            }
        });
    }

    // Admin: Create a new module
    static async createModule(req, res) {
        try {
            const programId = req.params.programId;
            const data = req.body;

            const result = await ProgramModule.createModule(programId, data);

            if (result.success) {
                // Notify clients about the change
                ProgramModuleController.notifyClients(programId);
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Create Module Error:', error);
            res.status(500).json({ success: false, message: 'Server error creating module' });
        }
    }

    // Admin: Update a module
    static async updateModule(req, res) {
        try {
            const moduleId = req.params.moduleId;
            const data = req.body;

            const result = await ProgramModule.updateModule(moduleId, data);

            if (result.success) {
                // Notify clients using the updated module data returned from model
                if (result.module && result.module.ProgramID) {
                    ProgramModuleController.notifyClients(result.module.ProgramID);
                }
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Update Module Error:', error);
            res.status(500).json({ success: false, message: 'Server error updating module' });
        }
    }

    // Admin: Delete a module
    static async deleteModule(req, res) {
        try {
            const moduleId = req.params.moduleId;

            // Get module details before deletion to know which program to notify
            const moduleToDelete = await ProgramModule.getModuleById(moduleId);

            const result = await ProgramModule.deleteModule(moduleId);

            if (result.success) {
                if (moduleToDelete && moduleToDelete.ProgramID) {
                    ProgramModuleController.notifyClients(moduleToDelete.ProgramID);
                }
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Delete Module Error:', error);
            res.status(500).json({ success: false, message: 'Server error deleting module' });
        }
    }
}

module.exports = ProgramModuleController;
