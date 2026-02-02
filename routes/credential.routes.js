// ========== Packages ==========
const express = require("express");

// ========== Controllers ==========
const CredentialController = require("../controllers/credentialController");

// ========== Set-up ==========
const credentialRoutes = express.Router();

// ========== Routes ==========

/**
 * @swagger
 * /api/credentials/dashboard:
 *   get:
 *     summary: Get credential dashboard data (Admin only)
 *     tags: [Credentials, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard with user enrollments and credential status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: integer
 *                       userName:
 *                         type: string
 *                       programName:
 *                         type: string
 *                       hasCredential:
 *                         type: boolean
 *       403:
 *         description: Admin access required
 */
credentialRoutes.get("/dashboard", CredentialController.getDashboard);

/**
 * @swagger
 * /api/credentials/groups:
 *   get:
 *     summary: Get credential groups from Certifier API
 *     tags: [Credentials, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of credential groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 groups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 */
credentialRoutes.get("/groups", CredentialController.getGroups);

/**
 * @swagger
 * /api/credentials/issue:
 *   post:
 *     summary: Issue a digital credential to a user (Admin only)
 *     tags: [Credentials, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - enrollmentId
 *               - groupId
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               enrollmentId:
 *                 type: integer
 *                 example: 1
 *               groupId:
 *                 type: string
 *                 example: group_xxx
 *               designId:
 *                 type: string
 *                 example: design_xxx
 *     responses:
 *       201:
 *         description: Credential issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 credential:
 *                   $ref: '#/components/schemas/Credential'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Admin access required
 */
credentialRoutes.post("/issue", CredentialController.issueCredential);

/**
 * @swagger
 * /api/credentials/my-credentials:
 *   get:
 *     summary: Get current user's credentials
 *     tags: [Credentials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 credentials:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credential'
 *       401:
 *         description: Unauthorized
 */
credentialRoutes.get("/my-credentials", CredentialController.getMyCredentials);

// ========== Export ==========
module.exports = credentialRoutes;