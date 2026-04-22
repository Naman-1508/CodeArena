import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { startJobListener } from './services/jobListener.js';

dotenv.config();

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Apply rate limiting to all requests
app.use('/api', apiLimiter);

// Connect to MongoDB and Redis, and start listening to BullMQ
connectDB();
connectRedis();
startJobListener();

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeArena API is running smoothly' });
});

// Import and mount routes
import problemRoutes from './routes/problemRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import userRoutes from './routes/userRoutes.js';

app.use('/api/v1', problemRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/users', userRoutes);


import { initSockets } from './sockets/index.js';
import { createServer } from 'http';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server & WebSockets running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});