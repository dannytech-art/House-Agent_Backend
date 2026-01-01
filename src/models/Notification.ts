import DatabaseService from '../services/database.service.js';

export interface NotificationDocument {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'interest' | 'chat' | 'system';
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

class NotificationModel extends DatabaseService<NotificationDocument> {
  constructor() {
    super('notifications');
  }

  findByUser(userId: string): NotificationDocument[] {
    return this.findMany(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findUnread(userId: string): NotificationDocument[] {
    return this.findMany(n => n.userId === userId && !n.read);
  }

  markAllRead(userId: string): number {
    const unread = this.findUnread(userId);
    unread.forEach(n => this.update(n.id, { read: true }));
    return unread.length;
  }

  deleteByUser(userId: string): number {
    const notifications = this.findByUser(userId);
    notifications.forEach(n => this.delete(n.id));
    return notifications.length;
  }
}

export const notificationModel = new NotificationModel();
export default notificationModel;

