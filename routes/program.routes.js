const express = require('express');
const router = express.Router();
const ProgramController = require('../controllers/programController');

router.get('/', ProgramController.getAll);
router.get('/:id', ProgramController.getOne);     // ADDED: Get Single Program
router.get('/:id/slots', ProgramController.getSlots); // ADDED: Get Slots for Program
router.post('/:id/slots', ProgramController.createSlot); // ADDED: Create Slot
router.delete('/slots/:slotId', ProgramController.deleteSlot); // ADDED: Delete Slot
router.post('/create', ProgramController.create); // Admin only
router.put('/:id', ProgramController.update);     // Admin only
router.delete('/:id', ProgramController.delete);  // Admin only

module.exports = router;