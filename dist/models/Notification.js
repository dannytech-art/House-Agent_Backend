import DatabaseService from '../services/database.service.js';
class NotificationModel extends DatabaseService {
    constructor() {
        super('notifications');
    }
    findByUser(userId) {
        return this.findMany(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    findUnread(userId) {
        return this.findMany(n => n.userId === userId && !n.read);
    }
    markAllRead(userId) {
        const unread = this.findUnread(userId);
        unread.forEach(n => this.update(n.id, { read: true }));
        return unread.length;
    }
    deleteByUser(userId) {
        const notifications = this.findByUser(userId);
        notifications.forEach(n => this.delete(n.id));
        return notifications.length;
    }
}
export const notificationModel = new NotificationModel();
export default notificationModel;
//# sourceMappingURL=Notification.js.map