const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Document {
  // Upload document
  static async uploadDocument(documentData) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('userID', sql.Int, documentData.userID)
        .input('adminID', sql.Int, documentData.adminID)
        .input('fileName', sql.NVarChar, documentData.fileName)
        .input('fileType', sql.NVarChar, documentData.fileType)
        .input('fileSize', sql.BigInt, documentData.fileSize)
        .input('filePath', sql.NVarChar, documentData.filePath)
        .query(`
          INSERT INTO Documents (UserID, AdminID, FileName, FileType, FileSize, FilePath, UploadDate)
          OUTPUT INSERTED.DocumentID, INSERTED.FileName, INSERTED.FileType, INSERTED.FileSize, INSERTED.UploadDate
          VALUES (@userID, @adminID, @fileName, @fileType, @fileSize, @filePath, GETDATE())
        `);

      return {
        success: true,
        document: result.recordset[0]
      };
    } catch (err) {
      console.error('Document Upload Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get documents by user ID
  static async getDocumentsByUser(userID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .query(`
          SELECT 
            d.DocumentID,
            d.FileName,
            d.FileType,
            d.FileSize,
            d.FilePath,
            d.UploadDate,
            a.Username as AdminName,
            d.AdminID
          FROM Documents d
          INNER JOIN Admins a ON d.AdminID = a.AdminID
          WHERE d.UserID = @userID
          ORDER BY d.UploadDate DESC
        `);

      return result.recordset;
    } catch (err) {
      console.error('Get Documents Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get all users for admin
  static async getAllUsers() {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .query(`
          SELECT 
            UserID,
            Username,
            Email,
            ProfilePicture,
            IsOnline,
            LastSeen
          FROM Users
          ORDER BY Username
        `);

      return result.recordset;
    } catch (err) {
      console.error('Get Users Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Delete document (Admin only)
  // Removed UserID check so Admin can delete any file by ID
  static async deleteDocument(documentID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('documentID', sql.Int, documentID)
        .query(`
          DELETE FROM Documents 
          WHERE DocumentID = @documentID
        `);

      return {
        success: true,
        rowsAffected: result.rowsAffected
      };
    } catch (err) {
      console.error('Delete Document Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Search users
  static async searchUsers(searchTerm) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('searchTerm', sql.NVarChar, `%${searchTerm}%`)
        .query(`
          SELECT 
            UserID,
            Username,
            Email,
            ProfilePicture,
            IsOnline,
            LastSeen
          FROM Users
          WHERE Username LIKE @searchTerm OR Email LIKE @searchTerm
          ORDER BY Username
        `);

      return result.recordset;
    } catch (err) {
      console.error('Search Users Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }
  
  // Get single document (helper for controller)
  static async getDocumentById(documentID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('documentID', sql.Int, documentID)
        .query('SELECT * FROM Documents WHERE DocumentID = @documentID');
      return result.recordset[0];
    } catch (err) {
      throw err;
    } finally {
        if(pool) pool.close();
    }
  }
}

module.exports = Document;