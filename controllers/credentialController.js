// ========== Models ==========
const Credential = require("../models/credential");

class CredentialController {
  
  // 1. Get Dashboard Data
  static async getDashboard(req, res) {
    try {
      const data = await Credential.getDashboardData();
      res.status(200).json(data);
    } catch (error) {
      console.error("Controller Error (getDashboard):", error.message);
      res.status(500).json({ error: "Failed to load dashboard data." });
    }
  }

  // 2. Issue Credential
  static async issueCredential(req, res) {
    try {
      // Destructure expected fields from the frontend request
      const { userID, programID, recipientName, recipientEmail, groupID } = req.body;

      // Basic Validation
      if (!userID || !programID || !groupID || !recipientName || !recipientEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: userID, programID, groupID, recipientName, recipientEmail." 
        });
      }

      // Call Model
      const result = await Credential.issueCredential({
        userID,
        programID,
        recipientName,
        recipientEmail,
        groupID
      });

      res.status(200).json({
        success: true,
        message: "Credential issued and saved successfully.",
        data: result // Returns the API response (url, id, etc)
      });

    } catch (error) {
      console.error("Controller Error (issueCredential):", error.message);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to issue credential." 
      });
    }
  }

  // 3. Get Groups (for Dropdown)
  static async getGroups(req, res) {
    try {
      const groups = await Credential.getCertifierGroups();
      res.status(200).json(groups);
    } catch (error) {
      console.error("Controller Error (getGroups):", error.message);
      res.status(500).json({ error: "Failed to fetch groups." });
    }
    }
    
   // 4. Get My Credentials (User View)
  static async getMyCredentials(req, res) {
    try {
      const { userID } = req.query; // e.g. "1" (string)

      // 1. Basic Check
      if (!userID) {
        return res.status(400).json({ error: "UserID is required" });
      }

      // 2. FIX: Convert string to integer to prevent "Invalid number" error
      const parsedID = parseInt(userID, 10);

      if (isNaN(parsedID)) {
        return res.status(400).json({ error: "UserID must be a valid number" });
      }

      // 3. Call Model with the integer
      const credentials = await Credential.getCredentialsByUserId(parsedID);
      res.status(200).json(credentials);

    } catch (error) {
      console.error("Controller Error (getMyCredentials):", error.message);
      res.status(500).json({ error: "Failed to fetch user credentials." });
    }
  }
}

module.exports = CredentialController;