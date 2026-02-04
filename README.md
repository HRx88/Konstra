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

### ⚠️ Important: File Uploads Setup

For the file upload feature to work correctly, you must manually create the following directory structure if it doesn't exist:

```bash
public/
   └── uploads/
       └── modules/
       └── programs/
```

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
| **About Us**        | `/about-us.html`              | Mission, vision, and team        |
| **Product**         | `/product.html`               | Product showcase & AR viewer     |
| **Login**           | `/login.html`                 | User login page                  |
| **Register**        | `/register.html`              | New user registration            |
| **User Dashboard**  | `/user-dashboard.html`        | Enrolled courses & progress      |
| **Program Catalog** | `/printadobe_v2.html`         | Visual program guide & quiz      |
| **Program List**    | `/printadobe.html`            | Filterable program search        |
| **Program Details** | `/printadobe-details.html`    | Detailed program information     |
| **Program Content** | `/program-content.html`       | Access enrolled course materials |
| **Enrollment**      | `/enrollment.html`            | Enroll in a program              |
| **Payment**         | `/payment.html`               | Stripe checkout page             |
| **Payment Success** | `/success.html`               | Payment confirmation page        |
| **Projects**        | `/our-project.html`           | Project portfolio                |
| **Chat**            | `/chat.html`                  | User messaging interface         |
| **Meetings**        | `/my-meetings.html`           | User's scheduled meetings        |
| **Booking**         | `/booking-Consultation.html`  | Schedule consultations           |
| **Credentials**     | `/user-credentials.html`      | View earned certificates         |
| **Profile**         | `/profile.html`               | User profile management          |
| **Admin Home**      | `/admin-home.html`            | Admin dashboard                  |
| **Admin Programs**  | `/admin-printadobe.html`      | Manage programs                  |
| **Admin Modules**   | `/admin-program-modules.html` | Manage course content            |
| **Admin Projects**  | `/admin-projects.html`        | Manage public projects           |
| **Admin Documents** | `/admin-doc.html`             | Review user documents            |
| **Admin Chat**      | `/adminChat.html`             | Admin messaging interface        |
| **Admin Profile**   | `/admin-profile.html`         | Admin tools & NGO creation       |
| **NGO Dashboard**   | `/ngo-dashboard.html`         | NGO partner dashboard            |
| **NGO Documents**   | `/ngo-doc.html`               | NGO document repository          |

---

## 🗺️ Detailed Site Map

### 🌐 Public Zone

Accessible to all visitors without authentication.

- **Landing Page** (`index.html`)
  - Hero section, Feature highlights, Footer navigation.
- **Information Pages**
  - **About Us** (`about-us.html`): Mission, vision, and team details.
  - **PrintAdobe** (`printadobe_v2.html`): Courses and trips offered
  - **Our Projects** (`our-project.html`): Overview of initiatives.
    - _Sub-projects_: Strava (`project-strava.html`), 3D House (`project-strava-3dhouse.html`).
  - **Contact Us** (`contact-us.html`): Inquiry form and location map.
- **Authentication**
  - **Login** (`login.html`): User/Admin/NGO login with JWT and Google OAuth support.
  - **Register** (`register.html`): New user sign-up form.

### 👤 Authenticated User Portal (Student)
Access via `user-dashboard.html`. Navigation is driven by the **Portal Sidebar**.

- **Dashboard** (`user-dashboard.html`): Main landing; view learning progress, active courses, and announcements.
- **Documents** (`user-doc.html`): Secure repository for student project files and ID uploads.
- **Chat** (`chat.html`): Real-time messaging hub for student support.
- **Printadobe** (`user-printadobe.html`): Private course catalog for enrolled students to discover new modules.
- **Credentials** (`user-credentials.html`): Digital vault for viewing and downloading earned certificates.
- **Profile** (`profile.html`): Manage personal settings and account security.
- **Overview** (`user-overview.html`): Statistical breakdown of learning milestones and impact.

### 👨‍🏫 Admin Portal
Access via `admin-home.html`. Navigation is driven by the **Admin Sidebar**.

- **Dashboard** (`admin-home.html`): Control center with real-time KPIs and system activity feed.
- **Documents** (`admin-doc.html`): Review queue for verifying student and partner documentation.
- **Chat** (`chat.html`): Multi-channel communication hub for overseeing platform messages.
- **Meetings** (`my-meetings.html`): Administrative tool for moderating scheduled video lessons.
- **PrintAdobe** (`admin-printadobe.html`): Master catalog management for all programs and trips.
- **Credentials** (`admin-credentials.html`): Oversight for issuing and revoking digital student records.
- **Projects** (`admin-projects.html`): Editor for managing the public-facing project portfolio.
- **Discounts** (`admin-discounts.html`): Marketing tools for creating and auditing promotional codes.
- **Profile** (`admin-profile.html`): Management of admin credentials and new NGO partner onboarding.

### 🤝 NGO Partner Portal
Access via `ngo-dashboard.html`. Navigation is driven by the **Partner Sidebar**.

- **Dashboard** (`ngo-dashboard.html`): Impact analytics, construction milestones, and CO2 savings tracking.
- **Documents** (`ngo-doc.html`): Repository for shared legal agreements and project reports.
- **Partner Chat** (`chat.html`): Direct encrypted communication line with Konstra management.
- **Book Consultation** (`booking-Consultation.html`): Integrated scheduler for site reviews and strategy calls.
- **My Meetings** (`my-meetings.html`): Virtual room access for scheduled partner video conferences.
- **Profile** (`profile.html`): Management of partner organization profiles and authorized reps.

---

## 🔄 Comprehensive User Flows

### 1. 🎓 Student Enrollment & Learning Journey

**Goal**: Purchase a course and complete it to earn a certificate.

1.  **Discovery**
    -   User lands on `index.html` or the visual hub `printadobe_v2.html`.
    -   Browses catalog `printadobe.html` and selects a course.
    -   Views dynamic details on `printadobe-details.html` (e.g., "3D Concrete Printing").
2.  **Authentication**
    -   Clicks "Enroll".
    -   **New User**: Redirects to `register.html` -> Account created.
    -   **Existing User**: Redirects to `login.html`.
3.  **Secure Checkout**
    -   Enters booking wizard `enrollment.html` (if applicable) or direct purchase.
    -   Redirected to payment gateway `payment.html` (Stripe).
    -   **Success**: Redirected to `success.html` -> Enrollment record created -> Email sent.
4.  **Learning**
    -   User lands on `user-dashboard.html`.
    -   Clicks "Continue Learning" -> Opens `program-content.html`.
    -   **Action**: Watches video/reads PDF -> Clicks "Complete Module".
    -   **System**: Updates progress % in real-time.
5.  **Certification**
    -   Progress reaches 100%.
    -   Certificate generated and accessible via `user-credentials.html`.

### 2. 👨‍🏫 Admin Content Management Flow

**Goal**: Create a new program and upload study materials.

1.  **Program Setup**
    - Admin logs in -> `admin-printadobe.html`.
    - Clicks **"Add New Program"**.
    - Fills: Title, Price, Description. Uploads Cover Image.
    - **Save**: Program is now visible in the catalog.
2.  **Content Upload**
    - Navigates to `admin-program-modules.html`.
    - Selects the newly created program from dropdown.
    - **Action**: "Add Module".
    - Fills: Module Title (e.g., "Intro to Robotics").
    - **File Upload**: Selects PDF/Video.
    - **System**: Saves file to `public/uploads/modules/programs` and links path in DB.
3.  **Publication**
    - Module appears in the `program-content.html` for enrolled users effectively immediately.

### 3. 📄 Document Verification Flow

**Goal**: Admin approves a document uploaded by a user (e.g., ID proof).

1.  **Submission**
    -   User/NGO uploads document via `profile.html` or `ngo-doc.html`.
    -   Status set to `Pending`.
2.  **Review**
    -   Admin checks `admin-doc.html`.
    -   Previews file (PDF/Image) directly in browser.
3.  **Decision**
    -   **Approve**: Status -> `Approved`. User notified via notification system.
    -   **Reject**: Admin adds comment. Status -> `Rejected`.

### 4. 🤝 NGO Partner Collaboration Flow

1.  **Dashboard** (`ngo-dashboard.html`): Partner reviews Construction Analytics and CO2 savings.
2.  **Coordination**: Uses **Book Consultation** (`booking-Consultation.html`) to schedule reviews.
3.  **Communication**: Uses **Partner Chat** (`chat.html`) for real-time support.
4.  **Meetings**: Joins scheduled strategy calls via **My Meetings** (`my-meetings.html`).
5.  **Documentation**: Uploads/Downloads project reports in **Documents** (`ngo-doc.html`).

### 5. 🛠️ Admin Management Flow

1.  **Oversight**: Admin monitors global KPIs on **Dashboard** (`admin-home.html`).
2.  **Content**: Updates catalog via **PrintAdobe** (`admin-printadobe.html`) and modules.
3.  **Users**: Creates NGO accounts or resets user access in **Profile** (`admin-profile.html`).
4.  **Verification**: Reviews student identity documents in **Documents** (`admin-doc.html`).
5.  **Meetings**: Moderates scheduled training sessions in **Meetings** (`my-meetings.html`).

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
GET  /api/programs              # List all programs
GET  /api/programs/:id          # Get program details
POST /api/programs              # Create program (🔒 Admin)
PUT  /api/programs/:id          # Update program (🔒 Admin)
DELETE /api/programs/:id        # Delete program (🔒 Admin)
POST /api/programs/upload-image # Upload program image (🔒 Admin)
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
