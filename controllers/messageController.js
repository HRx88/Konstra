const Message = require("../models/message");

class MessageController {
  // Get all conversations for a user
  static async getUserConversations(req, res) {
    try {
      const { userID, userType } = req.params;
      
      console.log(`[CONTROLLER] Getting conversations for user: ${userID} (${userType})`);
      
      const conversations = await Message.getUserConversations(userID, userType);
      
      console.log(`[CONTROLLER] Found ${conversations.length} conversations`);
      
      res.status(200).json({ 
        success: true,
        conversations: conversations
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to fetch conversations:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch conversations" 
      });
    }
  }

  // Get messages for a conversation
  static async getConversationMessages(req, res) {
    try {
      const { conversationID } = req.params;
      
      console.log(`[CONTROLLER] Getting messages for conversation: ${conversationID}`);
      
      const messages = await Message.getMessagesByConversation(conversationID);
      
      console.log(`[CONTROLLER] Found ${messages.length} messages`);
      
      res.status(200).json({ 
        success: true,
        messages: messages
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to fetch messages:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch messages" 
      });
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(req, res) {
    try {
      const { conversationID, userID, userType } = req.body;
      
      console.log(`[CONTROLLER] Marking messages as read for conversation: ${conversationID}, user: ${userID} (${userType})`);
      
      const result = await Message.markMessagesAsRead(conversationID, userID, userType);
      
      if (result.success) {
        console.log(`[CONTROLLER] Successfully marked ${result.rowsAffected} messages as read`);
        res.status(200).json({ 
          success: true,
          message: result.message,
          rowsAffected: result.rowsAffected
        });
      } else {
        console.error('[CONTROLLER ERROR] Failed to mark messages as read:', result.error);
        res.status(500).json({ 
          success: false,
          error: "Failed to mark messages as read" 
        });
      }
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to mark messages as read:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to mark messages as read" 
      });
    }
  }

  // Get or create conversation
  static async getOrCreateConversation(req, res) {
    try {
      const { user1ID, user1Type, user2ID, user2Type } = req.body;
      
      console.log(`[CONTROLLER] Getting or creating conversation between: ${user1ID} (${user1Type}) and ${user2ID} (${user2Type})`);
      
      const conversationID = await Message.getOrCreateConversation(user1ID, user1Type, user2ID, user2Type);
      
      console.log(`[CONTROLLER] Conversation ID: ${conversationID}`);
      
      // Get conversation details
      const conversation = await Message.getConversationById(conversationID);
      
      res.status(200).json({ 
        success: true,
        conversation: conversation
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to get/create conversation:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to get/create conversation" 
      });
    }
  }

  // Send message
  static async sendMessage(req, res) {
    try {
      const { conversationID, senderID, senderType, content } = req.body;
      
      console.log(`[CONTROLLER] Sending message to conversation: ${conversationID}, from: ${senderID} (${senderType})`);
      
      if (!conversationID || !senderID || !senderType || !content) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: conversationID, senderID, senderType, content"
        });
      }

      const savedMessage = await Message.sendMessage(conversationID, senderID, senderType, content);
      
      console.log(`[CONTROLLER] Message sent successfully, ID: ${savedMessage.messageID}`);
      
      res.status(201).json({ 
        success: true,
        message: "Message sent successfully",
        data: savedMessage
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to send message:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to send message" 
      });
    }
  }

  // Get online users
  static async getOnlineUsers(req, res) {
    try {
      console.log(`[CONTROLLER] Getting online users`);
      
      const onlineUsers = await Message.getOnlineUsers();
      
      console.log(`[CONTROLLER] Found ${onlineUsers.length} online users`);
      
      res.status(200).json({ 
        success: true,
        onlineUsers: onlineUsers
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to fetch online users:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch online users" 
      });
    }
  }

  // Get conversation by ID
  static async getConversationById(req, res) {
    try {
      const { conversationID } = req.params;
      
      console.log(`[CONTROLLER] Getting conversation by ID: ${conversationID}`);
      
      const conversation = await Message.getConversationById(conversationID);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }
      
      res.status(200).json({ 
        success: true,
        conversation: conversation
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to fetch conversation:', err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch conversation" 
      });
    }
  }

  // Get users by type (for starting new conversations)
  static async getUsersByType(req, res) {
    try {
      const { userType } = req.params;
      
      if (!['User', 'Admin'].includes(userType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user type. Must be 'User' or 'Admin'"
        });
      }
      
      console.log(`[CONTROLLER] Getting users of type: ${userType}`);
      
      const users = await Message.getUsers(userType);
      
      console.log(`[CONTROLLER] Found ${users.length} ${userType}s`);
      
      res.status(200).json({
        success: true,
        users: users
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to fetch users:', err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch users"
      });
    }
  }

  // Check if user exists
  static async checkUserExists(req, res) {
    try {
      const { userID, userType } = req.params;
      
      console.log(`[CONTROLLER] Checking if user exists: ${userID} (${userType})`);
      
      // For this method, we need to implement a direct database check
      const sql = require('mssql');
      const dbConfig = require('../dbConfig');
      
      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';
      
      const pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .query(`
          SELECT ${idField}, Username 
          FROM ${tableName} 
          WHERE ${idField} = @userID
        `);
      
      await pool.close();
      
      if (result.recordset.length > 0) {
        res.status(200).json({
          success: true,
          exists: true,
          user: result.recordset[0]
        });
      } else {
        res.status(200).json({
          success: true,
          exists: false
        });
      }
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to check user:', err);
      res.status(500).json({
        success: false,
        error: "Failed to check user existence"
      });
    }
  }

  // Update user online status
  static async userOnline(req, res) {
    try {
      const { userID, userType } = req.body;
      
      console.log(`[CONTROLLER] Setting user online: ${userID} (${userType})`);
      
      await Message.userOnline(userID, userType);
      
      res.status(200).json({
        success: true,
        message: "User status updated to online"
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to set user online:', err);
      res.status(500).json({
        success: false,
        error: "Failed to set user online"
      });
    }
  }

  // Update user offline status
  static async userOffline(req, res) {
    try {
      const { userID, userType } = req.body;
      
      console.log(`[CONTROLLER] Setting user offline: ${userID} (${userType})`);
      
      await Message.userOffline(userID, userType);
      
      res.status(200).json({
        success: true,
        message: "User status updated to offline"
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to set user offline:', err);
      res.status(500).json({
        success: false,
        error: "Failed to set user offline"
      });
    }
  }

  // Get last message in conversation
  static async getLastMessage(req, res) {
    try {
      const { conversationID } = req.params;
      
      console.log(`[CONTROLLER] Getting last message for conversation: ${conversationID}`);
      
      const lastMessage = await Message.getLastMessage(conversationID);
      
      res.status(200).json({
        success: true,
        lastMessage: lastMessage
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to get last message:', err);
      res.status(500).json({
        success: false,
        error: "Failed to get last message"
      });
    }
  }

  // Get unread message count
  static async getUnreadCount(req, res) {
    try {
      const { conversationID, userID, userType } = req.params;
      
      console.log(`[CONTROLLER] Getting unread count for conversation: ${conversationID}, user: ${userID} (${userType})`);
      
      const unreadCount = await Message.getUnreadCount(conversationID, parseInt(userID), userType);
      
      res.status(200).json({
        success: true,
        unreadCount: unreadCount
      });
    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to get unread count:', err);
      res.status(500).json({
        success: false,
        error: "Failed to get unread count"
      });
    }
  }
}

module.exports = MessageController;