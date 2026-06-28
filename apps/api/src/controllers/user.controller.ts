import { Response } from 'express';
import { AuthRequest } from '../types';
import { userService } from '../services/user.service';
import { auditService } from '../services/audit.service';
import { AuditAction, Role } from '../types';

export const userController = {
  async getAllUsers(req: AuthRequest, res: Response) {
    const filters = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      role: req.query.role as Role,
      search: req.query.search as string,
    };

    const result = await userService.getAllUsers(filters);
    res.json({
      success: true,
      message: 'Users fetched successfully',
      data: result,
    });
  },

  async getUserById(req: AuthRequest, res: Response) {
    const user = await userService.getUserById(req.params.id);
    res.json({
      success: true,
      message: 'User details fetched successfully',
      data: user,
    });
  },

  async getProfile(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const user = await userService.getUserById(req.user.id);
    res.json({
      success: true,
      message: 'User profile fetched successfully',
      data: user,
    });
  },

  async updateProfile(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const updated = await userService.updateUser(req.user.id, req.body);

    await auditService.logAction(
      req.user.id,
      AuditAction.USER_UPDATED,
      'User',
      req.user.id,
      { fields: Object.keys(req.body) },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  },

  async updateUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const updated = await userService.updateUser(id, req.body);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.USER_UPDATED,
      'User',
      id,
      { updatedFields: Object.keys(req.body) },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updated,
    });
  },

  async updateRole(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { role } = req.body;

    const updated = await userService.updateRole(id, role);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.SETTINGS_CHANGED,
      'User',
      id,
      { assignedRole: role },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updated,
    });
  },

  async deleteUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await userService.deleteUser(id);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.USER_DELETED,
      'User',
      id,
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  },

  async getStats(req: AuthRequest, res: Response) {
    const stats = await userService.getUserStats();
    res.json({
      success: true,
      message: 'User statistics fetched successfully',
      data: stats,
    });
  }
};
