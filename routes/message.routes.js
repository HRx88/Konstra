// ========== Packages ==========
const express = require('express');
const router = express.Router();

// ========== Controllers ==========
const MessageController = require('../controllers/messageController');

// ========== Routes ==========

/**
 * @swagger
 * /api/message/conversations/{userID}/{userType}:
 *   get:
 *     summary: Get all conversations for a user
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [User, Admin, NGO]
 *         description: User type
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 */
router.get("/conversations/:userID/:userType", MessageController.getUserConversations);

/**
 * @swagger
 * /api/message/search:
 *   get:
 *     summary: Search conversations
 *     tags: [Messages]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: userID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", MessageController.searchConversations);

/**
 * @swagger
 * /api/message/conversations/get-or-create:
 *   post:
 *     summary: Get existing or create new conversation
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participant1ID
 *               - participant1Type
 *               - participant2ID
 *               - participant2Type
 *             properties:
 *               participant1ID:
 *                 type: integer
 *                 example: 1
 *               participant1Type:
 *                 type: string
 *                 example: User
 *               participant2ID:
 *                 type: integer
 *                 example: 1
 *               participant2Type:
 *                 type: string
 *                 example: Admin
 *     responses:
 *       200:
 *         description: Conversation data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 *                 isNew:
 *                   type: boolean
 */
router.post("/conversations/get-or-create", MessageController.getOrCreateConversation);

/**
 * @swagger
 * /api/message/conversations/{conversationID}:
 *   get:
 *     summary: Get conversation by ID
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: conversationID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conversation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 */
router.get("/conversations/:conversationID", MessageController.getConversationById);

/**
 * @swagger
 * /api/message/messages/{conversationID}:
 *   get:
 *     summary: Get all messages in a conversation
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: conversationID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 */
router.get("/messages/:conversationID", MessageController.getConversationMessages);

/**
 * @swagger
 * /api/message/messages/send:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationID
 *               - senderID
 *               - senderType
 *               - content
 *             properties:
 *               conversationID:
 *                 type: integer
 *                 example: 1
 *               senderID:
 *                 type: integer
 *                 example: 1
 *               senderType:
 *                 type: string
 *                 example: User
 *               content:
 *                 type: string
 *                 example: Hello!
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 */
router.post("/messages/send", MessageController.sendMessage);

/**
 * @swagger
 * /api/message/mark-as-read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationID
 *               - userID
 *               - userType
 *             properties:
 *               conversationID:
 *                 type: integer
 *               userID:
 *                 type: integer
 *               userType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.post("/mark-as-read", MessageController.markMessagesAsRead);

/**
 * @swagger
 * /api/message/messages/last/{conversationID}:
 *   get:
 *     summary: Get last message in a conversation
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: conversationID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Last message
 */
router.get("/messages/last/:conversationID", MessageController.getLastMessage);

/**
 * @swagger
 * /api/message/users/online:
 *   get:
 *     summary: Get list of online users
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: List of online users
 */
router.get("/users/online", MessageController.getOnlineUsers);

/**
 * @swagger
 * /api/message/users/{userType}:
 *   get:
 *     summary: Get users by type
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [User, Admin, NGO]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/users/:userType", MessageController.getUsersByType);

/**
 * @swagger
 * /api/message/users/check/{userID}/{userType}:
 *   get:
 *     summary: Check if user exists
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User existence check
 */
router.get("/users/check/:userID/:userType", MessageController.checkUserExists);

/**
 * @swagger
 * /api/message/users/online:
 *   post:
 *     summary: Mark user as online
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userID:
 *                 type: integer
 *               userType:
 *                 type: string
 *     responses:
 *       200:
 *         description: User marked online
 */
router.post("/users/online", MessageController.userOnline);

/**
 * @swagger
 * /api/message/users/offline:
 *   post:
 *     summary: Mark user as offline
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userID:
 *                 type: integer
 *               userType:
 *                 type: string
 *     responses:
 *       200:
 *         description: User marked offline
 */
router.post("/users/offline", MessageController.userOffline);

/**
 * @swagger
 * /api/message/unread-count/{conversationID}/{userID}/{userType}:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: conversationID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 */
router.get("/unread-count/:conversationID/:userID/:userType", MessageController.getUnreadCount);

// ========== Export ==========
module.exports = router;