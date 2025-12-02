const Document = require("../models/document");
const path = require('path');
const fs = require('fs');

class DocumentController {
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
      const { documentID } = req.params; // No need for userID in params for Admin

      // Get document to find file path
      const document = await Document.getDocumentById(parseInt(documentID));

      if (!document) {
        return res.status(404).json({ success: false, error: "Document not found" });
      }

      // Delete from DB
      await Document.deleteDocument(parseInt(documentID));

      // Delete physical file
      if (fs.existsSync(document.FilePath)) {
        fs.unlinkSync(document.FilePath);
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
}

module.exports = DocumentController;