import express from 'express';
import { createRoom, joinRoom } from '../controllers/interviewController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', protect, createRoom);
router.post('/join/:token', protect, joinRoom);

export default router;