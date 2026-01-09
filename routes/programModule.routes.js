const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ProgramModuleController = require('../controllers/programModuleController');

// ========== Multer Configuration for Module Content ==========
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/modules');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'module-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'application/pdf',
        'image/jpeg',
        'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only video files (MP4, WebM, OGG), PDFs, and images are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2048 * 1024 * 1024 // 2GB limit for videos
    }
});

// ========== Routes ==========

// Get all modules for a program
router.get('/programs/:programId/modules', ProgramModuleController.getModules);

// SSE Endpoint for real-time module updates
router.get('/programs/:programId/modules/events', ProgramModuleController.sseEvents);

// Get user progress for an enrollment
router.get('/enrollments/:enrollmentId/progress', ProgramModuleController.getUserProgress);

// Mark a module as complete
router.post('/enrollments/:enrollmentId/modules/:moduleId/complete', ProgramModuleController.completeModule);

// File upload endpoint for module content
router.post('/modules/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Return the URL path to the uploaded file
        const fileUrl = '/uploads/modules/' + req.file.filename;
        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

// Admin routes
router.post('/programs/:programId/modules', ProgramModuleController.createModule);
router.put('/modules/:moduleId', ProgramModuleController.updateModule);
router.delete('/modules/:moduleId', ProgramModuleController.deleteModule);

module.exports = router;
