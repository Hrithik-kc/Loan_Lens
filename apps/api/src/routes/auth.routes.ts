import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

export const authRoutes = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.post('/refresh', authController.refreshToken);
authRoutes.post('/forgot-password', authController.forgotPassword);
authRoutes.post('/verify-otp', authController.verifyOtp);
authRoutes.post('/reset-password', authController.resetPassword);
authRoutes.post('/resend-otp', authController.resendOtp);

authRoutes.get('/me', authenticate, authController.getCurrentUser);
