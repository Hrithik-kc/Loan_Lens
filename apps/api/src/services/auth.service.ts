import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '../types';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendEmail, emailTemplates } from '../config/email';
import { logger } from '../config/logger';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: Role;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTokens(userId: string, email: string, role: string): TokenPair {
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_ACCESS_SECRET || 'access_secret',
    { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any }
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
  );

  return { accessToken, refreshToken };
}

export const authService = {
  async register(data: RegisterData) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone,
        role: (data.role || 'BENEFICIARY') as string,
        address: data.address,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        isVerified: false,
      },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, isVerified: true, createdAt: true,
      },
    });

    // Send OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpToken.create({
      data: { email: data.email, otp, type: 'VERIFY_EMAIL', expiresAt },
    });

    try {
      await sendEmail(
        data.email,
        'Verify Your LoanLens Account',
        emailTemplates.otp(data.name, otp, 'email verification')
      );
    } catch (err) {
      logger.warn('Failed to send verification email:', err);
    }

    return user;
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generateTokens(user.id, user.email, user.role as string);

    const { passwordHash: _, ...safeUser } = user;

    return { user: safeUser, ...tokens };
  },

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'refresh_secret'
      ) as { userId: string; email: string; role: Role };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true },
      });

      if (!user) {
        throw new AppError('User not found', 401);
      }

      const tokens = generateTokens(user.id, user.email, user.role as string);
      return tokens;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) return;

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate existing OTPs
    await prisma.otpToken.updateMany({
      where: { email, type: 'RESET_PASSWORD', used: false },
      data: { used: true },
    });

    await prisma.otpToken.create({
      data: { email, otp, type: 'RESET_PASSWORD', expiresAt },
    });

    try {
      await sendEmail(
        email,
        'Reset Your LoanLens Password',
        emailTemplates.otp(user.name, otp, 'password reset')
      );
    } catch (err) {
      logger.warn('Failed to send password reset email:', err);
    }
  },

  async verifyOtp(email: string, otp: string, type: string) {
    const otpRecord = await prisma.otpToken.findFirst({
      where: {
        email,
        otp,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    await prisma.otpToken.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    if (type === 'VERIFY_EMAIL') {
      await prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });
    }

    return { verified: true };
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    // Verify OTP first
    await this.verifyOtp(email, otp, 'RESET_PASSWORD');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
  },

  async resendOtp(email: string, type: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('User not found', 404);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpToken.updateMany({
      where: { email, type, used: false },
      data: { used: true },
    });

    await prisma.otpToken.create({
      data: { email, otp, type, expiresAt },
    });

    const purpose = type === 'VERIFY_EMAIL' ? 'email verification' : 'password reset';

    await sendEmail(email, 'Your LoanLens OTP', emailTemplates.otp(user.name, otp, purpose));
  },
};
