import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { chatSessionModel, chatMessageModel } from '../models/Chat.js';
import { userModel } from '../models/User.js';
import { interestModel } from '../models/Interest.js';
import { sendNotification } from './notification.service.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

interface ChatMessagePayload {
  sessionId: string;
  message: string;
  type?: 'text' | 'property-brief' | 'inspection-schedule' | 'document';
  metadata?: Record<string, any>;
}

let io: SocketServer | null = null;

// Store online users
const onlineUsers = new Map<string, string>(); // odify: Map<userId, socketId>

/**
 * Initialize Socket.IO server
 */
export const initializeSocketServer = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwt.secret) as {
        userId: string;
        role: string;
      };

      const user = userModel.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userName = user.name;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`📱 User connected: ${socket.userName} (${socket.userId})`);

    // Store user as online
    if (socket.userId) {
      onlineUsers.set(socket.userId, socket.id);
      
      // Notify others that user is online
      socket.broadcast.emit('user:online', {
        userId: socket.userId,
        userName: socket.userName,
      });
    }

    // Join user's personal room for direct messages
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join all chat sessions user is part of
    const userSessions = chatSessionModel.findByParticipant(socket.userId!);
    userSessions.forEach(session => {
      socket.join(`chat:${session.id}`);
    });

    // Handle joining a specific chat room
    socket.on('chat:join', (sessionId: string) => {
      const session = chatSessionModel.findById(sessionId);
      if (session && session.participantIds.includes(socket.userId!)) {
        socket.join(`chat:${sessionId}`);
        socket.emit('chat:joined', { sessionId });
        console.log(`📨 ${socket.userName} joined chat: ${sessionId}`);
      } else {
        socket.emit('error', { message: 'Not authorized to join this chat' });
      }
    });

    // Handle leaving a chat room
    socket.on('chat:leave', (sessionId: string) => {
      socket.leave(`chat:${sessionId}`);
      socket.emit('chat:left', { sessionId });
    });

    // Handle sending a message
    socket.on('chat:message', async (payload: ChatMessagePayload) => {
      try {
        const { sessionId, message, type = 'text', metadata } = payload;

        if (!message || !sessionId) {
          socket.emit('error', { message: 'Session ID and message are required' });
          return;
        }

        const session = chatSessionModel.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Chat session not found' });
          return;
        }

        if (!session.participantIds.includes(socket.userId!)) {
          socket.emit('error', { message: 'Not authorized to send messages in this chat' });
          return;
        }

        const sender = userModel.findById(socket.userId!);
        if (!sender) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Check if agent needs to unlock first
        if (sender.role === 'agent' && session.interestId) {
          const interest = interestModel.findById(session.interestId);
          if (interest && !interest.unlocked) {
            const agent = sender as any;
            socket.emit('chat:unlock_required', {
              sessionId,
              interestId: session.interestId,
              unlockCost: 5,
              currentCredits: agent.credits || 0,
              hasEnoughCredits: (agent.credits || 0) >= 5,
            });
            return;
          }
        }

        const now = new Date().toISOString();
        const newMessage = {
          id: uuidv4(),
          sessionId,
          senderId: socket.userId!,
          senderName: sender.name,
          senderAvatar: sender.avatar,
          message,
          timestamp: now,
          type,
          metadata,
          read: false,
        };

        // Save message to database
        chatMessageModel.create(newMessage);

        // Update session's lastMessageAt
        chatSessionModel.update(sessionId, {
          lastMessageAt: now,
          updatedAt: now,
        });

        // Emit message to all participants in the room
        io?.to(`chat:${sessionId}`).emit('chat:message', newMessage);

        // Send notification to offline participants
        const recipientId = session.participantIds.find(id => id !== socket.userId);
        if (recipientId && !onlineUsers.has(recipientId)) {
          sendNotification({
            userId: recipientId,
            title: `New message from ${sender.name}`,
            message: message.length > 100 ? message.substring(0, 100) + '...' : message,
            type: 'chat',
            metadata: { chatSessionId: sessionId },
          });
        }

        // Also emit to recipient's personal room (in case they're not in the chat room)
        if (recipientId) {
          io?.to(`user:${recipientId}`).emit('chat:new_message', {
            sessionId,
            message: newMessage,
          });
        }

        console.log(`💬 Message sent in ${sessionId} by ${sender.name}`);
      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('chat:typing', (sessionId: string) => {
      socket.to(`chat:${sessionId}`).emit('chat:typing', {
        sessionId,
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    // Handle stop typing
    socket.on('chat:stop_typing', (sessionId: string) => {
      socket.to(`chat:${sessionId}`).emit('chat:stop_typing', {
        sessionId,
        userId: socket.userId,
      });
    });

    // Handle marking messages as read
    socket.on('chat:read', (sessionId: string) => {
      const messages = chatMessageModel.findBySession(sessionId);
      messages.forEach(msg => {
        if (!msg.read && msg.senderId !== socket.userId) {
          chatMessageModel.update(msg.id, { read: true });
        }
      });

      // Notify other participants
      socket.to(`chat:${sessionId}`).emit('chat:messages_read', {
        sessionId,
        readBy: socket.userId,
      });
    });

    // Handle getting online status
    socket.on('users:online', (userIds: string[]) => {
      const onlineStatus = userIds.map(id => ({
        userId: id,
        online: onlineUsers.has(id),
      }));
      socket.emit('users:online_status', onlineStatus);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`📴 User disconnected: ${socket.userName} (${socket.userId})`);
      
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        
        // Notify others that user is offline
        socket.broadcast.emit('user:offline', {
          userId: socket.userId,
        });
      }
    });
  });

  console.log('🔌 Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getSocketServer = (): SocketServer | null => io;

/**
 * Emit event to a specific user
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit event to a chat session
 */
export const emitToChat = (sessionId: string, event: string, data: any): void => {
  if (io) {
    io.to(`chat:${sessionId}`).emit(event, data);
  }
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

/**
 * Get all online users
 */
export const getOnlineUsers = (): string[] => {
  return Array.from(onlineUsers.keys());
};

export default {
  initializeSocketServer,
  getSocketServer,
  emitToUser,
  emitToChat,
  isUserOnline,
  getOnlineUsers,
};





