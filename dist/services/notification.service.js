import { v4 as uuidv4 } from 'uuid';
import { notificationModel } from '../models/Notification.js';
/**
 * Send a notification to a specific user
 */
export const sendNotification = (payload) => {
    const notification = {
        id: uuidv4(),
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        read: false,
        metadata: payload.metadata,
        createdAt: new Date().toISOString(),
    };
    notificationModel.create(notification);
    return notification.id;
};
/**
 * Send notification when a client expresses interest in a property
 */
export const notifyInterestExpressed = (data) => {
    // Notify the agent about new interest
    const agentNotificationId = sendNotification({
        userId: data.agentId,
        title: 'New Interest Received! 🎉',
        message: `${data.seekerName} has expressed interest in your property "${data.propertyTitle}". A chat has been started.`,
        type: 'interest',
        metadata: {
            propertyId: data.propertyId,
            seekerId: data.seekerId,
            chatSessionId: data.chatSessionId,
        },
    });
    // Notify the seeker that their interest was registered
    const seekerNotificationId = sendNotification({
        userId: data.seekerId,
        title: 'Interest Sent Successfully! ✅',
        message: `You've expressed interest in "${data.propertyTitle}". A chat has been started with the agent. They'll reach out to you soon!`,
        type: 'success',
        metadata: {
            propertyId: data.propertyId,
            agentId: data.agentId,
            chatSessionId: data.chatSessionId,
        },
    });
    return { agentNotificationId, seekerNotificationId };
};
/**
 * Send notification when a new message is received
 */
export const notifyNewMessage = (data) => {
    return sendNotification({
        userId: data.recipientId,
        title: `New message from ${data.senderName}`,
        message: data.messagePreview.length > 100
            ? data.messagePreview.substring(0, 100) + '...'
            : data.messagePreview,
        type: 'chat',
        metadata: {
            chatSessionId: data.chatSessionId,
        },
    });
};
/**
 * Send notification when property is listed
 */
export const notifyPropertyListed = (data) => {
    return sendNotification({
        userId: data.agentId,
        title: 'Property Listed Successfully! 🏠',
        message: `Your property "${data.propertyTitle}" is now live and visible to clients.`,
        type: 'success',
        metadata: {
            propertyId: data.propertyId,
        },
    });
};
/**
 * Send notification when interest is unlocked by agent
 */
export const notifyInterestUnlocked = (data) => {
    return sendNotification({
        userId: data.seekerId,
        title: 'Agent Viewed Your Interest! 👀',
        message: `${data.agentName} has unlocked your interest in "${data.propertyTitle}". Expect a message soon!`,
        type: 'info',
        metadata: {
            chatSessionId: data.chatSessionId,
        },
    });
};
export default {
    sendNotification,
    notifyInterestExpressed,
    notifyNewMessage,
    notifyPropertyListed,
    notifyInterestUnlocked,
};
//# sourceMappingURL=notification.service.js.map