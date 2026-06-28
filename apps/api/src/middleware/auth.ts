import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../types';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Access token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'fallback_secret'
    ) as { userId: string; email: string; role: Role };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user) {
      throw new AppError('User not found or deactivated', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired token', 401);
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Required role: ${roles.join(' or ')}`,
        403
      );
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'fallback_secret'
    ) as { userId: string; email: string; role: Role };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
      select: { id: true, email: true, name: true, role: true },
    });

    if (user) {
      req.user = { ...user, role: user.role as Role };
    }
  } catch {
    // Silently continue without user
  }

  next();
};
