const express = require('express');
const router = express.Router();
const ProgramController = require('../controllers/programController');

// Child programs
router.get('/:id/children', ProgramController.getChildren);

// Standard CRUD
router.get('/', ProgramController.getAll);
router.post('/', ProgramController.create); // Standard REST Create
router.get('/:id', ProgramController.getOne);
router.get('/:id/slots', ProgramController.getSlots);
router.post('/:id/slots', ProgramController.createSlot);
router.delete('/slots/:slotId', ProgramController.deleteSlot);
router.post('/create', ProgramController.create); // Keep alias if needed
router.put('/:id', ProgramController.update);
router.delete('/:id', ProgramController.delete);

module.exports = router;