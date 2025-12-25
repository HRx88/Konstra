// ========== Packages ==========
const express = require("express");

// ========== Controllers ==========
const CredentialController = require("../controllers/credentialController");

// ========== Set-up ==========
const credentialRoutes = express.Router();

// ========== Routes ==========

// Dashboard: Get list of users/enrollments + existing credential status
credentialRoutes.get("/dashboard", CredentialController.getDashboard);

// Certifier API Helpers: Get Groups and Designs for the dropdowns
credentialRoutes.get("/groups", CredentialController.getGroups);

// Issue: Create a credential, send email, and save to DB
credentialRoutes.post("/issue", CredentialController.issueCredential);

// User View: Get credentials for a specific user
credentialRoutes.get("/my-credentials", CredentialController.getMyCredentials);
// ========== Export ==========
module.exports = credentialRoutes;