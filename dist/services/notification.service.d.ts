export interface NotificationPayload {
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'interest' | 'chat' | 'system';
    metadata?: Record<string, unknown>;
}
/**
 * Send a notification to a specific user
 */
export declare const sendNotification: (payload: NotificationPayload) => Promise<string>;
/**
 * Send notification when a client expresses interest in a property
 */
export declare const notifyInterestExpressed: (data: {
    agentId: string;
    seekerId: string;
    seekerName: string;
    propertyId: string;
    propertyTitle: string;
    chatSessionId: string;
}) => Promise<{
    agentNotificationId: string;
    seekerNotificationId: string;
}>;
/**
 * Send notification when a new message is received
 */
export declare const notifyNewMessage: (data: {
    recipientId: string;
    senderName: string;
    chatSessionId: string;
    messagePreview: string;
}) => Promise<string>;
/**
 * Send notification when property is listed
 */
export declare const notifyPropertyListed: (data: {
    agentId: string;
    propertyId: string;
    propertyTitle: string;
}) => Promise<string>;
/**
 * Send notification when interest is unlocked by agent
 */
export declare const notifyInterestUnlocked: (data: {
    seekerId: string;
    agentName: string;
    propertyTitle: string;
    chatSessionId: string;
}) => Promise<string>;
declare const _default: {
    sendNotification: (payload: NotificationPayload) => Promise<string>;
    notifyInterestExpressed: (data: {
        agentId: string;
        seekerId: string;
        seekerName: string;
        propertyId: string;
        propertyTitle: string;
        chatSessionId: string;
    }) => Promise<{
        agentNotificationId: string;
        seekerNotificationId: string;
    }>;
    notifyNewMessage: (data: {
        recipientId: string;
        senderName: string;
        chatSessionId: string;
        messagePreview: string;
    }) => Promise<string>;
    notifyPropertyListed: (data: {
        agentId: string;
        propertyId: string;
        propertyTitle: string;
    }) => Promise<string>;
    notifyInterestUnlocked: (data: {
        seekerId: string;
        agentName: string;
        propertyTitle: string;
        chatSessionId: string;
    }) => Promise<string>;
};
export default _default;
//# sourceMappingURL=notification.service.d.ts.map