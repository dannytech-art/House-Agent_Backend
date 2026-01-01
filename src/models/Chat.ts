import DatabaseService from '../services/database.service.js';
import { ChatSession, ChatMessage } from '../types/index.js';

export interface ChatSessionDocument extends ChatSession {
  updatedAt: string;
}

export interface ChatMessageDocument extends ChatMessage {
  sessionId: string;
  read: boolean;
}

class ChatSessionModel extends DatabaseService<ChatSessionDocument> {
  constructor() {
    super('chat_sessions');
  }

  findByParticipant(userId: string): ChatSessionDocument[] {
    return this.findMany(session => session.participantIds.includes(userId));
  }

  findByProperty(propertyId: string): ChatSessionDocument[] {
    return this.findMany(session => session.propertyId === propertyId);
  }

  findByInterest(interestId: string): ChatSessionDocument | undefined {
    return this.findOne(session => session.interestId === interestId);
  }
}

class ChatMessageModel extends DatabaseService<ChatMessageDocument> {
  constructor() {
    super('chat_messages');
  }

  findBySession(sessionId: string): ChatMessageDocument[] {
    return this.findMany(message => message.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  findUnread(userId: string): ChatMessageDocument[] {
    return this.findMany(message => !message.read && message.senderId !== userId);
  }

  markAsRead(messageId: string): boolean {
    const message = this.update(messageId, { read: true });
    return !!message;
  }
}

export const chatSessionModel = new ChatSessionModel();
export const chatMessageModel = new ChatMessageModel();
export default { chatSessionModel, chatMessageModel };


