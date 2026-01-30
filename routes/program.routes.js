const express = require('express');
const router = express.Router();
const ProgramController = require('../controllers/programController');

// Standard CRUD - List all
router.get('/', ProgramController.getAll);

// Specific routes MUST come before generic /:id route
router.get('/:id/children', ProgramController.getChildren);
router.get('/:id/slots', ProgramController.getSlots);
router.post('/:id/slots', ProgramController.createSlot);

// Generic /:id routes (must come after specific routes)
router.get('/:id', ProgramController.getOne);
router.put('/:id', ProgramController.update);
router.delete('/:id', ProgramController.delete);

// Other routes
router.post('/', ProgramController.create); // Standard REST Create
router.post('/create', ProgramController.create); // Keep alias if needed
router.put('/slots/:slotId', ProgramController.updateSlot); // Update Slot
router.delete('/slots/:slotId', ProgramController.deleteSlot);

module.exports = router;