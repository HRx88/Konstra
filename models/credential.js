const sql = require("mssql");
const dbConfig = require("../dbConfig");

class Credential {

  // =========================================================
  // 1. Get Dashboard Data
  // =========================================================
  static async getDashboardData() {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const query = `
        SELECT 
            u.UserID, 
            u.Username, 
            u.Email,
            p.ProgramID, 
            p.Title AS ProgramTitle,
            e.CompletionDate,
            c.CredentialID,
            c.PublicURL,
            c.PdfURL,
            c.ImageURL
        FROM Enrollments e
        INNER JOIN Users u ON e.UserID = u.UserID
        INNER JOIN Programs p ON e.ProgramID = p.ProgramID
        LEFT JOIN Credentials c ON e.UserID = c.UserID AND e.ProgramID = c.ProgramID
        WHERE e.Status = 'Completed'
        ORDER BY e.CompletionDate DESC
      `;

      const result = await pool.request().query(query);
      return result.recordset;
    } catch (error) {
      console.error("DB Error in getDashboardData:", error);
      throw error;
    } finally {
      if (pool) pool.close();
    }
  }

  // =========================================================
  // 2. Issue Credential (API + DB)
  // =========================================================
  static async issueCredential({ userID, programID, recipientName, recipientEmail, groupID }) {
    let pool;
    try {
      // -----------------------------------------------------
      // Step A: Issue the Credential
      // -----------------------------------------------------
      const issueDate = new Date().toISOString().split('T')[0]; 

      const certifierPayload = {
        recipient: {
          name: recipientName,
          email: recipientEmail
        },
        issueDate: issueDate,
        groupId: groupID
      };

      console.log("[DEBUG] Step 1: Issuing Credential...", JSON.stringify(certifierPayload));

      const createResponse = await fetch("https://api.certifier.io/v1/credentials/create-issue-send", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "Certifier-Version": "2022-10-26",
          "authorization": `Bearer ${process.env.CERTIFIER_API_KEY}`
        },
        body: JSON.stringify(certifierPayload)
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        console.error("[DEBUG] Issue Error:", createData);
        throw new Error(createData.message || "Failed to issue credential.");
      }

      // 1. Extract IDs
      const newCredentialId = createData.id;
      const publicId = createData.publicId;

      if (!newCredentialId || !publicId) {
        throw new Error("Failed to retrieve 'id' or 'publicId' from issuance response.");
      }

      // 2. Construct Public URL using the publicId
      const finalPublicUrl = `https://credsverse.com/credentials/${publicId}`;

      console.log(`[DEBUG] Step 1 Success. ID: ${newCredentialId}, PublicURL: ${finalPublicUrl}`);

      // -----------------------------------------------------
      // Step B: Fetch Designs (to get Image/PDF from Previews)
      // -----------------------------------------------------
      const designsUrl = `https://api.certifier.io/v1/credentials/${newCredentialId}/designs`;
      
      console.log(`[DEBUG] Step 2: Fetching designs from ${designsUrl}`);
      
      const designResponse = await fetch(designsUrl, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "Certifier-Version": "2022-10-26",
          "authorization": `Bearer ${process.env.CERTIFIER_API_KEY}`
        }
      });

      const designData = await designResponse.json();

      if (!designResponse.ok) {
        console.error("[DEBUG] Fetch Designs Error:", designData);
        // We don't throw here to ensure we still save the credential, just without images
      }

      let finalPdfUrl = null;
      let finalImageUrl = null;

      // Parse the Array Response
      if (Array.isArray(designData) && designData.length > 0) {
        // We take the first design returned
        const design = designData[0];
        
        if (design.previews && Array.isArray(design.previews)) {
          // Find PNG for ImageURL
          const pngObj = design.previews.find(p => p.format === 'png');
          if (pngObj) finalImageUrl = pngObj.url;

          // Find PDF for PdfURL
          const pdfObj = design.previews.find(p => p.format === 'pdf');
          if (pdfObj) finalPdfUrl = pdfObj.url;
        }
      }

      console.log("[DEBUG] Retrieved Assets:", { finalImageUrl, finalPdfUrl });

      // -----------------------------------------------------
      // Step C: Save to Database
      // -----------------------------------------------------
      pool = await sql.connect(dbConfig);
      
      const insertQuery = `
        INSERT INTO Credentials 
        (UserID, ProgramID, CertifierCredentialID, PublicURL, PdfURL, ImageURL, Type, IssuedAt)
        VALUES 
        (@UserID, @ProgramID, @CertID, @PublicURL, @PdfURL, @ImageURL, 'Badge', GETDATE());
      `;

      await pool.request()
        .input("UserID", sql.Int, userID)
        .input("ProgramID", sql.Int, programID)
        .input("CertID", sql.NVarChar, newCredentialId)
        .input("PublicURL", sql.NVarChar, finalPublicUrl)
        .input("PdfURL", sql.NVarChar, finalPdfUrl) 
        .input("ImageURL", sql.NVarChar, finalImageUrl)
        .query(insertQuery);

      return { 
        id: newCredentialId, 
        url: finalPublicUrl, 
        pdf: finalPdfUrl,
        image: finalImageUrl
      };

    } catch (error) {
      console.error("Error in issueCredential:", error);
      throw error;
    } finally {
      if (pool) pool.close();
    }
  }

  // =========================================================
  // 3. Get Groups (API Helper)
  // =========================================================
  static async getCertifierGroups() {
    try {
      const response = await fetch("https://api.certifier.io/v1/groups?limit=20", {
        method: "GET",
        headers: {
          "accept": "application/json",
          "Certifier-Version": "2022-10-26",
          "authorization": `Bearer ${process.env.CERTIFIER_API_KEY}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return [];
      }
      return result.data || [];

    } catch (error) {
      console.error("Error fetching groups:", error);
      return [];
    }
  }

  // =========================================================
  // 4. Get Credentials for Specific User
  // =========================================================
  static async getCredentialsByUserId(userID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      // FIX: Added c.CertifierCredentialID to the SELECT list
      const query = `
       SELECT 
            c.CredentialID,
            c.CertifierCredentialID, 
            c.PublicURL,
            c.PdfURL,
            c.ImageURL,  -- Added this back so we can show the badge image!
            c.IssuedAt,
            p.Title AS ProgramTitle,
            p.ImageURL AS ProgramImage,
            p.Type AS ProgramType
        FROM Credentials c
        INNER JOIN Programs p ON c.ProgramID = p.ProgramID
        WHERE c.UserID = @UserID
        ORDER BY c.IssuedAt DESC
      `;

      const result = await pool.request()
        .input("UserID", sql.Int, userID)
        .query(query);

      return result.recordset;
    } catch (error) {
      console.error("Error in getCredentialsByUserId:", error);
      throw error;
    } finally {
      if (pool) pool.close();
    }
  }
}

module.exports = Credential;