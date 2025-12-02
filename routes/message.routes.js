// ========== Packages ==========
const express = require('express');
const router = express.Router();

// ========== Controllers ==========
const MessageController = require('../controllers/messageController');

// ========== Routes ==========

// ========== Page Routes ==========

// ========== API Routes ==========
// Conversation routes
router.get("/conversations/:userID/:userType", MessageController.getUserConversations);
router.post("/conversations/get-or-create", MessageController.getOrCreateConversation);
router.get("/conversations/:conversationID", MessageController.getConversationById);

// Message routes
router.get("/messages/:conversationID", MessageController.getConversationMessages);
router.post("/messages/send", MessageController.sendMessage);
router.post("/mark-as-read", MessageController.markMessagesAsRead);
router.get("/messages/last/:conversationID", MessageController.getLastMessage);

// User routes
router.get("/users/online", MessageController.getOnlineUsers);
router.get("/users/:userType", MessageController.getUsersByType);
router.get("/users/check/:userID/:userType", MessageController.checkUserExists);
router.post("/users/online", MessageController.userOnline);
router.post("/users/offline", MessageController.userOffline);

// Utility routes
router.get("/unread-count/:conversationID/:userID/:userType", MessageController.getUnreadCount); 
// ========== Export ==========
module.exports = router;