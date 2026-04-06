
import { v4 as uuidv4 } from 'uuid';
import Interview from '../models/Interview.js';

import redisClient from '../config/redis.js';

// @route   POST /api/v1/interviews/create
// @desc    Interviewer creates a new room
export const createRoom = async (req, res) => {
  try {
    // Allow any authenticated user to create a room (P2P / Pair Programming)
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const roomToken = uuidv4();

    const interview = await Interview.create({
      interviewerId: req.user.id,
      roomToken,
      status: 'Scheduled'
    });

    res.status(201).json({ roomToken, interviewId: interview.id });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   POST /api/v1/interviews/join/:token
// @desc    Candidate or Interviewer joins the room
export const joinRoom = async (req, res) => {
  try {
    const { token } = req.params;
    const interview = await Interview.findOne({ roomToken: token }).populate('problemId');

    if (!interview) {
      res.status(404).json({ message: 'Invalid room token' });
      return;
    }

    // Set interview active if not already completed
    if (interview.status === 'Scheduled') {
      interview.status = 'Active';
      interview.startedAt = new Date();
      if (req.user?.role === 'User') {
        interview.candidateId = req.user._id;
      }
      await interview.save();
    }

    // Fetch initial room state from Redis (current code logic)
    const currentCode = await redisClient.get(`room:${token}:code`);

    res.json({ interview, currentCode });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   GET /api/v1/interviews/admin/all
// @desc    Admin fetches all interviews
export const getAllInterviews = async (req, res) => {
  try {
    if (req.user?.role !== 'Admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const interviews = await Interview.find()
      .populate('interviewerId', 'username email')
      .populate('candidateId', 'username email')
      .populate('problemId', 'title')
      .sort({ createdAt: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};