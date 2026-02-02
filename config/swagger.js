const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Konstra API Documentation',
            version: '1.0.0',
            description: `
## Konstra Educational Platform API

A comprehensive REST API for the Konstra Learning Management System.

### Features
- **Authentication** - JWT-based user authentication with Google OAuth support
- **Programs & Modules** - Course management with hierarchical structure
- **Enrollments** - User enrollment and progress tracking
- **Payments** - Stripe integration for secure payments
- **Real-time Messaging** - Socket.io powered chat system
- **Documents** - File upload and review workflow
- **Credentials** - Digital certificate management

### Authentication
Most endpoints require a JWT token passed in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

Obtain a token by calling the login endpoint.
            `,
            contact: {
                name: 'Konstra Support',
                email: 'support@konstra.com'
            },
            license: {
                name: 'ISC',
                url: 'https://opensource.org/licenses/ISC'
            }
        },
        servers: [
            {
                url: 'http://localhost:8000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token'
                }
            },
            schemas: {
                // User schemas
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        userType: { type: 'string', enum: ['User', 'Admin', 'NGO'], example: 'User' },
                        phone: { type: 'string', example: '+1234567890' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password', 'name'],
                    properties: {
                        username: { type: 'string', example: 'johndoe' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        password: { type: 'string', minLength: 6, example: 'password123' },
                        name: { type: 'string', example: 'John Doe' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        password: { type: 'string', example: 'password123' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },
                // Program schemas
                Program: {
                    type: 'object',
                    properties: {
                        ProgramID: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Web Development Bootcamp' },
                        description: { type: 'string', example: 'Learn full-stack web development' },
                        programType: { type: 'string', enum: ['Course', 'Workshop', 'Immersive Trip', 'Live Online Training'], example: 'Course' },
                        price: { type: 'number', format: 'float', example: 299.99 },
                        duration: { type: 'string', example: '8 weeks' },
                        isActive: { type: 'boolean', example: true },
                        parentProgramId: { type: 'integer', nullable: true, example: null },
                        imageUrl: { type: 'string', example: '/uploads/programs/web-dev.jpg' }
                    }
                },
                CreateProgramRequest: {
                    type: 'object',
                    required: ['name', 'description', 'programType', 'price'],
                    properties: {
                        name: { type: 'string', example: 'Web Development' },
                        description: { type: 'string', example: 'Learn web development' },
                        programType: { type: 'string', example: 'Course' },
                        price: { type: 'number', example: 99.99 },
                        duration: { type: 'string', example: '8 weeks' },
                        isActive: { type: 'boolean', example: true },
                        parentProgramId: { type: 'integer', nullable: true }
                    }
                },
                // Module schemas
                Module: {
                    type: 'object',
                    properties: {
                        ModuleID: { type: 'integer', example: 1 },
                        ProgramID: { type: 'integer', example: 1 },
                        title: { type: 'string', example: 'Introduction to HTML' },
                        description: { type: 'string', example: 'Learn the basics of HTML' },
                        contentType: { type: 'string', enum: ['video', 'pdf', 'image'], example: 'video' },
                        contentUrl: { type: 'string', example: '/uploads/modules/intro.mp4' },
                        moduleOrder: { type: 'integer', example: 1 },
                        duration: { type: 'integer', example: 30, description: 'Duration in minutes' }
                    }
                },
                // Enrollment schemas
                Enrollment: {
                    type: 'object',
                    properties: {
                        EnrollmentID: { type: 'integer', example: 1 },
                        UserID: { type: 'integer', example: 1 },
                        ProgramID: { type: 'integer', example: 1 },
                        enrollmentDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['active', 'completed', 'cancelled'], example: 'active' },
                        progress: { type: 'number', format: 'float', example: 45.5 }
                    }
                },
                // Payment schemas
                CreateCheckoutRequest: {
                    type: 'object',
                    required: ['programId'],
                    properties: {
                        programId: { type: 'integer', example: 1 },
                        slotId: { type: 'integer', example: 1 },
                        childProgramIds: { type: 'array', items: { type: 'integer' }, example: [2, 3] },
                        discountCode: { type: 'string', example: 'SAVE10' }
                    }
                },
                CheckoutResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        sessionId: { type: 'string', example: 'cs_test_a1b2c3d4...' }
                    }
                },
                // Discount schemas
                Discount: {
                    type: 'object',
                    properties: {
                        DiscountID: { type: 'integer', example: 1 },
                        code: { type: 'string', example: 'SUMMER2024' },
                        discountType: { type: 'string', enum: ['percentage', 'fixed'], example: 'percentage' },
                        discountValue: { type: 'number', example: 20 },
                        expiryDate: { type: 'string', format: 'date', example: '2024-12-31' },
                        usageLimit: { type: 'integer', example: 100 },
                        usageCount: { type: 'integer', example: 25 },
                        isActive: { type: 'boolean', example: true }
                    }
                },
                // Message schemas
                Conversation: {
                    type: 'object',
                    properties: {
                        ConversationID: { type: 'integer', example: 1 },
                        Participant1ID: { type: 'integer', example: 1 },
                        Participant1Type: { type: 'string', example: 'User' },
                        Participant1Name: { type: 'string', example: 'John Doe' },
                        Participant2ID: { type: 'integer', example: 1 },
                        Participant2Type: { type: 'string', example: 'Admin' },
                        Participant2Name: { type: 'string', example: 'Admin User' },
                        lastMessage: { type: 'string', example: 'Hello!' },
                        lastMessageTimestamp: { type: 'string', format: 'date-time' }
                    }
                },
                Message: {
                    type: 'object',
                    properties: {
                        MessageID: { type: 'integer', example: 1 },
                        ConversationID: { type: 'integer', example: 1 },
                        SenderID: { type: 'integer', example: 1 },
                        SenderType: { type: 'string', example: 'User' },
                        content: { type: 'string', example: 'Hello, I have a question.' },
                        timestamp: { type: 'string', format: 'date-time' },
                        isRead: { type: 'boolean', example: false }
                    }
                },
                // Meeting schemas
                Meeting: {
                    type: 'object',
                    properties: {
                        MeetingID: { type: 'integer', example: 1 },
                        UserID: { type: 'integer', example: 1 },
                        UserType: { type: 'string', example: 'User' },
                        meetingType: { type: 'string', example: 'Consultation' },
                        meetingLink: { type: 'string', example: 'https://meet.google.com/xxx' },
                        scheduledDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled'], example: 'scheduled' }
                    }
                },
                // Document schemas
                Document: {
                    type: 'object',
                    properties: {
                        DocumentID: { type: 'integer', example: 1 },
                        UserID: { type: 'integer', example: 1 },
                        title: { type: 'string', example: 'Assignment 1' },
                        description: { type: 'string', example: 'My first assignment submission' },
                        filePath: { type: 'string', example: '/uploads/doc123.pdf' },
                        status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'pending' },
                        uploadedAt: { type: 'string', format: 'date-time' }
                    }
                },
                // Announcement schemas
                Announcement: {
                    type: 'object',
                    properties: {
                        AnnouncementID: { type: 'integer', example: 1 },
                        title: { type: 'string', example: 'New Course Available!' },
                        content: { type: 'string', example: 'Check out our new web development course.' },
                        type: { type: 'string', enum: ['info', 'warning', 'success'], example: 'info' },
                        createdAt: { type: 'string', format: 'date-time' },
                        isActive: { type: 'boolean', example: true }
                    }
                },
                // Credential schemas
                Credential: {
                    type: 'object',
                    properties: {
                        CredentialID: { type: 'integer', example: 1 },
                        UserID: { type: 'integer', example: 1 },
                        EnrollmentID: { type: 'integer', example: 1 },
                        credentialUrl: { type: 'string', example: 'https://certifier.io/xxx' },
                        issuedAt: { type: 'string', format: 'date-time' }
                    }
                },
                // Common response schemas
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation completed successfully' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'An error occurred' },
                        error: { type: 'string', example: 'Detailed error message' }
                    }
                },
                // Admin Stats schemas
                DashboardStats: {
                    type: 'object',
                    properties: {
                        totalUsers: { type: 'integer', example: 150 },
                        totalEnrollments: { type: 'integer', example: 89 },
                        totalRevenue: { type: 'number', example: 12500.00 },
                        activePrograms: { type: 'integer', example: 12 }
                    }
                }
            }
        },
        tags: [
            { name: 'Authentication', description: 'User authentication and profile management' },
            { name: 'Programs', description: 'Program/Course management' },
            { name: 'Modules', description: 'Program module content management' },
            { name: 'Enrollments', description: 'User enrollment management' },
            { name: 'Payments', description: 'Stripe payment processing' },
            { name: 'Discounts', description: 'Discount code management' },
            { name: 'Messages', description: 'Real-time messaging system' },
            { name: 'Meetings', description: 'Consultation booking and meetings' },
            { name: 'Documents', description: 'Document upload and review' },
            { name: 'Announcements', description: 'Platform announcements' },
            { name: 'Credentials', description: 'Digital certificate management' },
            { name: 'Admin', description: 'Administrative operations' },
            { name: 'Health', description: 'System health checks' }
        ]
    },
    apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
