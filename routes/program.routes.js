const express = require('express');
const router = express.Router();
const ProgramController = require('../controllers/programController');

router.get('/', ProgramController.getAll);
router.get('/:id', ProgramController.getOne);     // ADDED: Get Single Program
router.post('/create', ProgramController.create); // Admin only
router.put('/:id', ProgramController.update);     // Admin only
router.delete('/:id', ProgramController.delete);  // Admin only

module.exports = router;