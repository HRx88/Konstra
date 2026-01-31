const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ProgramController = require('../controllers/programController');

// ========== Multer Configuration for Program Images ==========
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/programs'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'program-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpg, png, gif, webp)'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: fileFilter
});

/**
 * @swagger
 * /api/programs/upload-image:
 *   post:
 *     summary: Upload a program image
 *     tags: [Programs]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 imageUrl:
 *                   type: string
 *       400:
 *         description: No file uploaded or invalid file type
 */
router.post('/upload-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file uploaded' });
        }
        const imageUrl = `/uploads/programs/${req.file.filename}`;
        res.json({ success: true, imageUrl: imageUrl });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @swagger
 * /api/programs:
 *   get:
 *     summary: Get all programs
 *     tags: [Programs]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Course, Workshop, Immersive Trip, Live Online Training]
 *         description: Filter by program type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of programs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 programs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Program'
 */
router.get('/', ProgramController.getAll);

/**
 * @swagger
 * /api/programs/{id}/children:
 *   get:
 *     summary: Get child programs/levels of a parent program
 *     tags: [Programs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent program ID
 *     responses:
 *       200:
 *         description: List of child programs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 children:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Program'
 *       404:
 *         description: Program not found
 */
router.get('/:id/children', ProgramController.getChildren);

/**
 * @swagger
 * /api/programs/{id}/slots:
 *   get:
 *     summary: Get available slots for a program
 *     tags: [Programs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     responses:
 *       200:
 *         description: List of available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       SlotID:
 *                         type: integer
 *                       startDate:
 *                         type: string
 *                         format: date
 *                       endDate:
 *                         type: string
 *                         format: date
 *                       capacity:
 *                         type: integer
 *                       enrolled:
 *                         type: integer
 */
router.get('/:id/slots', ProgramController.getSlots);

/**
 * @swagger
 * /api/programs/{id}/slots:
 *   post:
 *     summary: Create a new slot for a program (Admin only)
 *     tags: [Programs, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *               - capacity
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-04-30"
 *               capacity:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       201:
 *         description: Slot created successfully
 *       403:
 *         description: Admin access required
 */
router.post('/:id/slots', ProgramController.createSlot);

/**
 * @swagger
 * /api/programs/{id}:
 *   get:
 *     summary: Get a single program by ID
 *     tags: [Programs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Program details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 program:
 *                   $ref: '#/components/schemas/Program'
 *       404:
 *         description: Program not found
 */
router.get('/:id', ProgramController.getOne);

/**
 * @swagger
 * /api/programs/{id}:
 *   put:
 *     summary: Update a program (Admin only)
 *     tags: [Programs, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProgramRequest'
 *     responses:
 *       200:
 *         description: Program updated successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Program not found
 */
router.put('/:id', ProgramController.update);

/**
 * @swagger
 * /api/programs/{id}:
 *   delete:
 *     summary: Delete a program (Admin only)
 *     tags: [Programs, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Program deleted successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Program not found
 */
router.delete('/:id', ProgramController.delete);

/**
 * @swagger
 * /api/programs:
 *   post:
 *     summary: Create a new program (Admin only)
 *     tags: [Programs, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProgramRequest'
 *     responses:
 *       201:
 *         description: Program created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 program:
 *                   $ref: '#/components/schemas/Program'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Admin access required
 */
router.post('/', ProgramController.create);
router.post('/create', ProgramController.create);

/**
 * @swagger
 * /api/programs/slots/{slotId}:
 *   put:
 *     summary: Update a program slot (Admin only)
 *     tags: [Programs, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Slot ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               capacity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Slot updated successfully
 */
router.put('/slots/:slotId', ProgramController.updateSlot);

/**
 * @swagger
 * /api/programs/slots/{slotId}:
 *   delete:
 *     summary: Delete a program slot (Admin only)
 *     tags: [Programs, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Slot ID
 *     responses:
 *       200:
 *         description: Slot deleted successfully
 */
router.delete('/slots/:slotId', ProgramController.deleteSlot);

module.exports = router;