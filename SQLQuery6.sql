-- 1. Drop existing tables if you want a clean slate (Optional - BE CAREFUL)
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Conversations;
DROP TABLE IF EXISTS Admins;
DROP TABLE IF EXISTS Users;
-- 2. Create Users and Admins (No changes here, just for context)
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    ProfilePicture NVARCHAR(255) NULL,
    Role NVARCHAR(20) DEFAULT 'User',
    IsOnline BIT DEFAULT 0,
    LastSeen DATETIME DEFAULT GETDATE(),
    CreatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE Admins (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    ProfilePicture NVARCHAR(255) NULL,
    Role NVARCHAR(20) DEFAULT 'Admin',
    Permissions NVARCHAR(MAX) NULL,
    IsOnline BIT DEFAULT 0,
    LastSeen DATETIME DEFAULT GETDATE(),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 3. Conversations Table (Updated Indexes)
CREATE TABLE Conversations (
    ConversationID INT IDENTITY(1,1) PRIMARY KEY,
    Participant1ID INT NOT NULL,
    Participant1Type NVARCHAR(10) NOT NULL, -- 'User' or 'Admin'
    Participant2ID INT NOT NULL,
    Participant2Type NVARCHAR(10) NOT NULL, -- 'User' or 'Admin'
    CreatedAt DATETIME DEFAULT GETDATE(),
    LastMessageAt DATETIME DEFAULT GETDATE()
);

-- Index for fast lookup of chats
CREATE INDEX IX_Conversations_Participants ON Conversations (Participant1ID, Participant1Type, Participant2ID, Participant2Type);

-- 4. Messages Table (UPDATED: Room is now ConversationID INT)
CREATE TABLE Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL,
    SenderType NVARCHAR(10) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    ConversationID INT NOT NULL, -- Changed from 'Room' to ConversationID
    MessageType NVARCHAR(20) DEFAULT 'text',
    IsRead BIT DEFAULT 0,
    ReadAt DATETIME NULL,
    Timestamp DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Messages_Conversations FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID)
);

CREATE INDEX IX_Messages_Conversation ON Messages (ConversationID);
CREATE INDEX IX_Messages_Timestamp ON Messages (Timestamp);

-- Insert dummy Users
INSERT INTO Users (Username, Email, Password, ProfilePicture, IsOnline, LastSeen, CreatedAt) 
VALUES 
('john_doe', 'john@example.com', 'hashed_password_123', 'https://example.com/avatars/john.jpg', 1, GETDATE(), DATEADD(day, -30, GETDATE())),
('sarah_smith', 'sarah@example.com', 'hashed_password_456', 'https://example.com/avatars/sarah.jpg', 0, DATEADD(hour, -2, GETDATE()), DATEADD(day, -25, GETDATE())),
('mike_wilson', 'mike@example.com', 'hashed_password_789', NULL, 1, GETDATE(), DATEADD(day, -20, GETDATE())),
('emma_jones', 'emma@example.com', 'hashed_password_101', 'https://example.com/avatars/emma.jpg', 0, DATEADD(day, -1, GETDATE()), DATEADD(day, -15, GETDATE()));

-- Insert dummy Admins
INSERT INTO Admins (Username, Email, Password, ProfilePicture, Permissions, IsOnline, LastSeen, CreatedAt)
VALUES 
('admin_alex', 'alex@admin.com', 'hashed_admin_pass_123', 'https://example.com/avatars/alex.jpg', 'full_access', 1, GETDATE(), DATEADD(day, -60, GETDATE())),
('admin_lisa', 'lisa@admin.com', 'hashed_admin_pass_456', NULL, 'support_access', 0, DATEADD(hour, -5, GETDATE()), DATEADD(day, -45, GETDATE()));