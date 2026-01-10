export interface NotificationDocument {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'interest' | 'chat' | 'message' | 'system' | 'achievement' | 'marketplace' | 'admin';
    read: boolean;
    metadata?: Record<string, unknown>;
    createdAt: string;
    readAt?: string;
}
declare class NotificationModel {
    create(notificationData: Partial<NotificationDocument>): Promise<NotificationDocument>;
    findById(id: string): Promise<NotificationDocument | null>;
    update(id: string, updates: Partial<NotificationDocument>): Promise<NotificationDocument | null>;
    delete(id: string): Promise<boolean>;
    findByUser(userId: string): Promise<NotificationDocument[]>;
    findUnread(userId: string): Promise<NotificationDocument[]>;
    markAsRead(id: string): Promise<NotificationDocument | null>;
    markAllRead(userId: string): Promise<number>;
    deleteByUser(userId: string): Promise<number>;
    findOne(predicate: (notification: NotificationDocument) => boolean): NotificationDocument | undefined;
    findMany(predicate: (notification: NotificationDocument) => boolean): NotificationDocument[];
}
export declare const notificationModel: NotificationModel;
export default notificationModel;
//# sourceMappingURL=Notification.d.ts.map