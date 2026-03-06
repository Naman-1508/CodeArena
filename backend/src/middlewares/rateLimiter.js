import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit to accommodate frequent result polling
  standardHeaders: true,
  legacyHeaders: false,
  store: {
    increment: async (key) => {
      if (redisClient.isReady) {
        try {
          const count = await redisClient.incr(key);
          if (count === 1) {
            await redisClient.expire(key, 15 * 60); // Set TTL for 15 minutes
          }
          return { totalHits: count, resetTime: new Date(Date.now() + 15 * 60 * 1000) };
        } catch (err) {
          return { totalHits: 1, resetTime: new Date() };
        }
      }
      return { totalHits: 1, resetTime: new Date() };
    },
    decrement: async (key) => {
      if (redisClient.isReady) {
        try { await redisClient.decr(key); } catch (e) { }
      }
    },
    resetKey: async (key) => {
      if (redisClient.isReady) {
        try { await redisClient.del(key); } catch (e) { }
      }
    }
  },
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many requests from this IP, please try again after 15 minutes' });
  }
});