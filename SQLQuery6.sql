-- =============================================
-- 1. DROP EXISTING TABLES (In Correct Order)
-- =============================================

-- Drop tables that depend on others first
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Enrollments;
DROP TABLE IF EXISTS Credentials;
DROP TABLE IF EXISTS NGOProjectStats;
DROP TABLE IF EXISTS Documents;
DROP TABLE IF EXISTS Meetings;
DROP TABLE IF EXISTS ProgramSlots;

-- Drop middle-tier tables
DROP TABLE IF EXISTS Conversations;
DROP TABLE IF EXISTS Programs;

-- Drop base tables
DROP TABLE IF EXISTS Admins;
DROP TABLE IF EXISTS Users;
GO

-- =============================================
-- 2. CREATE BASE TABLES (Users & Admins)
-- =============================================

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    ProfilePicture NVARCHAR(MAX) NULL,
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
    ProfilePicture NVARCHAR(MAX) NULL,
    Role NVARCHAR(20) DEFAULT 'Admin',
    Permissions NVARCHAR(MAX) NULL,
    IsOnline BIT DEFAULT 0,
    LastSeen DATETIME DEFAULT GETDATE(),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- 3. CREATE FEATURE TABLES
-- =============================================

-- Programs Table
CREATE TABLE Programs (
    ProgramID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(255) NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- 'Education' or 'Trip'
    Description NVARCHAR(MAX),
    ImageURL NVARCHAR(500),
    Price DECIMAL(10, 2) NOT NULL,
    Location NVARCHAR(255),
    Duration NVARCHAR(100),
    MaxParticipants INT NOT NULL,
    EnrolledCount INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CertifierGroupID NVARCHAR(100) NULL, -- Added directly here
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Program Slots (Must exist before Enrollments links to it)
CREATE TABLE ProgramSlots (
    SlotID INT IDENTITY(1,1) PRIMARY KEY,
    ProgramID INT NOT NULL,
    StartTime DATETIME NOT NULL,
    EndTime DATETIME NOT NULL,
    Capacity INT DEFAULT 20,
    BookedCount INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    FOREIGN KEY (ProgramID) REFERENCES Programs(ProgramID)
);

-- Enrollments Table
CREATE TABLE Enrollments (
    EnrollmentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ProgramID INT NOT NULL,
    SlotID INT NULL, -- Linked to ProgramSlots
    Status NVARCHAR(20) DEFAULT 'Enrolled',
    Progress INT DEFAULT 0,
    EnrollmentDate DATETIME DEFAULT GETDATE(),
    CompletionDate DATETIME NULL,
    Details NVARCHAR(MAX) NULL, -- JSON Details
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ProgramID) REFERENCES Programs(ProgramID),
    FOREIGN KEY (SlotID) REFERENCES ProgramSlots(SlotID)
);

-- Credentials Table
CREATE TABLE Credentials (
    CredentialID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ProgramID INT NOT NULL,
    CertifierCredentialID NVARCHAR(255) NOT NULL,
    PublicURL NVARCHAR(MAX) NOT NULL,
    PdfURL NVARCHAR(MAX), 
    ImageURL NVARCHAR(MAX),
    Type NVARCHAR(50) DEFAULT 'Certificate',
    IssuedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ProgramID) REFERENCES Programs(ProgramID)
);

-- NGO Stats Table
CREATE TABLE NGOProjectStats (
    StatID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    TotalFunding DECIMAL(18, 2) DEFAULT 0,
    HousesBuilt INT DEFAULT 0,
    Progress INT DEFAULT 0,
    HomesCompleted INT DEFAULT 0,
    ConstructionInProgress INT DEFAULT 0,
    ImpactedFamilies INT DEFAULT 0,
    CO2Saved INT DEFAULT 0,
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_NGOStats_User FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Documents Table
CREATE TABLE Documents (
    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL, -- Made NULLable if uploaded by Admin only
    AdminID INT NULL, -- Made NULLable if uploaded by User only
    FileName NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(50) NOT NULL,
    FileSize BIGINT NOT NULL,
    FilePath NVARCHAR(500) NOT NULL,
    UploadDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (AdminID) REFERENCES Admins(AdminID)
);

-- Meetings Table
CREATE TABLE Meetings (
    MeetingID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    EventName NVARCHAR(255) NOT NULL,
    StartTime DATETIME NOT NULL,
    EndTime DATETIME NOT NULL,
    MeetingType NVARCHAR(50) NOT NULL,
    HostRoomURL NVARCHAR(500) NULL,
    ParticipantURL NVARCHAR(500) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Meetings_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- =============================================
-- 4. CREATE CHAT SYSTEM (Conversations & Messages)
-- =============================================

CREATE TABLE Conversations (
    ConversationID INT IDENTITY(1,1) PRIMARY KEY,
    Participant1ID INT NOT NULL,
    Participant1Type NVARCHAR(10) NOT NULL, -- 'User' or 'Admin'
    Participant2ID INT NOT NULL,
    Participant2Type NVARCHAR(10) NOT NULL, -- 'User' or 'Admin'
    CreatedAt DATETIME DEFAULT GETDATE(),
    LastMessageAt DATETIME DEFAULT GETDATE()
);

-- Index for finding conversations quickly
CREATE INDEX IX_Conversations_Participants ON Conversations (Participant1ID, Participant1Type, Participant2ID, Participant2Type);
CREATE INDEX IX_Conversations_LastMessageAt ON Conversations (LastMessageAt DESC);

CREATE TABLE Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    ConversationID INT NOT NULL,
    SenderID INT NOT NULL,
    SenderType NVARCHAR(10) NOT NULL, -- 'User' or 'Admin'
    Content NVARCHAR(MAX) NOT NULL,
    MessageType NVARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
    IsRead BIT DEFAULT 0,
    ReadAt DATETIME NULL,
    Timestamp DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Messages_Conversations FOREIGN KEY (ConversationID) 
        REFERENCES Conversations(ConversationID) ON DELETE CASCADE
);

-- Indexes for Messages
CREATE INDEX IX_Messages_Thread_Load ON Messages (ConversationID, Timestamp ASC);
CREATE INDEX IX_Messages_Unread_Badge ON Messages (IsRead) INCLUDE (ConversationID, SenderID, SenderType);
CREATE INDEX IX_Messages_Recent_Activity ON Messages (Timestamp DESC);
GO

-- =============================================
-- 5. SEED DATA (Inserts)
-- =============================================

-- 1. Insert Users
INSERT INTO Users (Username, Email, Password, ProfilePicture, IsOnline, LastSeen, CreatedAt) VALUES 
('john_doe', 'john@example.com', 'hashed_password_123', '/images/john.jpg', 1, GETDATE(), DATEADD(day, -30, GETDATE())),
('alice_smith', 'alice@example.com', 'hashed_password_456', '/images/alice.jpg', 0, DATEADD(hour, -2, GETDATE()), DATEADD(day, -25, GETDATE())),
('bob_wilson', 'bob@example.com', 'hashed_password_789', '/images/bob.jpg', 1, GETDATE(), DATEADD(day, -20, GETDATE())),
('sara_jones', 'sara@example.com', 'hashed_password_101', '/images/sara.jpg', 0, DATEADD(day, -1, GETDATE()), DATEADD(day, -15, GETDATE()));

-- 2. Insert Admins
INSERT INTO Admins (Username, Email, Password, ProfilePicture, Permissions, IsOnline, LastSeen, CreatedAt) VALUES 
('admin_mike', 'mike@admin.com', 'hashed_admin_password', 'https://i.pravatar.cc/150?img=6', '{"can_manage_users": true}', 1, GETDATE(), DATEADD(day, -60, GETDATE())),
('admin_lisa', 'lisa@admin.com', 'hashed_admin_password2', '/images/admin_lisa.jpg', '{"can_manage_users": true}', 0, DATEADD(hour, -5, GETDATE()), DATEADD(day, -45, GETDATE()));

-- 3. Insert Programs
INSERT INTO Programs (Title, Type, Description, ImageURL, Price, Location, Duration, MaxParticipants, EnrolledCount, IsActive, CertifierGroupID) VALUES 
('Full Stack Web Development', 'Education', 'Master the MERN stack.', 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613', 499.00, 'Online', '8 Weeks', 50, 12, 1, 'group_01h8zx9'),
('Wilderness Photography Expedition', 'Trip', '3-day guided photography tour.', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e', 250.00, 'Yosemite National Park', '3 Days', 15, 15, 1, 'group_01h9ab2'),
('Corporate Leadership Masterclass', 'Education', 'Learn essential management strategies.', 'https://images.unsplash.com/photo-1552664730-d307ca884978', 199.00, 'Downtown', '1 Day', 30, 5, 1, 'group_01h7xy1');

-- 4. Insert Program Slots
INSERT INTO ProgramSlots (ProgramID, StartTime, EndTime, Capacity, BookedCount) VALUES 
(1, '2026-02-10 10:00:00', '2026-02-10 12:00:00', 20, 0),
(1, '2026-02-12 14:00:00', '2026-02-12 16:00:00', 20, 0);

-- 5. Insert Enrollments
INSERT INTO Enrollments (UserID, ProgramID, Status, Progress, EnrollmentDate, CompletionDate) VALUES 
(1, 1, 'Completed', 100, DATEADD(month, -2, GETDATE()), DATEADD(day, -5, GETDATE())),
(1, 3, 'Enrolled', 15, GETDATE(), NULL),
(2, 2, 'Completed', 100, DATEADD(month, -1, GETDATE()), DATEADD(month, -1, GETDATE()));

-- 6. Insert NGO Users & Stats
INSERT INTO Users (Username, Email, Password, Role, CreatedAt) VALUES 
('GreenEarth Foundation', 'info@greenearth.ngo', 'hash_pass', 'NGO', GETDATE()),
('Habitat for Humanity', 'contact@habitat.ngo', 'hash_pass', 'NGO', GETDATE());

-- We need to get the UserIDs for the NGOs we just created to insert their stats
DECLARE @GreenID INT = (SELECT UserID FROM Users WHERE Email = 'info@greenearth.ngo');
DECLARE @HabitatID INT = (SELECT UserID FROM Users WHERE Email = 'contact@habitat.ngo');

INSERT INTO NGOProjectStats (UserID, TotalFunding, HousesBuilt, Progress, HomesCompleted, ConstructionInProgress, ImpactedFamilies, CO2Saved) VALUES 
(@GreenID, 50000.00, 30, 45, 12, 18, 120, 5000),
(@HabitatID, 120000.00, 150, 80, 120, 30, 450, 12000);

-- =============================================
-- 6. SEED CHAT DATA (Fixed Logic)
-- =============================================

-- Create Conversations first to generate IDs
INSERT INTO Conversations (Participant1ID, Participant1Type, Participant2ID, Participant2Type, CreatedAt, LastMessageAt) VALUES 
(1, 'User', 1, 'Admin', DATEADD(day, -10, GETDATE()), DATEADD(hour, -1, GETDATE())), -- ConversationID 1
(2, 'User', 1, 'Admin', DATEADD(day, -5, GETDATE()), DATEADD(minute, -30, GETDATE())), -- ConversationID 2
(1, 'User', 2, 'User', DATEADD(day, -3, GETDATE()), DATEADD(hour, -2, GETDATE()));   -- ConversationID 3

-- Insert Messages mapped to valid ConversationIDs
INSERT INTO Messages (ConversationID, SenderID, SenderType, Content, MessageType, IsRead, Timestamp) VALUES 
-- Chat 1: User 1 vs Admin 1
(1, 1, 'User', 'Hello, I need help with my account', 'text', 1, DATEADD(minute, -58, GETDATE())),
(1, 1, 'Admin', 'Hi John! How can I assist you today?', 'text', 1, DATEADD(minute, -55, GETDATE())),
(1, 1, 'User', 'I cannot login to my account', 'text', 1, DATEADD(minute, -52, GETDATE())),

-- Chat 2: User 2 vs Admin 1
(2, 2, 'User', 'Is the service down?', 'text', 1, DATEADD(minute, -32, GETDATE())),
(2, 1, 'Admin', 'No, everything is running smoothly.', 'text', 1, DATEADD(minute, -25, GETDATE())),

-- Chat 3: User 1 vs User 2 (Private)
(3, 1, 'User', 'Hey Alice, how are you?', 'text', 1, DATEADD(minute, -120, GETDATE())),
(3, 2, 'User', 'Hi John! I am good, thanks.', 'text', 1, DATEADD(minute, -115, GETDATE()));
GO

-- Updates from HR
-- 1. Create the Modules Table first
CREATE TABLE ProgramModules (

    ModuleID INT PRIMARY KEY IDENTITY(1,1),

    ProgramID INT NOT NULL,

    Title NVARCHAR(255) NOT NULL,

    Description NVARCHAR(MAX),

    ContentURL NVARCHAR(MAX), 

    ContentType NVARCHAR(50) NOT NULL CHECK (ContentType IN ('video', 'pdf', 'article', 'quiz')),

    OrderIndex INT NOT NULL,

    CreatedAt DATETIME DEFAULT GETDATE(),

    

    FOREIGN KEY (ProgramID) REFERENCES Programs(ProgramID) ON DELETE CASCADE

);-- 2. Create the Progress Table
CREATE TABLE UserModuleProgress (

    ProgressID INT PRIMARY KEY IDENTITY(1,1),

    EnrollmentID INT NOT NULL,

    ModuleID INT NOT NULL,

    CompletedAt DATETIME DEFAULT GETDATE(),

    

    FOREIGN KEY (EnrollmentID) REFERENCES Enrollments(EnrollmentID) ON DELETE CASCADE,

    FOREIGN KEY (ModuleID) REFERENCES ProgramModules(ModuleID),

    

    CONSTRAINT UQ_User_Module_Progress UNIQUE(EnrollmentID, ModuleID)

);