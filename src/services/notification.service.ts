import { notificationModel } from '../models/Notification.js';

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
export const sendNotification = async (payload: NotificationPayload): Promise<string> => {
  try {
    const notification = await notificationModel.create({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      read: false,
      metadata: payload.metadata,
    });
    return notification.id;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return '';
  }
};

/**
 * Send notification when a client expresses interest in a property
 */
export const notifyInterestExpressed = async (data: {
  agentId: string;
  seekerId: string;
  seekerName: string;
  propertyId: string;
  propertyTitle: string;
  chatSessionId: string;
}): Promise<{ agentNotificationId: string; seekerNotificationId: string }> => {
  // Notify the agent about new interest
  const agentNotificationId = await sendNotification({
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
  const seekerNotificationId = await sendNotification({
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
export const notifyNewMessage = async (data: {
  recipientId: string;
  senderName: string;
  chatSessionId: string;
  messagePreview: string;
}): Promise<string> => {
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
export const notifyPropertyListed = async (data: {
  agentId: string;
  propertyId: string;
  propertyTitle: string;
}): Promise<string> => {
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
export const notifyInterestUnlocked = async (data: {
  seekerId: string;
  agentName: string;
  propertyTitle: string;
  chatSessionId: string;
}): Promise<string> => {
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
