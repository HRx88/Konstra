const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Message {
  constructor(senderID, senderType, content, conversationID = null) {
    this.senderID = senderID;
    this.senderType = senderType;
    this.content = content;
    this.conversationID = conversationID;
    this.timestamp = new Date();
    this.isRead = false;
  }

  // Update user online status
  static async userOnline(userID, userType) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';

      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .query(`
          UPDATE ${tableName} 
          SET IsOnline = 1, LastSeen = GETDATE() 
          WHERE ${idField} = @userID
        `);

      return result;
    } catch (err) {
      console.error('SQL Update Online Status Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Update user offline status
  static async userOffline(userID, userType) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';

      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .query(`
          UPDATE ${tableName} 
          SET IsOnline = 0, LastSeen = GETDATE() 
          WHERE ${idField} = @userID
        `);

      return result;
    } catch (err) {
      console.error('SQL Update Offline Status Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get or create conversation between two users
  static async getOrCreateConversation(user1ID, user1Type, user2ID, user2Type) {
    let pool;
    try {
      // RESTRICTION LOGIC:
      // If both are Users, reject. If both are Admins, reject (optional, depending on need).
      if (user1Type === 'User' && user2Type === 'User') {
        throw new Error("Users can only chat with Admins.");
      }

      pool = await sql.connect(dbConfig);

      // Try to find existing conversation
      const findResult = await pool.request()
        .input('user1ID', sql.Int, user1ID)
        .input('user1Type', sql.NVarChar, user1Type)
        .input('user2ID', sql.Int, user2ID)
        .input('user2Type', sql.NVarChar, user2Type)
        .query(`
          SELECT ConversationID 
          FROM Conversations 
          WHERE 
            (Participant1ID = @user1ID AND Participant1Type = @user1Type AND Participant2ID = @user2ID AND Participant2Type = @user2Type)
            OR 
            (Participant1ID = @user2ID AND Participant1Type = @user2Type AND Participant2ID = @user1ID AND Participant2Type = @user1Type)
        `);

      if (findResult.recordset.length > 0) {
        return findResult.recordset[0].ConversationID;
      }

      // Create new conversation
      const createResult = await pool.request()
        .input('participant1ID', sql.Int, user1ID)
        .input('participant1Type', sql.NVarChar, user1Type)
        .input('participant2ID', sql.Int, user2ID)
        .input('participant2Type', sql.NVarChar, user2Type)
        .query(`
          INSERT INTO Conversations (Participant1ID, Participant1Type, Participant2ID, Participant2Type, CreatedAt, LastMessageAt)
          VALUES (@participant1ID, @participant1Type, @participant2ID, @participant2Type, GETDATE(), GETDATE());
          SELECT SCOPE_IDENTITY() AS ConversationID;
        `);

      return createResult.recordset[0].ConversationID;
    } catch (err) {
      console.error('SQL Get/Create Conversation Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Send message
  static async sendMessage(conversationID, senderID, senderType, content) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('senderID', sql.Int, senderID)
        .input('senderType', sql.NVarChar, senderType)
        .input('content', sql.NVarChar, content)
        .input('conversationID', sql.Int, conversationID)
        .input('timestamp', sql.DateTime, new Date())
        .query(`
          INSERT INTO Messages (SenderID, SenderType, Content, ConversationID, Timestamp)
          VALUES (@senderID, @senderType, @content, @conversationID, @timestamp);
          SELECT SCOPE_IDENTITY() AS MessageID;
        `);

      const messageID = result.recordset[0].MessageID;

      // Update conversation's last message timestamp
      await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .query(`
          UPDATE Conversations 
          SET LastMessageAt = GETDATE() 
          WHERE ConversationID = @conversationID
        `);

      // Return the saved message
      const messageResult = await pool.request()
        .input('messageID', sql.Int, messageID)
        .query(`
          SELECT 
            MessageID,
            SenderID,
            SenderType,
            Content,
            ConversationID,
            IsRead,
            ReadAt,
            Timestamp
          FROM Messages 
          WHERE MessageID = @messageID
        `);

      const message = messageResult.recordset[0];
      return {
        messageID: message.MessageID,
        senderID: message.SenderID,
        senderType: message.SenderType,
        content: message.Content,
        conversationID: message.ConversationID,
        isRead: message.IsRead,
        readAt: message.ReadAt,
        timestamp: message.Timestamp
      };
    } catch (err) {
      console.error('SQL Send Message Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get conversation by ID with proper user names
  static async getConversationById(conversationID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .query(`
          SELECT 
            c.ConversationID,
            c.Participant1ID,
            c.Participant1Type,
            c.Participant2ID,
            c.Participant2Type,
            c.CreatedAt,
            c.LastMessageAt,
            -- Participant 1 details
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.Username
              WHEN c.Participant1Type = 'Admin' THEN a1.Username
              ELSE 'Unknown'
            END as Participant1Name,
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.ProfilePicture
              WHEN c.Participant1Type = 'Admin' THEN a1.ProfilePicture
              ELSE NULL
            END as Participant1ProfilePicture,
            -- Participant 2 details
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.Username
              WHEN c.Participant2Type = 'Admin' THEN a2.Username
              ELSE 'Unknown'
            END as Participant2Name,
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.ProfilePicture
              WHEN c.Participant2Type = 'Admin' THEN a2.ProfilePicture
              ELSE NULL
            END as Participant2ProfilePicture
          FROM Conversations c
          LEFT JOIN Users u1 ON c.Participant1Type = 'User' AND c.Participant1ID = u1.UserID
          LEFT JOIN Admins a1 ON c.Participant1Type = 'Admin' AND c.Participant1ID = a1.AdminID
          LEFT JOIN Users u2 ON c.Participant2Type = 'User' AND c.Participant2ID = u2.UserID
          LEFT JOIN Admins a2 ON c.Participant2Type = 'Admin' AND c.Participant2ID = a2.AdminID
          WHERE c.ConversationID = @conversationID
        `);

      return result.recordset[0] || null;
    } catch (err) {
      console.error('SQL Get Conversation Error:', err);
      return null;
    } finally {
      if (pool) pool.close();
    }
  }

  // Mark messages as read - Only marks unread messages
  static async markMessagesAsRead(conversationID, userID, userType) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const checkResult = await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .input('userID', sql.Int, userID)
        .input('userType', sql.NVarChar, userType)
        .query(`
          SELECT COUNT(*) as UnreadCount 
          FROM Messages 
          WHERE ConversationID = @conversationID 
            AND SenderID != @userID 
            AND SenderType != @userType
            AND IsRead = 0
        `);

      const unreadCount = checkResult.recordset[0].UnreadCount;

      if (unreadCount === 0) {
        return { success: true, rowsAffected: 0, message: "No unread messages" };
      }

      const result = await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .input('userID', sql.Int, userID)
        .input('userType', sql.NVarChar, userType)
        .input('readAt', sql.DateTime, new Date())
        .query(`
          UPDATE Messages 
          SET IsRead = 1, ReadAt = @readAt 
          WHERE ConversationID = @conversationID 
            AND SenderID != @userID 
            AND SenderType != @userType
            AND IsRead = 0
        `);

      return {
        success: true,
        rowsAffected: result.rowsAffected[0],
        message: "Messages marked as read"
      };
    } catch (err) {
      console.error('SQL Mark Messages Read Error:', err);
      return { success: false, error: err, rowsAffected: 0 };
    } finally {
      if (pool) pool.close();
    }
  }

  // Get messages for a conversation
  static async getMessagesByConversation(conversationID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .query(`
          SELECT 
            MessageID,
            SenderID,
            SenderType,
            Content,
            ConversationID,
            IsRead,
            ReadAt,
            Timestamp
          FROM Messages 
          WHERE ConversationID = @conversationID 
          ORDER BY Timestamp ASC
        `);

      return result.recordset.map(row => ({
        messageID: row.MessageID,
        senderID: row.SenderID,
        senderType: row.SenderType,
        content: row.Content,
        conversationID: row.ConversationID,
        isRead: row.IsRead,
        readAt: row.ReadAt,
        timestamp: row.Timestamp
      }));
    } catch (err) {
      console.error('SQL Get Messages Error:', err);
      return [];
    } finally {
      if (pool) pool.close();
    }
  }

  // Get user conversations with last message and unread count
  static async getUserConversations(userID, userType) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .input('userType', sql.NVarChar, userType)
        .query(`
          SELECT 
            c.ConversationID,
            c.Participant1ID,
            c.Participant1Type,
            c.Participant2ID,
            c.Participant2Type,
            c.CreatedAt,
            c.LastMessageAt,
            -- Participant 1 details
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.Username
              WHEN c.Participant1Type = 'Admin' THEN a1.Username
              ELSE 'Unknown'
            END as Participant1Name,
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.ProfilePicture
              WHEN c.Participant1Type = 'Admin' THEN a1.ProfilePicture
              ELSE NULL
            END as Participant1ProfilePicture,
            -- Participant 2 details
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.Username
              WHEN c.Participant2Type = 'Admin' THEN a2.Username
              ELSE 'Unknown'
            END as Participant2Name,
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.ProfilePicture
              WHEN c.Participant2Type = 'Admin' THEN a2.ProfilePicture
              ELSE NULL
            END as Participant2ProfilePicture,
            -- Online status
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.IsOnline
              WHEN c.Participant1Type = 'Admin' THEN a1.IsOnline
              ELSE 0
            END as Participant1IsOnline,
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.IsOnline
              WHEN c.Participant2Type = 'Admin' THEN a2.IsOnline
              ELSE 0
            END as Participant2IsOnline
          FROM Conversations c
          LEFT JOIN Users u1 ON c.Participant1Type = 'User' AND c.Participant1ID = u1.UserID
          LEFT JOIN Admins a1 ON c.Participant1Type = 'Admin' AND c.Participant1ID = a1.AdminID
          LEFT JOIN Users u2 ON c.Participant2Type = 'User' AND c.Participant2ID = u2.UserID
          LEFT JOIN Admins a2 ON c.Participant2Type = 'Admin' AND c.Participant2ID = a2.AdminID
          WHERE 
            (c.Participant1ID = @userID AND c.Participant1Type = @userType)
            OR 
            (c.Participant2ID = @userID AND c.Participant2Type = @userType)
            OR
            (@userType = 'Admin' AND (c.Participant1Type = 'Admin' OR c.Participant2Type = 'Admin'))
          ORDER BY c.LastMessageAt DESC
        `);

      // Enhance with last message and unread count
      const enhancedConversations = await Promise.all(
        result.recordset.map(async (convo) => {
          const lastMessage = await this.getLastMessage(convo.ConversationID);
          const unreadCount = await this.getUnreadCount(convo.ConversationID, userID, userType);

          return {
            ...convo,
            lastMessage: lastMessage?.Content,
            lastMessageTimestamp: lastMessage?.Timestamp,
            unreadCount
          };
        })
      );

      return enhancedConversations;
    } catch (err) {
      console.error('SQL Get User Conversations Error:', err);
      return [];
    } finally {
      if (pool) pool.close();
    }
  }

  // Search all messages across user's conversations
  static async searchMessages(userID, userType, searchTerm) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      // Single Optimized Query: Matches conversation, snippets, and last message in one go
      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .input('userType', sql.NVarChar, userType)
        .input('searchTerm', sql.NVarChar, `%${searchTerm}%`)
        .query(`
          SELECT 
            c.ConversationID,
            c.Participant1ID, c.Participant1Type,
            c.Participant2ID, c.Participant2Type,
            c.CreatedAt, 
            c.LastMessageAt,
            -- Participant Details
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.Username
              WHEN c.Participant1Type = 'Admin' THEN a1.Username
              ELSE 'Unknown'
            END as Participant1Name,
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.Username
              WHEN c.Participant2Type = 'Admin' THEN a2.Username
              ELSE 'Unknown'
            END as Participant2Name,
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.ProfilePicture
              WHEN c.Participant1Type = 'Admin' THEN a1.ProfilePicture
              ELSE NULL
            END as Participant1ProfilePicture,
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.ProfilePicture
              WHEN c.Participant2Type = 'Admin' THEN a2.ProfilePicture
              ELSE NULL
            END as Participant2ProfilePicture,
            CASE 
              WHEN c.Participant1Type = 'User' THEN u1.IsOnline
              WHEN c.Participant1Type = 'Admin' THEN a1.IsOnline
              ELSE 0
            END as Participant1IsOnline,
            CASE 
              WHEN c.Participant2Type = 'User' THEN u2.IsOnline
              WHEN c.Participant2Type = 'Admin' THEN a2.IsOnline
              ELSE 0
            END as Participant2IsOnline,
            
            -- Matched Message Info (Specific content match)
            MatchedMsg.Content as MatchedContent,
            MatchedMsg.Timestamp as MatchedTimestamp,

            -- Last Message Info (Fallback if only username matched)
            LastMsg.Content as LastContent,
            LastMsg.Timestamp as LastTimestamp,

            -- Unread Count
            (SELECT COUNT(*) FROM Messages mUnread 
             WHERE mUnread.ConversationID = c.ConversationID 
               AND mUnread.IsRead = 0 
               AND (mUnread.SenderID != @userID OR mUnread.SenderType != @userType)
            ) as UnreadCount

          FROM Conversations c
          LEFT JOIN Users u1 ON c.Participant1Type = 'User' AND c.Participant1ID = u1.UserID
          LEFT JOIN Admins a1 ON c.Participant1Type = 'Admin' AND c.Participant1ID = a1.AdminID
          LEFT JOIN Users u2 ON c.Participant2Type = 'User' AND c.Participant2ID = u2.UserID
          LEFT JOIN Admins a2 ON c.Participant2Type = 'Admin' AND c.Participant2ID = a2.AdminID
          
          -- 1. Find the specific message that matches the search term
          OUTER APPLY (
            SELECT TOP 1 Content, Timestamp
            FROM Messages m
            WHERE m.ConversationID = c.ConversationID 
              AND m.Content LIKE @searchTerm
            ORDER BY m.Timestamp DESC
          ) as MatchedMsg

          -- 2. Find the absolute last message of the conversation
          OUTER APPLY (
            SELECT TOP 1 Content, Timestamp
            FROM Messages mLast
            WHERE mLast.ConversationID = c.ConversationID
            ORDER BY mLast.Timestamp DESC
          ) as LastMsg

          WHERE 
            -- User must be a participant
            ((c.Participant1ID = @userID AND c.Participant1Type = @userType)
             OR (c.Participant2ID = @userID AND c.Participant2Type = @userType)
             OR (@userType = 'Admin' AND (c.Participant1Type = 'Admin' OR c.Participant2Type = 'Admin')))
            AND (
              -- Search term must match something (Message OR Participant Name)
              MatchedMsg.Content IS NOT NULL
              OR u1.Username LIKE @searchTerm OR a1.Username LIKE @searchTerm 
              OR u2.Username LIKE @searchTerm OR a2.Username LIKE @searchTerm
            )
          ORDER BY COALESCE(MatchedMsg.Timestamp, LastMsg.Timestamp) DESC
        `);

      // 2. Enhance results with last message, unread count, and matching snippet (In-Memory Processing)
      const enhancedConversations = result.recordset.map(convo => {
        let displayMessage = 'No messages';
        let displayTimestamp = convo.LastTimestamp;
        let isSearchResult = false;

        // If we found a specific message match within content
        if (convo.MatchedContent) {
          displayTimestamp = convo.MatchedTimestamp;
          isSearchResult = true;

          // Smart Snippet Generation in Code
          const content = convo.MatchedContent;
          const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());

          if (index !== -1) {
            const start = Math.max(0, index - 30);
            const end = Math.min(content.length, index + searchTerm.length + 30);
            displayMessage = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
          } else {
            displayMessage = content;
          }
        } else {
          // Fallback: The search matched a participant name, so show the latest message
          displayMessage = convo.LastContent || 'No messages';
        }

        return {
          ConversationID: convo.ConversationID,
          Participant1ID: convo.Participant1ID,
          Participant1Type: convo.Participant1Type,
          Participant2ID: convo.Participant2ID,
          Participant2Type: convo.Participant2Type,
          Participant1Name: convo.Participant1Name,
          Participant2Name: convo.Participant2Name,
          Participant1ProfilePicture: convo.Participant1ProfilePicture,
          Participant2ProfilePicture: convo.Participant2ProfilePicture,
          Participant1IsOnline: convo.Participant1IsOnline,
          Participant2IsOnline: convo.Participant2IsOnline,
          lastMessage: displayMessage,
          lastMessageTimestamp: displayTimestamp,
          unreadCount: convo.UnreadCount,
          isSearchResult: isSearchResult
        };
      });

      return enhancedConversations;
    } catch (err) {
      console.error('SQL Search Messages Error:', err);
      return [];
    } finally {
      if (pool) pool.close();
    }
  }

  // Get last message in a conversation
  static async getLastMessage(conversationID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .query(`
          SELECT TOP 1 Content, Timestamp
          FROM Messages 
          WHERE ConversationID = @conversationID 
          ORDER BY Timestamp DESC
        `);

      return result.recordset[0] || null;
    } catch (err) {
      console.error('SQL Get Last Message Error:', err);
      return null;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get unread message count for a conversation
  static async getUnreadCount(conversationID, userID, userType) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('conversationID', sql.Int, conversationID)
        .input('userID', sql.Int, userID)
        .input('userType', sql.NVarChar, userType)
        .query(`
          SELECT COUNT(*) as UnreadCount
          FROM Messages 
          WHERE ConversationID = @conversationID 
            AND SenderID != @userID 
            AND SenderType != @userType
            AND IsRead = 0
        `);

      return result.recordset[0].UnreadCount;
    } catch (err) {
      console.error('SQL Get Unread Count Error:', err);
      return 0;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get all users (for starting new conversations)
  static async getUsers(userType) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';

      const result = await pool.request()
        .query(`
          SELECT 
            ${idField} as ID,
            Username,
            ProfilePicture,
            IsOnline,
            LastSeen
          FROM ${tableName}
          ORDER BY Username
        `);

      return result.recordset.map(user => ({
        [userType === 'Admin' ? 'AdminID' : 'UserID']: user.ID,
        Username: user.Username,
        ProfilePicture: user.ProfilePicture,
        IsOnline: user.IsOnline,
        LastSeen: user.LastSeen
      }));
    } catch (err) {
      console.error('SQL Get Users Error:', err);
      return [];
    } finally {
      if (pool) pool.close();
    }
  }

  // Get online users
  static async getOnlineUsers() {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const usersResult = await pool.request()
        .query(`
          SELECT 
            UserID as ID,
            'User' as Type,
            Username as Name,
            ProfilePicture,
            IsOnline
          FROM Users 
          WHERE IsOnline = 1
          UNION ALL
          SELECT 
            AdminID as ID,
            'Admin' as Type,
            Username as Name,
            ProfilePicture,
            IsOnline
          FROM Admins 
          WHERE IsOnline = 1
        `);

      return usersResult.recordset.map(user => ({
        userID: user.ID,
        userType: user.Type,
        username: user.Name,
        profilePicture: user.ProfilePicture,
        isOnline: user.IsOnline
      }));
    } catch (err) {
      console.error('SQL Get Online Users Error:', err);
      return [];
    } finally {
      if (pool) pool.close();
    }
  }
}

module.exports = Message;