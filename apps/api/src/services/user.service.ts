import { prisma } from '../config/database';
import { Role } from '../types';
import { AppError } from '../middleware/errorHandler';

export const userService = {
  async getAllUsers(query: {
    page?: number;
    limit?: number;
    role?: Role;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (query.role) {
      where.role = query.role;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          address: true,
          district: true,
          state: true,
          pincode: true,
          isVerified: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        address: true,
        district: true,
        state: true,
        pincode: true,
        profileImage: true,
        isVerified: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async updateUser(id: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);

    return await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        profileImage: data.profileImage,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        address: true,
        district: true,
        state: true,
        pincode: true,
        profileImage: true,
        isVerified: true,
      },
    });
  },

  async deleteUser(id: string) {
    // Soft delete by setting isActive to false
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  },

  async updateRole(id: string, role: Role) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);

    return await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  },

  async getUserStats() {
    const counts = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
      where: { isActive: true },
    });

    const stats: Record<string, number> = {
      BENEFICIARY: 0,
      LOAN_OFFICER: 0,
      ADMIN: 0,
    };

    counts.forEach((item) => {
      stats[item.role] = item._count;
    });

    return stats;
  },
};
