# Konstra

Konstra is a modern, real-time application built with Node.js, Express, and Socket.io, utilizing an MSSQL database for data persistence. This project is now fully containerized with Docker for easy setup and deployment.

## Features
- **Real-time Communication**: Seamless messaging powered by Socket.io.
- **Secure Authentication**: Robust user registration and login using JWT and Bcrypt.
- **Payment Integration**: Stripe integration for handling checkouts.
- **Scalable Architecture**: Dockerized setup for consistent environments across development and production.

---

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) and [Docker Compose](https://docs.docker.com/compose/install/)
- OR Node.js (v20+) and local MSSQL instance

### Option 1: Using Docker (Recommended)
The easiest way to get started is by using Docker Compose. This will spin up both the application and an MSSQL database container.

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd Konstra
    ```

2.  **Start the services**:
    ```bash
    docker-compose up -d
    ```

3.  **Access the application**:
    - The server will be running at `http://localhost:8000`.

### Option 2: Running Locally
If you prefer to run without Docker:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure environment variables**:
    Create a `.env` file in the root directory (refer to `.env.example` if available) and add your database and JWT configurations.

3.  **Start the application**:
    ```bash
    npm start
    ```
    OR (for development)
    ```bash
    npm run dev
    ```

---

## Project Structure
- `app.js`: Entry point of the application.
- `controllers/`: Contains logical implementation for routes.
- `models/`: Database models and logic.
- `routes/`: Express route definitions.
- `public/`: Static files (HTML, CSS, JS).
- `middleware/`: Authentication and other middleware.
- `Dockerfile`: Configuration for the application container.
- `docker-compose.yml`: Orchestration for app and database services.

---

## Scripts
- `npm start`: Runs the application with `node app.js`.
- `npm run dev`: Runs the application with `nodemon` for development.

## License
This project is licensed under the ISC License.
