import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisClient from '../config/redis.js';
import jwt from 'jsonwebtoken';


export const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Setup Redis Adapter for multi-instance scaling
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io Redis adapter in place');
  }).catch((err) => {
    console.error('Socket.io Redis adapter failed to connect because Redis is unavailable.', err.message);
  });

  const interviewNamespace = io.of('/interview');

  // Secure the interview namespace with JWT
  interviewNamespace.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  interviewNamespace.on('connection', (socket) => {
    console.log(`User Connected to Interview: ${socket.id}`);

    socket.on('joinRoom', ({ roomId, userId, username, role }) => {
      socket.join(roomId);
      // Attach metadata to socket for later use
      socket.data = { userId, username, role, roomId };
      console.log(`User ${username || userId} joined room ${roomId}`);
      // Notify others in room
      socket.to(roomId).emit('userJoined', { userId, username, role });
    });

    socket.on('requestEntry', ({ roomId, userId, username, role }) => {
      // Broadcast entry request to the host in the room
      socket.to(roomId).emit('entryRequested', { roomId, userId, username, role, socketId: socket.id });
    });

    socket.on('admitUser', ({ roomId, candidateSocketId }) => {
      // Send a direct message to the candidate's socket allowing them in
      interviewNamespace.to(candidateSocketId).emit('entryGranted', { roomId });
    });

    socket.on('rejectUser', ({ roomId, candidateSocketId }) => {
      // Send a direct message to the candidate rejecting them
      interviewNamespace.to(candidateSocketId).emit('entryRejected', { roomId });
    });

    socket.on('chatMessage', ({ roomId, message, userId, username, role }) => {
      // Broadcast chat message to everyone else in the room
      socket.to(roomId).emit('chatMessage', { message, userId, username, role, timestamp: new Date() });
    });

    socket.on('codeUpdate', ({ roomId, code, userId }) => {
      // Broadcast code changes to everyone else in the room
      socket.to(roomId).emit('codeSync', { code, userId });
    });

    socket.on('cursorMove', ({ roomId, position, userId }) => {
      socket.to(roomId).emit('cursorSync', { position, userId });
    });

    socket.on('disconnect', () => {
      console.log(`User Disconnected: ${socket.id}`);
    });
  });

  return io;
};