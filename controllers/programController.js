const Program = require('../models/program');

class ProgramController {

    // 1. Get all active programs (Top-level only by default unless query param specifies otherwise)
    static async getAll(req, res) {
        try {
            const programs = await Program.getAllPrograms();

            // If ?hierarchy=true, nesting is handled by frontend or separate call. 
            // For now, getAllPrograms fetches everything. 
            // We might want to filter out children in the main list or categorize them.
            // Let's filter to only return Parents (ParentProgramID IS NULL) for the main catalog 
            // if specifically requested, or let frontend filtering handle it.
            // For backward compatibility, we return all. 

            res.status(200).json(programs);
        } catch (error) {
            console.error('Controller Error - getAll:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 1a. Get Child Programs
    static async getChildren(req, res) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid Program ID' });
        try {
            const children = await Program.getChildPrograms(id);
            res.status(200).json(children); // Return raw data directly
        } catch (error) {
            console.error('Controller Error - getChildren:', error);
            res.status(500).json({ error: 'Failed to fetch child programs' });
        }
    }

    static async getSlots(req, res) {
        const programId = parseInt(req.params.id);
        if (isNaN(programId)) {
            return res.status(400).json({ error: 'Invalid Program ID' });
        }

        try {
            const slots = await Program.getSlotsByProgramId(programId);
            res.status(200).json(slots);
        } catch (error) {
            console.error('Controller Error - getSlots:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 1b. Create Slot
    static async createSlot(req, res) {
        const programId = parseInt(req.params.id);
        const { startTime, endTime, capacity, meetingURL } = req.body;

        if (isNaN(programId) || !startTime || !endTime || !capacity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            const slotId = await Program.createSlot(programId, { startTime, endTime, capacity, meetingURL });
            res.status(201).json({ message: 'Slot created', slotId });
        } catch (error) {
            console.error('Controller Error - createSlot:', error);
            res.status(500).json({ error: 'Failed to create slot' });
        }
    }

    // 1c. Update Slot
    static async updateSlot(req, res) {
        const slotId = parseInt(req.params.slotId);
        const { startTime, endTime, capacity, meetingURL } = req.body;

        if (isNaN(slotId) || !startTime || !endTime || !capacity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            const success = await Program.updateSlot(slotId, { startTime, endTime, capacity, meetingURL });
            if (success) {
                res.status(200).json({ message: 'Slot updated successfully' });
            } else {
                res.status(400).json({ error: 'Failed to update slot or slot not found' });
            }
        } catch (error) {
            console.error('Controller Error - updateSlot:', error);
            res.status(500).json({ error: 'Failed to update slot' });
        }
    }

    // 1d. Delete Slot
    static async deleteSlot(req, res) {
        const slotId = parseInt(req.params.slotId);
        if (isNaN(slotId)) return res.status(400).json({ error: 'Invalid Slot ID' });

        try {
            const success = await Program.deleteSlot(slotId);
            if (success) res.status(200).json({ message: 'Slot deleted' });
            else res.status(400).json({ error: 'Could not delete slot' });
        } catch (error) {
            console.error('Controller Error - deleteSlot:', error);
            res.status(500).json({ error: 'Failed to delete slot' });
        }
    }

    // 2. Get a single program by ID
    static async getOne(req, res) {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid Program ID' });
        }

        try {
            const program = await Program.getProgramById(id);
            if (!program) {
                return res.status(404).json({ error: 'Program not found' });
            }
            res.status(200).json(program);
        } catch (error) {
            console.error('Controller Error - getOne:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 3. Create a new program
    static async create(req, res) {
        try {
            const data = req.body;

            // Basic validation
            if (!data.title || !data.type || !data.price || !data.duration || !data.maxParticipants) {
                return res.status(400).json({ error: 'Missing required fields (title, type, price, duration, maxParticipants)' });
            }

            const newProgramId = await Program.createProgram(data);
            res.status(201).json({ message: 'Program created successfully', programId: newProgramId });
        } catch (error) {
            console.error('Controller Error - create:', error);
            res.status(500).json({ error: 'Failed to create program' });
        }
    }

    // 4. Update an existing program
    static async update(req, res) {
        const id = parseInt(req.params.id);
        const data = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid Program ID' });
        }

        try {
            // Optional: Check if program exists first
            const existingProgram = await Program.getProgramById(id);
            if (!existingProgram) {
                return res.status(404).json({ error: 'Program not found' });
            }

            await Program.updateProgram(id, data);
            res.status(200).json({ message: 'Program updated successfully' });
        } catch (error) {
            console.error('Controller Error - update:', error);
            res.status(500).json({ error: 'Failed to update program' });
        }
    }

    // 5. Delete (Soft Delete) a program
    static async delete(req, res) {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid Program ID' });
        }

        try {
            const existingProgram = await Program.getProgramById(id);
            if (!existingProgram) {
                return res.status(404).json({ error: 'Program not found' });
            }

            await Program.deleteProgram(id);
            res.status(200).json({ message: 'Program deleted successfully' });
        } catch (error) {
            console.error('Controller Error - delete:', error);
            res.status(500).json({ error: 'Failed to delete program' });
        }
    }
}

module.exports = ProgramController;