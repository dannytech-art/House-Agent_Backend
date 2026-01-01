import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { chatSessionModel, chatMessageModel } from '../models/Chat.js';
import { userModel } from '../models/User.js';
import { propertyModel } from '../models/Property.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { notifyNewMessage } from '../services/notification.service.js';

const router = Router();

// Get all chat sessions for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = chatSessionModel.findByParticipant(req.userId!);

    // Enrich sessions with last message and participant info
    const enrichedSessions = sessions.map(session => {
      const messages = chatMessageModel.findBySession(session.id);
      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(m => !m.read && m.senderId !== req.userId).length;

      const otherParticipantId = session.participantIds.find(id => id !== req.userId);
      const otherParticipant = otherParticipantId ? userModel.findById(otherParticipantId) : null;

      return {
        ...session,
        lastMessage,
        unreadCount,
        otherParticipant: otherParticipant ? {
          id: otherParticipant.id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
        } : null,
      };
    });

    res.json({
      success: true,
      data: enrichedSessions,
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat sessions',
    });
  }
});

// Get messages for a session
router.get('/:sessionId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = chatSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
      });
    }

    if (!session.participantIds.includes(req.userId!)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this chat',
      });
    }

    const messages = chatMessageModel.findBySession(sessionId);

    // Mark messages as read
    messages.forEach(msg => {
      if (!msg.read && msg.senderId !== req.userId) {
        chatMessageModel.update(msg.id, { read: true });
      }
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
    });
  }
});

// Send message
router.post('/:sessionId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message, type = 'text', metadata } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const session = chatSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
      });
    }

    if (!session.participantIds.includes(req.userId!)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to send messages in this chat',
      });
    }

    const sender = userModel.findById(req.userId!);
    if (!sender) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date().toISOString();
    const newMessage = {
      id: uuidv4(),
      sessionId,
      senderId: req.userId!,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      message,
      timestamp: now,
      type,
      metadata,
      read: false,
    };

    chatMessageModel.create(newMessage);

    // Update session's lastMessageAt
    chatSessionModel.update(sessionId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    // Notify the other participant about the new message
    const recipientId = session.participantIds.find(id => id !== req.userId);
    if (recipientId) {
      notifyNewMessage({
        recipientId,
        senderName: sender.name,
        chatSessionId: sessionId,
        messagePreview: message,
      });
    }

    res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
});

// Create new chat session
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId, propertyId, interestId, initialMessage } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: 'Participant ID is required',
      });
    }

    const participant = userModel.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    // Check if session already exists between these users
    const existingSession = chatSessionModel.findOne(s => 
      s.participantIds.includes(req.userId!) && 
      s.participantIds.includes(participantId) &&
      (!propertyId || s.propertyId === propertyId)
    );

    if (existingSession) {
      return res.json({
        success: true,
        data: existingSession,
      });
    }

    const now = new Date().toISOString();
    const newSession = {
      id: uuidv4(),
      participantIds: [req.userId!, participantId],
      propertyId,
      interestId,
      createdAt: now,
      lastMessageAt: now,
      updatedAt: now,
    };

    chatSessionModel.create(newSession);

    // Send initial message if provided
    if (initialMessage) {
      const sender = userModel.findById(req.userId!);
      const message = {
        id: uuidv4(),
        sessionId: newSession.id,
        senderId: req.userId!,
        senderName: sender?.name || 'Unknown',
        senderAvatar: sender?.avatar,
        message: initialMessage,
        timestamp: now,
        type: 'text' as const,
        read: false,
      };
      chatMessageModel.create(message);
    }

    res.status(201).json({
      success: true,
      data: newSession,
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
    });
  }
});

export default router;


