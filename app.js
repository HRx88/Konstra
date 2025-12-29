// ========== Packages ==========
// Initialising dotenv
require("dotenv").config();
// Initialising express
const express = require("express");
// Initialising path
const path = require("path");
// Body Parser
const bodyParser = require("body-parser");
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require("./routes/message.routes");
const documentRoutes = require('./routes/document.routes');
const MeetingRoutes = require('./routes/meeting.routes');
const paymentRoutes = require('./routes/payment.routes');
const programRoutes = require('./routes/program.routes');
const credentialRoutes = require('./routes/credential.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const ngoStatsRoutes = require('./routes/ngoStats.routes');
// ========== WebSocket Server ==========
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/message");

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

    // Join admins to a special room for group visibility
    if (data.userType === 'Admin') {
      socket.join('admins');
      console.log(`[WS] Admin ${data.userID} joined 'admins' room`);
    }

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

      // --- Broadcast logic for "One User to Many Admins" ---
      const isAdminInvolved = msg.senderType === 'Admin' || recipientType === 'Admin';
      const senderSocketID = onlineUsers.get(`${msg.senderID}-${msg.senderType}`);
      const recipientSocketID = onlineUsers.get(`${recipientID}-${recipientType}`);

      // Broadcast to Admins
      if (isAdminInvolved) {
        io.to("admins").emit("receiveMessage", messageWithSender);
      }

      // Send to User Participant (if not already handled by admins room)
      if (recipientType === 'User' && recipientSocketID) {
        io.to(recipientSocketID).emit("receiveMessage", messageWithSender);
      }
      if (msg.senderType === 'User' && senderSocketID) {
        io.to(senderSocketID).emit("receiveMessage", messageWithSender);
      }

      // --- Conversation Updates ---
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

      if (isAdminInvolved) {
        io.to("admins").emit("conversationUpdated", conversationUpdate);
      }
      if (recipientType === 'User' && recipientSocketID) {
        io.to(recipientSocketID).emit("conversationUpdated", conversationUpdate);
      }
      if (msg.senderType === 'User' && senderSocketID) {
        io.to(senderSocketID).emit("conversationUpdated", conversationUpdate);
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

      const isAdminInvolved = userType === 'Admin' || senderType === 'Admin';

      if (isAdminInvolved) {
        io.to("admins").emit("updateReadReceipts", {
          conversationID,
          senderID: userID,
        });
      }

      if (senderType === 'User') {
        const senderSocketID = onlineUsers.get(`${senderID}-${senderType}`);
        if (senderSocketID) {
          io.to(senderSocketID).emit("updateReadReceipts", {
            conversationID,
            senderID: userID,
          });
        }
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

      // Broadcast to admins if involved
      if (conversation.Participant1Type === 'Admin' || conversation.Participant2Type === 'Admin') {
        io.to("admins").emit("newConversation", conversation);
      }

      // Specific notification for User participant (if not already handled)
      if (conversation.Participant1Type === 'User' && participant1Socket) {
        io.to(participant1Socket).emit("newConversation", conversation);
      }
      if (conversation.Participant2Type === 'User' && participant2Socket) {
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
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(passport.initialize());

// ========== Routes ==========

app.use("/api/documents", documentRoutes);
app.use("/api/message", chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', MeetingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/ngo-stats', ngoStatsRoutes);

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