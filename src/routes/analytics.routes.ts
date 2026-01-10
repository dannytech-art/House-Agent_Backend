// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { userModel } from '../models/User.js';
import { propertyModel } from '../models/Property.js';
import { interestModel } from '../models/Interest.js';
import { transactionModel } from '../models/Credit.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import DatabaseService from '../services/database.service.js';

// Analytics events model
interface AnalyticsEventDocument {
  id: string;
  userId: string;
  event: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  createdAt: string;
}

// Reports model
interface ReportDocument {
  id: string;
  type: 'users' | 'properties' | 'interests' | 'financial';
  generatedBy: string;
  parameters?: any;
  data: any;
  createdAt: string;
}

class AnalyticsEventModel extends DatabaseService<AnalyticsEventDocument> {
  constructor() {
    super('analytics_events');
  }

  findByUser(userId: string): AnalyticsEventDocument[] {
    return this.findMany(e => e.userId === userId);
  }

  findByEvent(event: string): AnalyticsEventDocument[] {
    return this.findMany(e => e.event === event);
  }
}

class ReportModel extends DatabaseService<ReportDocument> {
  constructor() {
    super('reports');
  }

  findByType(type: string): ReportDocument[] {
    return this.findMany(r => r.type === type);
  }
}

const analyticsEventModel = new AnalyticsEventModel();
const reportModel = new ReportModel();

const router = Router();

// Get reports
router.get('/reports', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    let reports;
    if (type) {
      reports = reportModel.findByType(type as string);
    } else {
      reports = reportModel.findAll();
    }

    // Sort by date, most recent first
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reports',
    });
  }
});

// Generate report
router.post('/reports', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, parameters } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Report type is required',
      });
    }

    const now = new Date().toISOString();
    let reportData: any = {};

    switch (type) {
      case 'users':
        const users = userModel.findAll();
        const agents = userModel.findAgents();
        reportData = {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.active).length,
          totalAgents: agents.length,
          verifiedAgents: agents.filter(a => a.verified).length,
          usersByRole: {
            seekers: users.filter(u => u.role === 'seeker').length,
            agents: agents.length,
            admins: users.filter(u => u.role === 'admin').length,
          },
          recentSignups: users
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(u => ({ id: u.id, name: u.name, role: u.role, createdAt: u.createdAt })),
        };
        break;

      case 'properties':
        const properties = propertyModel.findAll();
        reportData = {
          totalProperties: properties.length,
          byStatus: {
            available: properties.filter(p => p.status === 'available').length,
            pending: properties.filter(p => p.status === 'pending').length,
            sold: properties.filter(p => p.status === 'sold').length,
          },
          byType: properties.reduce((acc: any, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
          }, {}),
          featured: properties.filter(p => p.featured).length,
          avgPrice: properties.length > 0
            ? Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length)
            : 0,
        };
        break;

      case 'interests':
        const interests = interestModel.findAll();
        reportData = {
          totalInterests: interests.length,
          byStatus: {
            pending: interests.filter(i => i.status === 'pending').length,
            contacted: interests.filter(i => i.status === 'contacted').length,
            viewingScheduled: interests.filter(i => i.status === 'viewing-scheduled').length,
            closed: interests.filter(i => i.status === 'closed').length,
          },
          unlocked: interests.filter(i => i.unlocked).length,
          avgSeriousnessScore: interests.length > 0
            ? Math.round(interests.reduce((sum, i) => sum + i.seriousnessScore, 0) / interests.length * 10) / 10
            : 0,
        };
        break;

      case 'financial':
        const transactions = transactionModel.findAll();
        const completed = transactions.filter(t => t.status === 'completed');
        reportData = {
          totalTransactions: transactions.length,
          completedTransactions: completed.length,
          totalRevenue: completed
            .filter(t => t.type === 'credit_purchase')
            .reduce((sum, t) => sum + t.amount, 0),
          totalCreditsDistributed: completed
            .filter(t => t.credits)
            .reduce((sum, t) => sum + (t.credits || 0), 0),
          byType: transactions.reduce((acc: any, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
          }, {}),
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
    }

    const report = {
      id: uuidv4(),
      type,
      generatedBy: req.userId!,
      parameters,
      data: reportData,
      createdAt: now,
    };

    reportModel.create(report);

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
});

// Get metrics
router.get('/metrics', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'overview' } = req.query;

    let metrics: any = {};

    switch (type) {
      case 'overview':
        const users = userModel.findAll();
        const properties = propertyModel.findAll();
        const interests = interestModel.findAll();
        metrics = {
          users: {
            total: users.length,
            active: users.filter(u => u.active).length,
          },
          properties: {
            total: properties.length,
            available: properties.filter(p => p.status === 'available').length,
          },
          interests: {
            total: interests.length,
            pending: interests.filter(i => i.status === 'pending').length,
          },
        };
        break;

      case 'users':
        const allUsers = userModel.findAll();
        metrics = {
          total: allUsers.length,
          active: allUsers.filter(u => u.active).length,
          byRole: allUsers.reduce((acc: any, u) => {
            acc[u.role] = (acc[u.role] || 0) + 1;
            return acc;
          }, {}),
        };
        break;

      case 'properties':
        const allProperties = propertyModel.findAll();
        metrics = {
          total: allProperties.length,
          byStatus: allProperties.reduce((acc: any, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          }, {}),
          byType: allProperties.reduce((acc: any, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
          }, {}),
        };
        break;

      case 'conversions':
        const allInterests = interestModel.findAll();
        const closed = allInterests.filter(i => i.status === 'closed');
        metrics = {
          totalInterests: allInterests.length,
          closedDeals: closed.length,
          conversionRate: allInterests.length > 0
            ? Math.round(closed.length / allInterests.length * 100)
            : 0,
        };
        break;
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
    });
  }
});

// Track event
router.post('/events', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { event, entityType, entityId, metadata } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Event name is required',
      });
    }

    const analyticsEvent = {
      id: uuidv4(),
      userId: req.userId!,
      event,
      entityType,
      entityId,
      metadata,
      createdAt: new Date().toISOString(),
    };

    analyticsEventModel.create(analyticsEvent);

    res.status(201).json({
      success: true,
      data: analyticsEvent,
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event',
    });
  }
});

export default router;


