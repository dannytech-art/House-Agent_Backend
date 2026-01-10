// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { notificationModel } from '../models/Notification.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import DatabaseService from '../services/database.service.js';

// Notification preferences model
interface NotificationPreferencesDocument {
  id: string;
  userId: string;
  email: boolean;
  push: boolean;
  interests: boolean;
  chats: boolean;
  system: boolean;
  marketing: boolean;
  updatedAt: string;
}

class NotificationPreferencesModel extends DatabaseService<NotificationPreferencesDocument> {
  constructor() {
    super('notification_preferences');
  }

  findByUser(userId: string): NotificationPreferencesDocument | undefined {
    return this.findOne(pref => pref.userId === userId);
  }
}

const preferencesModel = new NotificationPreferencesModel();

const router = Router();

// Get notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { read, type } = req.query;

    let notifications = notificationModel.findByUser(req.userId!);

    if (read === 'true') {
      notifications = notifications.filter(n => n.read);
    } else if (read === 'false') {
      notifications = notifications.filter(n => !n.read);
    }

    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
    });
  }
});

// Create notification (admin or system)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId, broadcast, title, message, type, metadata } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        error: 'Title, message, and type are required',
      });
    }

    const now = new Date().toISOString();

    if (broadcast && req.userRole === 'admin') {
      // Send to all users
      const users = userModel.findActiveUsers();
      users.forEach(user => {
        notificationModel.create({
          id: uuidv4(),
          userId: user.id,
          title,
          message,
          type,
          read: false,
          metadata,
          createdAt: now,
        });
      });

      res.status(201).json({
        success: true,
        message: `Notification sent to ${users.length} users`,
      });
    } else if (targetUserId) {
      const notification = {
        id: uuidv4(),
        userId: targetUserId,
        title,
        message,
        type,
        read: false,
        metadata,
        createdAt: now,
      };

      notificationModel.create(notification);

      res.status(201).json({
        success: true,
        data: notification,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Target user ID or broadcast flag required',
      });
    }
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
});

// Mark notifications as read
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId, markAllAsRead } = req.body;

    if (markAllAsRead) {
      const count = notificationModel.markAllRead(req.userId!);
      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
      });
    } else if (notificationId) {
      const notification = notificationModel.findById(notificationId);
      if (!notification || notification.userId !== req.userId) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      notificationModel.update(notificationId, { read: true });

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Notification ID or markAllAsRead flag required',
      });
    }
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification',
    });
  }
});

// Delete notification(s)
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, deleteAll } = req.query;

    if (deleteAll === 'true') {
      const count = notificationModel.deleteByUser(req.userId!);
      res.json({
        success: true,
        message: `Deleted ${count} notifications`,
      });
    } else if (id) {
      const notification = notificationModel.findById(id as string);
      if (!notification || notification.userId !== req.userId) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      notificationModel.delete(id as string);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Notification ID or deleteAll flag required',
      });
    }
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
    });
  }
});

// Get notification preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let preferences = preferencesModel.findByUser(req.userId!);

    if (!preferences) {
      // Return default preferences
      preferences = {
        id: uuidv4(),
        userId: req.userId!,
        email: true,
        push: true,
        interests: true,
        chats: true,
        system: true,
        marketing: false,
        updatedAt: new Date().toISOString(),
      };
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences',
    });
  }
});

// Update notification preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    const existingPrefs = preferencesModel.findByUser(req.userId!);

    const now = new Date().toISOString();

    if (existingPrefs) {
      preferencesModel.update(existingPrefs.id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      preferencesModel.create({
        id: uuidv4(),
        userId: req.userId!,
        email: updates.email ?? true,
        push: updates.push ?? true,
        interests: updates.interests ?? true,
        chats: updates.chats ?? true,
        system: updates.system ?? true,
        marketing: updates.marketing ?? false,
        updatedAt: now,
      });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
    });
  }
});

export default router;


