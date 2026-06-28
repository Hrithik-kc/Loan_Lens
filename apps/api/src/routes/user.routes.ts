import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

export const userRoutes = Router();

// Apply auth to all routes
userRoutes.use(authenticate);

userRoutes.get('/profile', userController.getProfile);
userRoutes.put('/profile', userController.updateProfile);

// Admin-only endpoints
userRoutes.get('/', authorize(Role.ADMIN), userController.getAllUsers);
userRoutes.get('/stats', authorize(Role.ADMIN), userController.getStats);
userRoutes.get('/:id', authorize(Role.ADMIN), userController.getUserById);
userRoutes.put('/:id', authorize(Role.ADMIN), userController.updateUser);
userRoutes.put('/:id/role', authorize(Role.ADMIN), userController.updateRole);
userRoutes.delete('/:id', authorize(Role.ADMIN), userController.deleteUser);
