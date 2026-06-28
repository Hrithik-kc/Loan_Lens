import { Response } from 'express';
import { AuthRequest } from '../types';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = {
  async getDashboardStats(req: AuthRequest, res: Response) {
    const stats = await analyticsService.getDashboardStats();
    res.json({
      success: true,
      message: 'Dashboard analytics KPIs fetched successfully',
      data: stats,
    });
  },

  async getFraudTrends(req: AuthRequest, res: Response) {
    const days = req.query.days ? Number(req.query.days) : 7;
    const trends = await analyticsService.getFraudTrends(days);
    res.json({
      success: true,
      message: 'Fraud risk scores chronological trends fetched successfully',
      data: trends,
    });
  },

  async getOfficerPerformance(req: AuthRequest, res: Response) {
    const performance = await analyticsService.getOfficerPerformance();
    res.json({
      success: true,
      message: 'Officer verification performance KPIs fetched successfully',
      data: performance,
    });
  },

  async getRegionalDistribution(req: AuthRequest, res: Response) {
    const regional = await analyticsService.getRegionalDistribution();
    res.json({
      success: true,
      message: 'Geographical loan volume distribution fetched successfully',
      data: regional,
    });
  },

  async getMonthlyUploads(req: AuthRequest, res: Response) {
    const months = req.query.months ? Number(req.query.months) : 6;
    const uploads = await analyticsService.getMonthlyUploads(months);
    res.json({
      success: true,
      message: 'Time-bucketed monthly upload statistics fetched successfully',
      data: uploads,
    });
  }
};
