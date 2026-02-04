const Document = require("../models/document");
const path = require('path');
const fs = require('fs');

// Store active SSE clients: Map<userID, res>
const clients = new Map();

class DocumentController {
  // Subscribe to SSE updates
  static async subscribeEvents(req, res) {
    const { userID } = req.params;

    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Register client
    clients.set(parseInt(userID), res);

    // Cleanup on close
    req.on('close', () => {
      clients.delete(parseInt(userID));
    });
  }

  // Helper to send update to user
  static sendUpdateToUser(userID) {
    const targetID = parseInt(userID);

    const clientRes = clients.get(targetID);
    if (clientRes) {
      clientRes.write(`data: update\n\n`);
    }
  }

  // Upload document
  static async uploadDocument(req, res) {
    try {
      const { userID, adminID } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      if (!userID || !adminID) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: "User ID and Admin ID are required" });
      }

      const documentData = {
        userID: parseInt(userID),
        adminID: parseInt(adminID),
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path
      };

      const result = await Document.uploadDocument(documentData);

      // Notify Client via SSE
      DocumentController.sendUpdateToUser(userID);

      res.status(200).json({
        success: true,
        message: "Document uploaded successfully",
        document: result.document
      });
    } catch (err) {
      console.error('Document Upload Error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, error: "Failed to upload document" });
    }
  }

  // Get user documents
  static async getUserDocuments(req, res) {
    try {
      const { userID } = req.params;
      const documents = await Document.getDocumentsByUser(parseInt(userID));
      res.status(200).json({ success: true, documents: documents });
    } catch (err) {
      console.error('Get Documents Error:', err);
      res.status(500).json({ success: false, error: "Failed to fetch documents" });
    }
  }

  // Get all users
  static async getAllUsers(req, res) {
    try {
      const users = await Document.getAllUsers();
      res.status(200).json({ success: true, users: users });
    } catch (err) {
      console.error('Get Users Error:', err);
      res.status(500).json({ success: false, error: "Failed to fetch users" });
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
      const { searchTerm } = req.params;
      if (!searchTerm || searchTerm.length < 2) {
        return res.status(400).json({ success: false, error: "Search term too short" });
      }
      const users = await Document.searchUsers(searchTerm);
      res.status(200).json({ success: true, users: users });
    } catch (err) {
      console.error('Search Users Error:', err);
      res.status(500).json({ success: false, error: "Failed to search users" });
    }
  }

  // Delete document (Updated for Admin Only)
  static async deleteDocument(req, res) {
    try {
      const { documentID, userID } = req.params; // Get userID from params to notify them

      // If userID is not in params (older route), we might need to fetch doc to find owner.
      // But admin-doc.html sends: /api/documents/${docId}/user/${selectedUser.id}
      // So checking routes...

      const document = await Document.getDocumentById(parseInt(documentID));

      if (!document) {
        return res.status(404).json({ success: false, error: "Document not found" });
      }

      await Document.deleteDocument(parseInt(documentID));

      if (fs.existsSync(document.FilePath)) {
        fs.unlinkSync(document.FilePath);
      }

      // Notify Client via SSE (Using the userID passed in params or from the document if available)
      // Assuming route is /:documentID/user/:userID
      if (userID) {
        DocumentController.sendUpdateToUser(userID);
      } else if (document.UserID) {
        DocumentController.sendUpdateToUser(document.UserID);
      }

      res.status(200).json({ success: true, message: "Document deleted successfully" });
    } catch (err) {
      console.error('Delete Document Error:', err);
      res.status(500).json({ success: false, error: "Failed to delete document" });
    }
  }

  // Download document
  static async downloadDocument(req, res) {
    try {
      const { documentID } = req.params;
      const document = await Document.getDocumentById(parseInt(documentID));

      if (!document) {
        return res.status(404).json({ success: false, error: "Document not found" });
      }

      if (!fs.existsSync(document.FilePath)) {
        return res.status(404).json({ success: false, error: "File not found on server" });
      }

      res.download(document.FilePath, document.FileName);
    } catch (err) {
      console.error('Download Document Error:', err);
      res.status(500).json({ success: false, error: "Failed to download document" });
    }
  }

  // Upload document for review (by user)
  static async uploadForReview(req, res) {
    try {
      const { userID } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      if (!userID) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: "User ID is required" });
      }

      const documentData = {
        userID: parseInt(userID),
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path
      };

      const result = await Document.uploadUserDocument(documentData);

      // Notify all admins (optional - could implement admin SSE later)

      res.status(200).json({
        success: true,
        message: "Document submitted for review",
        document: result.document
      });
    } catch (err) {
      console.error('User Upload Error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, error: "Failed to upload document" });
    }
  }

  // Get user's uploaded documents
  static async getUserUploads(req, res) {
    try {
      const { userID } = req.params;
      const documents = await Document.getUserUploads(parseInt(userID));
      res.status(200).json({ success: true, documents: documents });
    } catch (err) {
      console.error('Get User Uploads Error:', err);
      res.status(500).json({ success: false, error: "Failed to fetch uploads" });
    }
  }
  // Get pending documents
  static async getPendingDocuments(req, res) {
    try {
      const documents = await Document.getPendingDocuments();
      res.status(200).json({ success: true, documents: documents });
    } catch (err) {
      console.error('Get Pending Docs Error:', err);
      res.status(500).json({ success: false, error: "Failed to fetch pending documents" });
    }
  }

  // Approve document
  static async approveDocument(req, res) {
    try {
      const { documentID } = req.params;
      const { feedback } = req.body;
      const file = req.file;

      await Document.updateReviewStatus(
        parseInt(documentID),
        'Approved',
        feedback || null,
        file ? file.path : null,
        file ? file.originalname : null
      );

      res.status(200).json({ success: true, message: "Document approved" });
    } catch (err) {
      console.error('Approve Doc Error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, error: "Failed to approve document" });
    }
  }

  // Reject document
  static async rejectDocument(req, res) {
    try {
      const { documentID } = req.params;
      const { feedback } = req.body;
      const file = req.file;

      if (!feedback) {
        if (file) fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: "Reason is required for rejection" });
      }

      await Document.updateReviewStatus(
        parseInt(documentID),
        'Rejected',
        feedback,
        file ? file.path : null,
        file ? file.originalname : null
      );

      res.status(200).json({ success: true, message: "Document rejected" });
    } catch (err) {
      console.error('Reject Doc Error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, error: "Failed to reject document" });
    }
  }

  // Download feedback document
  static async downloadFeedback(req, res) {
    try {
      const { documentID } = req.params;
      const document = await Document.getDocumentById(parseInt(documentID));

      if (!document || !document.FeedbackFilePath) {
        return res.status(404).json({ success: false, error: "Feedback file not found" });
      }

      if (!fs.existsSync(document.FeedbackFilePath)) {
        return res.status(404).json({ success: false, error: "File not found on server" });
      }

      res.download(document.FeedbackFilePath, document.FeedbackFileName);
    } catch (err) {
      console.error('Download Feedback Error:', err);
      res.status(500).json({ success: false, error: "Failed to download feedback" });
    }
  }
}

module.exports = DocumentController;