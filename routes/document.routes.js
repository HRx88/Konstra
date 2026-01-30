// ========== Packages ==========
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// ========== Controllers ==========
const DocumentController = require('../controllers/documentController');

// ========== Multer Configuration ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only documents and images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// ========== Routes ==========

// SSE Route
router.get("/events/:userID", DocumentController.subscribeEvents);

// ========== API Routes ==========
// Document upload
router.post("/upload", upload.single('document'), DocumentController.uploadDocument);

// Get user documents
router.get("/user/:userID", DocumentController.getUserDocuments);

// Get all users (for admin)
router.get("/users", DocumentController.getAllUsers);

// Search users
router.get("/users/search/:searchTerm", DocumentController.searchUsers);

// Delete document
router.delete("/:documentID/user/:userID", DocumentController.deleteDocument);

// Download document
router.get("/download/:documentID/user/:userID", DocumentController.downloadDocument);

// User upload for review
router.post("/upload-for-review", upload.single('document'), DocumentController.uploadForReview);

// Get user's uploaded documents
router.get("/user/:userID/uploads", DocumentController.getUserUploads);

// Admin: Get pending documents
router.get("/admin/pending", DocumentController.getPendingDocuments);

// Admin: Approve document (with optional file)
router.put("/admin/approve/:documentID", upload.single('feedbackFile'), DocumentController.approveDocument);

// Admin: Reject document (with optional file)
router.put("/admin/reject/:documentID", upload.single('feedbackFile'), DocumentController.rejectDocument);

// Download feedback file
router.get("/admin/feedback/download/:documentID", DocumentController.downloadFeedback);

// ========== Export ==========
module.exports = router;

// Ensure fs is available for the upload directory creation
const fs = require('fs');