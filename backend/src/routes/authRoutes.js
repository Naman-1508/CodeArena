import express from 'express';
import { register, login, forgotPassword, resetPassword, checkEmail, checkUsername, sendOTP } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/check-email', checkEmail);
router.get('/check-username', checkUsername);
router.post('/send-otp', sendOTP);

export default router;