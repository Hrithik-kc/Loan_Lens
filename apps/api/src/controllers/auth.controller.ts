import { Response } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../types';

export const authController = {
  async register(req: AuthRequest, res: Response) {
    const user = await authService.register(req.body);

    // Audit log
    await auditService.logAction(
      user.id,
      AuditAction.REGISTER,
      'User',
      user.id,
      { email: user.email, role: user.role },
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verification OTP sent to email.',
      data: user,
    });
  },

  async login(req: AuthRequest, res: Response) {
    const { email, password, rememberMe } = req.body;
    const data = await authService.login(email, password);

    // Audit log
    await auditService.logAction(
      data.user.id,
      AuditAction.LOGIN,
      'User',
      data.user.id,
      { email, rememberMe },
      req.ip,
      req.headers['user-agent']
    );

    // Set refresh token in cookie
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days vs 1 day

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: data.user,
        accessToken: data.accessToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      },
    });
  },

  async refreshToken(req: AuthRequest, res: Response) {
    // Get refresh token from cookie or request body
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const tokens = await authService.refreshToken(token);

    // Update cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      },
    });
  },

  async logout(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    if (userId) {
      await auditService.logAction(
        userId,
        AuditAction.LOGOUT,
        'User',
        userId,
        {},
        req.ip,
        req.headers['user-agent']
      );
    }

    res.clearCookie('refreshToken');
    res.json({
      success: true,
      message: 'Logout successful',
    });
  },

  async forgotPassword(req: AuthRequest, res: Response) {
    await authService.forgotPassword(req.body.email);
    res.json({
      success: true,
      message: 'If account exists, a password reset OTP has been sent to email.',
    });
  },

  async verifyOtp(req: AuthRequest, res: Response) {
    const { email, otp, type } = req.body;
    const result = await authService.verifyOtp(email, otp, type);
    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
    });
  },

  async resetPassword(req: AuthRequest, res: Response) {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword(email, otp, newPassword);
    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  },

  async resendOtp(req: AuthRequest, res: Response) {
    const { email, type } = req.body;
    await authService.resendOtp(email, type);
    res.json({
      success: true,
      message: 'OTP resent successfully.',
    });
  },

  getCurrentUser(req: AuthRequest, res: Response) {
    res.json({
      success: true,
      message: 'Current user fetched',
      data: { user: req.user },
    });
  }
};
