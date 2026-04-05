
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendOTPEmail } from '../services/emailService.js';
import redisClient from '../config/redis.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  otp: Joi.string().length(6).required()
});

export const register = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0]?.message || 'Validation error' });
      return;
    }

    const { username, email, password, otp } = req.body;

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400).json({ message: 'An account with this email already exists.' });
      return;
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400).json({ message: 'This username is already taken.' });
      return;
    }

    // Check OTP
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      res.status(400).json({ message: 'Invalid or expired OTP.' });
      return;
    }

    await redisClient.del(`otp:${email}`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, passwordHash });

    res.status(201).json({
      _id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(String(user._id))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0]?.message || 'Validation error' });
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'No account found with this email.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Incorrect password. Please try again.' });
      return;
    }

    res.json({
      _id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(String(user._id))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /auth/check-email?email=xxx — real-time availability check
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json({ exists: false });
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id');
    res.json({ exists: !!user });
  } catch {
    res.json({ exists: false });
  }
};

// GET /auth/check-username?username=xxx
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json({ exists: false });
    const user = await User.findOne({ username }).select('_id');
    res.json({ exists: !!user });
  } catch {
    res.json({ exists: false });
  }
};

// POST /auth/send-otp
export const sendOTP = async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: 'Email and username are required.' });
    }

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Check if username exists
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'This username is already taken.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis (expires in 5 minutes = 300 seconds)
    await redisClient.setEx(`otp:${email}`, 300, otp);

    // Send Email
    await sendOTPEmail(email, otp, username);

    res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('sendOTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) {
      // Do NOT reveal whether email exists — security best practice
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl, user.username);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
};

// PUT /auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};