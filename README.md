<div align="center">
  <img src="https://img.shields.io/badge/CodeArena-Real--Time%20Coding-3b82f6?style=for-the-badge&logo=react" alt="CodeArena Logo" />
  
  <br />
  <br />

  **CodeArena** is a production-grade, full-stack, real-time coding and gamified technical interview platform. Built with modern web technologies, it provides a highly secure, scalable, and fully functional environment for developers to practice algorithmic challenges, participate in live technical interviews, and compete on global leaderboards.

  <br />
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![Docker](https://img.shields.io/badge/Docker-Sandbox-2496ED.svg)](https://www.docker.com/)
  
</div>

---

## ✨ Key Features

- **Gamified Dashboard**: Track XP, Levels, and Daily Streaks with seamless visual progress indicators and dynamic micro-animations.
- **Real-Time Interview Rooms**: Share a live coding space with built-in presence, cursor tracking, and state-of-the-art code-synchronization powered by **WebSockets**.
- **Timed Mock Interview Mode**: Simulate pressure-cooker interview environments with configurable strict timers and live evaluation.
- **Intelligent Diagnostics & Tiered Hints**: Detailed test case failure diagnostics explaining *why* a solution failed, accompanied by a tiered hint system to guide rather than give away answers.
- **Secure Code Execution**: Employs an isolated, network-disabled **Docker Sandbox Microservice** to securely execute user-submitted code (C++, Java, Python, JavaScript) in a resource-limited environment.
- **Global Leaderboards**: High-performance, real-time XP leaderboards backed by **Redis Sorted Sets**.
- **Premium Aesthetics**: Fully responsive, "next-level" hacker console UI styled with **Tailwind CSS v4** and animated using **Framer Motion**.
- **Robust Authentication**: Secure JWT-based authentication flows and `bcrypt` password hashing.

## 🏗️ System Architecture

CodeArena uses a highly scalable microservice-oriented design separated into three core components:

### 1. Frontend Client (React + Vite)
- **Tech Stack**: React 19, JSX, Tailwind CSS v4, Framer Motion, Zustand, Monaco Editor.
- Built for absolute speed and wrapped in a stunning dark-mode/neon aesthetic.
- Communicates continuously via REST endpoints and `@socket.io/client`.

### 2. Main API Gateway (Node.js + Express)
- **Tech Stack**: Express.js, MongoDB (Mongoose), Redis, Socket.io, BullMQ, Helmet, Express Rate Limit.
- Features horizontal scalability architecture utilizing `@socket.io/redis-adapter` for multi-node setups.
- Employs strict request input validation via **Joi**.

### 3. Execution Engine (Node.js Worker)
- **Tech Stack**: Node.js, BullMQ, Docker SDK (`child_process`), Redis.
- Asynchronously processes execution tasks directly from the Redis message queue.
- Safely runs isolated user scripts inside temporary, network-disabled `node:18-alpine` containers with strict `--memory` and `--cpus` limits to prevent hostile host-machine attacks.

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Docker** & **Docker Compose**
- **Git**

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/codearena.git
cd codearena
```

**2. Spin up the Data Layer (Redis & MongoDB)**
Use the provided Docker Compose file to instantly spin up the data layer:
```bash
docker-compose up -d
```
> *This will start Redis on port `6379` and MongoDB on port `27017` in the background.*

**3. Install Dependencies**
```bash
# Install backend dependencies
cd backend && npm install

# Install execution service dependencies
cd ../execution-service && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Running the Application Locally

To run the platform locally, boot each component in separate terminal windows:

**Terminal 1 (Backend API & Sockets)**
```bash
cd backend
npm run dev
```

**Terminal 2 (Execution Worker)**
```bash
cd execution-service
npm start
```

**Terminal 3 (Frontend UI)**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 🛡️ Security Measures
- **Dynamic Docker Sandboxing**: Hardens evaluation with isolated network profiles (`--network none`). Temporary volumes are dynamically mounted and destroyed on every submission.
- **Rate Limiting**: Defends the main REST APIs against DDoS attacks using distributed `rate-limit-redis`.
- **Headers Protection**: `helmet` implements strict Content Security Policies.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/codearena/issues).

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
