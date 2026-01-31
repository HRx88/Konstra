# Konstra - Educational Platform

Konstra is a comprehensive educational platform built with Node.js, Express, Socket.io, and MSSQL. It provides a complete learning management system with real-time features for users, administrators, and NGOs.

---

## ✨ Features

### 🔐 Authentication & User Management

- **User Registration & Login** - Secure authentication using JWT and Bcrypt
- **Google OAuth** - Social login integration with Passport.js
- **Role-Based Access Control** - Support for User, Admin, and NGO roles
- **Profile Management** - Update user profiles and credentials

### 📚 Program & Course Management

- **Program Catalog** - Browse courses, workshops, immersive trips, and live training
- **Child Programs/Levels** - Hierarchical program structure with parent-child relationships
- **Program Modules** - Manage course content with videos, PDFs, and images
- **Progress Tracking** - Track module completion and learning progress
- **Enrollment System** - Enroll in programs with slot management

### 💳 Payment Integration

- **Stripe Checkout** - Secure payment processing via Stripe
- **Discount Codes** - Create and validate promotional codes
- **Price Calculation** - Dynamic pricing with child program selection

### 💬 Real-Time Communication

- **Socket.io Messaging** - Real-time chat between users and admins
- **Conversations** - Create, search, and manage conversations
- **Online Status** - Track user online/offline status
- **Read Receipts** - Message delivery and read tracking
- **Typing Indicators** - Real-time typing notifications

### 📅 Meeting & Consultation Booking

- **Calendly Integration** - Schedule consultations via Calendly
- **Meeting Management** - Create, view, and join meetings
- **Video Conferencing** - Meeting room functionality

### 📄 Document Management

- **File Upload/Download** - Support for PDFs, documents, images
- **Document Review** - Submit documents for admin review
- **Approval Workflow** - Admin approval/rejection with feedback
- **SSE Updates** - Real-time document status updates

### 🏆 Credentials & Certificates

- **Digital Credentials** - Issue digital certificates to learners
- **Credential Dashboard** - Admin view of issued credentials
- **User Credential View** - Users can view their earned credentials

### 📢 Announcements

- **Real-Time Announcements** - SSE-powered live announcements
- **Admin Broadcast** - Create and publish announcements

### 📊 Admin Dashboard

- **Statistics & Analytics** - Dashboard with KPI metrics
- **User Management** - View and manage all users
- **NGO Account Management** - Register and manage NGO partners

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) and [Docker Compose](https://docs.docker.com/compose/install/)
- OR Node.js (v20+) and local MSSQL instance

### Option 1: Using Docker (Recommended)

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd Konstra
   ```

2. **Start the services**:

   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Server: `http://localhost:8000`
   - Login: `http://localhost:8000/login.html`
   - **Swagger API Docs**: `http://localhost:8000/api-docs`

### Option 2: Running Locally

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the root directory:

   ```env
   PORT=8000
   DB_SERVER=localhost
   DB_NAME=konstradb
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   JWT_SECRET=your_jwt_secret_key
   CALENDLY_API_TOKEN=your_calendly_api_token
   CERTIFIER_API_KEY=your_certifier_api_key
   WHEREBY_API_KEY=your_whereby_api_key
   SMTPUser=your_email
   SMTPUserPassword=your_email_password
   SMTPService=gmail
   STRIPE_SECRET_KEY=sk_test_xxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. **Set up the database**:
   Run `SQLQuerymain.sql` in your MSSQL instance to create tables.

4. **Start the application**:

   ```bash
   npm start       # Production
   npm run dev     # Development with nodemon
   ```

5. **Access Swagger API Documentation**:
   Open `http://localhost:8000/api-docs` in your browser

---

## 📖 Swagger API Documentation

Konstra includes **interactive API documentation** powered by Swagger UI.

### Accessing Swagger

| Resource         | URL                                   |
| ---------------- | ------------------------------------- |
| **Swagger UI**   | `http://localhost:8000/api-docs`      |
| **OpenAPI JSON** | `http://localhost:8000/api-docs.json` |

### Features

- 📋 **Interactive Testing** - Test API endpoints directly from the browser
- 🔒 **Authorization** - Add JWT token to test protected endpoints
- 📝 **Request/Response Examples** - View sample payloads
- 📊 **Schema Definitions** - Explore all data models

### Using Swagger UI

1. **Start the server**: `npm start`
2. **Open Swagger UI**: Navigate to `http://localhost:8000/api-docs`
3. **Authorize** (for protected endpoints):
   - Click the **"Authorize"** button (🔓)
   - Enter your JWT token: `Bearer <your_token>`
   - Click **"Authorize"**
4. **Test Endpoints**:
   - Expand any endpoint
   - Click **"Try it out"**
   - Fill in parameters
   - Click **"Execute"**
   - View the response

### API Categories in Swagger

| Tag            | Description                                  |
| -------------- | -------------------------------------------- |
| Authentication | User registration, login, profile management |
| Programs       | Course/program CRUD operations               |
| Modules        | Program content management                   |
| Enrollments    | User enrollment and progress                 |
| Payments       | Stripe checkout integration                  |
| Discounts      | Promotional code management                  |
| Messages       | Real-time messaging APIs                     |
| Meetings       | Consultation booking                         |
| Documents      | File upload and review                       |
| Announcements  | Platform announcements                       |
| Credentials    | Digital certificates                         |
| Admin          | Administrative operations                    |
| Health         | System health checks                         |

---

## 📁 Project Structure

```
Konstra/
├── app.js                    # Application entry point
├── config/
│   ├── passport.js           # Google OAuth configuration
│   └── swagger.js            # Swagger/OpenAPI configuration
├── controllers/              # Route handlers and business logic
│   ├── authController.js
│   ├── programController.js
│   ├── paymentController.js
│   ├── messageController.js
│   └── ...
├── models/                   # Database models
│   ├── user.js
│   ├── program.js
│   ├── enrollment.js
│   └── ...
├── routes/                   # Express route definitions (with Swagger JSDoc)
│   ├── authRoutes.js
│   ├── program.routes.js
│   ├── payment.routes.js
│   └── ...
├── middleware/               # Authentication and other middleware
├── public/                   # Static files (HTML, CSS, JS)
│   ├── css/
│   ├── js/
│   ├── uploads/
│   └── *.html
├── Dockerfile               # Docker configuration
└── docker-compose.yml       # Docker Compose orchestration
```

---

## 🌐 Web Pages Guide

| Page                | URL                           | Description                      |
| ------------------- | ----------------------------- | -------------------------------- |
| **Home**            | `/index.html`                 | Landing page with navigation     |
| **Login**           | `/login.html`                 | User login page                  |
| **Register**        | `/register.html`              | New user registration            |
| **User Dashboard**  | `/user-dashboard.html`        | Enrolled courses & progress      |
| **Program Catalog** | `/printadobe.html`            | Browse available programs        |
| **Program Details** | `/printadobe-details.html`    | Detailed program information     |
| **Program Content** | `/program-content.html`       | Access enrolled course materials |
| **Enrollment**      | `/enrollment.html`            | Enroll in a program              |
| **Payment**         | `/payment.html`               | Stripe checkout page             |
| **Chat**            | `/chat.html`                  | User messaging interface         |
| **Meetings**        | `/my-meetings.html`           | User's scheduled meetings        |
| **Booking**         | `/booking-Consultation.html`  | Schedule consultations           |
| **Credentials**     | `/user-credentials.html`      | View earned certificates         |
| **Profile**         | `/profile.html`               | User profile management          |
| **Admin Home**      | `/admin-home.html`            | Admin dashboard                  |
| **Admin Programs**  | `/admin-printadobe.html`      | Manage programs                  |
| **Admin Modules**   | `/admin-program-modules.html` | Manage course content            |
| **Admin Documents** | `/admin-doc.html`             | Review user documents            |
| **Admin Chat**      | `/adminChat.html`             | Admin messaging interface        |
| **NGO Dashboard**   | `/ngo-dashboard.html`         | NGO partner dashboard            |

---

## 🧪 Postman Testing

### Option 1: Use Swagger UI (Recommended)

The easiest way to test APIs is through the built-in Swagger UI at `http://localhost:8000/api-docs`.

### Option 2: Import OpenAPI Spec to Postman

1. **Export OpenAPI spec**: Visit `http://localhost:8000/api-docs.json`
2. **Import to Postman**:
   - Open Postman
   - Click **Import** button
   - Select **Link** tab
   - Paste: `http://localhost:8000/api-docs.json`
   - Click **Import**
3. **All endpoints** will be automatically created with request bodies

### Option 3: Manual Postman Setup

#### Environment Variables

Create a Postman environment with:

| Variable   | Initial Value               |
| ---------- | --------------------------- |
| `base_url` | `http://localhost:8000/api` |
| `token`    | _(leave empty)_             |

#### Auto-Save Token Script

Add to Login request's **Tests** tab:

```javascript
if (pm.response.code === 200) {
  var response = pm.response.json();
  pm.environment.set("token", response.token);
}
```

#### Authorization Setup

For protected requests:

- Type: `Bearer Token`
- Token: `{{token}}`

---

## 📌 Quick API Reference

### Authentication

```http
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login
GET  /api/auth/profile      # Get profile (🔒)
PUT  /api/auth/profile      # Update profile (🔒)
```

### Programs

```http
GET  /api/programs          # List all programs
GET  /api/programs/:id      # Get program details
POST /api/programs          # Create program (🔒 Admin)
PUT  /api/programs/:id      # Update program (🔒 Admin)
DELETE /api/programs/:id    # Delete program (🔒 Admin)
```

### Enrollments

```http
GET  /api/enrollments/my-enrollments     # My enrollments (🔒)
POST /api/enrollments/create             # Create enrollment (🔒)
GET  /api/enrollments/:id/progress       # Get progress (🔒)
```

### Payments

```http
GET  /api/payment/config                    # Get Stripe key
POST /api/payment/create-checkout-session   # Create checkout (🔒)
GET  /api/payment/success                   # Payment success callback
```

### Discounts

```http
POST /api/discounts/validate   # Validate code
GET  /api/discounts/public     # Public codes
POST /api/discounts            # Create (🔒 Admin)
```

### Messages

```http
GET  /api/message/conversations/:userID/:userType   # Get conversations
POST /api/message/conversations/get-or-create       # Get/create conversation
GET  /api/message/messages/:conversationID          # Get messages
POST /api/message/messages/send                     # Send message
```

🔒 = Requires `Authorization: Bearer <token>` header

---

## 🔌 WebSocket Events (Socket.io)

### Client Events (Emit)

| Event                    | Payload                                             | Description              |
| ------------------------ | --------------------------------------------------- | ------------------------ |
| `userOnline`             | `{ userID, userType }`                              | User comes online        |
| `sendMessage`            | `{ conversationID, senderID, senderType, content }` | Send a message           |
| `messagesRead`           | `{ conversationID, userID, userType }`              | Mark messages as read    |
| `newConversationCreated` | `{ conversationID, userID, userType }`              | New conversation started |

### Server Events (Listen)

| Event                 | Payload                        | Description              |
| --------------------- | ------------------------------ | ------------------------ |
| `receiveMessage`      | Message object                 | New message received     |
| `conversationUpdated` | Conversation object            | Conversation updated     |
| `updateOnlineUsers`   | Array of user keys             | Online users list        |
| `updateReadReceipts`  | `{ conversationID, senderID }` | Read receipt update      |
| `newConversation`     | Conversation object            | New conversation created |

---

## 📜 Scripts

| Command       | Description                        |
| ------------- | ---------------------------------- |
| `npm start`   | Run application with `nodemon`     |
| `npm run dev` | Run with `nodemon` for development |

---

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

---
