// ========== Packages ==========
// Initialising dotenv
require("dotenv").config();
// Initialising express
const express = require("express");
// Initialising path
const path = require("path");
// Body Parser
const bodyParser = require("body-parser");
const authRoutes = require('./routes/authRoutes');
// ========== WebSocket Server ==========
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/message");
const User = require("./models/user");
// ========== Set-Up ==========
// Initiating app
const app = express();
const PORT = process.env.PORT || 8000;

// Set up HTTP and WebSocket servers
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (update as needed for security)
    methods: ["GET", "POST"],
  },
});

// ========== Socket.io Logic ==========
// Store active users
const onlineUsers = new Map();

// WebSocket Handling
io.on("connection", (socket) => {
  console.log(`[WS] New client connected: ${socket.id}`);

  socket.on("userOnline", async (data) => {
    console.log(`[WS] User Online: ${data.userID} (${data.userType})`);

    // Store the user with their ID + Type to prevent conflicts
    onlineUsers.set(`${data.userID}-${data.userType}`, socket.id);

    // Update user online status in database
    await Message.userOnline(data.userID, data.userType);

    // Broadcast updated online users
    io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("disconnect", async () => {
    const userEntry = [...onlineUsers.entries()].find(
      ([_, id]) => id === socket.id
    );

    if (userEntry) {
      const userKey = userEntry[0];
      onlineUsers.delete(userKey);

      console.log(`[WS] User Offline: ${userKey}`);

      const [userID, userType] = userKey.split("-");
      await Message.userOffline(userID, userType);

      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    }
  });

  socket.on("sendMessage", async (msg) => {
    console.log(`[WS] Message from ${msg.senderID} (${msg.senderType}): ${msg.content}`);

    try {
      // Save message to database
      const savedMessage = await Message.sendMessage(
        msg.conversationID,
        msg.senderID,
        msg.senderType,
        msg.content
      );

      console.log("[WS] Message saved:", savedMessage);

      // Fetch conversation details with participant names
      const conversation = await Message.getConversationById(msg.conversationID);
      if (!conversation) {
        console.error(`[WS] Conversation ${msg.conversationID} not found.`);
        return;
      }

      // Determine recipient using both ID and Type
      const isSenderParticipant1 = 
        msg.senderID === conversation.Participant1ID && 
        msg.senderType === conversation.Participant1Type;

      const recipientID = isSenderParticipant1 
        ? conversation.Participant2ID 
        : conversation.Participant1ID;

      const recipientType = isSenderParticipant1 
        ? conversation.Participant2Type 
        : conversation.Participant1Type;

      console.log(`[WS] Determined recipient: ${recipientID} (${recipientType})`);

      // Prepare message data with sender name
      const messageWithSender = {
        ...savedMessage,
        senderName: isSenderParticipant1 ? conversation.Participant1Name : conversation.Participant2Name
      };

      // Send message to recipient if online
      const recipientSocketID = onlineUsers.get(`${recipientID}-${recipientType}`);
      if (recipientSocketID) {
        console.log(`[WS] Sending message to recipient: ${recipientID} (${recipientType})`);
        io.to(recipientSocketID).emit("receiveMessage", messageWithSender);
      } else {
        console.log(`[WS] Recipient ${recipientID} (${recipientType}) is offline.`);
      }

      // Send the message back to the sender to confirm delivery (with sender name)
      const senderSocketID = onlineUsers.get(`${msg.senderID}-${msg.senderType}`);
      if (senderSocketID) {
        io.to(senderSocketID).emit("receiveMessage", messageWithSender);
      }

      // Broadcast conversation update to both participants
      const conversationUpdate = {
        conversationID: msg.conversationID,
        lastMessage: savedMessage.content,
        lastMessageTimestamp: savedMessage.timestamp,
        participant1ID: conversation.Participant1ID,
        participant1Type: conversation.Participant1Type,
        participant2ID: conversation.Participant2ID,
        participant2Type: conversation.Participant2Type,
        participant1Name: conversation.Participant1Name,
        participant2Name: conversation.Participant2Name
      };

      if (senderSocketID) {
        io.to(senderSocketID).emit("conversationUpdated", conversationUpdate);
      }
      if (recipientSocketID) {
        io.to(recipientSocketID).emit("conversationUpdated", conversationUpdate);
      }

    } catch (error) {
      console.error("[WS] Error sending message:", error);
    }
  });

  socket.on("messagesRead", async ({ conversationID, userID, userType }) => {
    try {
      console.log(`[WS] Received 'messagesRead' for conversation ${conversationID} from user ${userID} (${userType})`);

      // Call database function - Only mark unread messages
      const result = await Message.markMessagesAsRead(conversationID, userID, userType);

      console.log(`[DB DEBUG] Mark as read result:`, result);

      // Only proceed if the operation was successful AND we actually have messages
      if (!result.success) {
        console.error(`[WS ERROR] Failed to mark messages as read in DB.`);
        return;
      }

      // If no messages were affected (either no messages or already read), that's fine
      if (result.rowsAffected === 0) {
        console.log(`[WS] No unread messages to mark as read for conversation ${conversationID}`);
        return;
      }

      console.log(`[WS] Successfully marked ${result.rowsAffected} messages as read for conversation ${conversationID}`);

      // Notify sender only if we actually marked messages as read
      const conversation = await Message.getConversationById(conversationID);
      if (!conversation) {
        console.error(`[WS ERROR] Conversation ${conversationID} not found.`);
        return;
      }

      const senderID = conversation.Participant1ID === userID ? conversation.Participant2ID : conversation.Participant1ID;
      const senderType = conversation.Participant1Type === userType ? conversation.Participant2Type : conversation.Participant1Type;

      const senderSocketID = onlineUsers.get(`${senderID}-${senderType}`);
      if (senderSocketID) {
        console.log(`[WS] Notifying sender ${senderID} (${senderType}) that messages were read`);
        io.to(senderSocketID).emit("updateReadReceipts", {
          conversationID,
          senderID: userID,
        });
      } else {
        console.log(`[WS] Sender ${senderID} (${senderType}) is offline.`);
      }
    } catch (error) {
      console.error("[WS ERROR] Error updating read receipts:", error);
    }
  });

  // New conversation created event
  socket.on("newConversationCreated", async (data) => {
    try {
      const { conversationID, userID, userType } = data;
      
      // Notify both participants about the new conversation
      const conversation = await Message.getConversationById(conversationID);
      if (!conversation) return;

      const participant1Socket = onlineUsers.get(`${conversation.Participant1ID}-${conversation.Participant1Type}`);
      const participant2Socket = onlineUsers.get(`${conversation.Participant2ID}-${conversation.Participant2Type}`);

      if (participant1Socket) {
        io.to(participant1Socket).emit("newConversation", conversation);
      }
      if (participant2Socket) {
        io.to(participant2Socket).emit("newConversation", conversation);
      }
    } catch (error) {
      console.error("[WS ERROR] Error handling new conversation:", error);
    }
  });
});



// ========== Middleware ==========
// Using Static Public
app.use(express.static(path.join(__dirname, "public")));

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ========== Routes ==========

const chatRoutes = require("./controllers/message.routes");
app.use("/api/message", chatRoutes);
app.use('/api/auth', authRoutes);
// ========== Initialise Server ==========
// Server Listening at port 8000
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Press CTRL+C to stop the server.");
});
// Close the connection pool on SIGINT signal
process.on("SIGINT", async () => {
  process.exit(0); // Exit with code 0 indicating successful shutdown
});

process.on("uncaughtException", (err) => {
  console.error("[ERROR] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[ERROR] Unhandled Rejection:", reason);
});