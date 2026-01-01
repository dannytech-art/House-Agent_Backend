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
declare class NotificationModel extends DatabaseService<NotificationDocument> {
    constructor();
    findByUser(userId: string): NotificationDocument[];
    findUnread(userId: string): NotificationDocument[];
    markAllRead(userId: string): number;
    deleteByUser(userId: string): number;
}
export declare const notificationModel: NotificationModel;
export default notificationModel;
//# sourceMappingURL=Notification.d.ts.map