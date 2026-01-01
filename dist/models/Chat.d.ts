import DatabaseService from '../services/database.service.js';
import { ChatSession, ChatMessage } from '../types/index.js';
export interface ChatSessionDocument extends ChatSession {
    updatedAt: string;
}
export interface ChatMessageDocument extends ChatMessage {
    sessionId: string;
    read: boolean;
}
declare class ChatSessionModel extends DatabaseService<ChatSessionDocument> {
    constructor();
    findByParticipant(userId: string): ChatSessionDocument[];
    findByProperty(propertyId: string): ChatSessionDocument[];
    findByInterest(interestId: string): ChatSessionDocument | undefined;
}
declare class ChatMessageModel extends DatabaseService<ChatMessageDocument> {
    constructor();
    findBySession(sessionId: string): ChatMessageDocument[];
    findUnread(userId: string): ChatMessageDocument[];
    markAsRead(messageId: string): boolean;
}
export declare const chatSessionModel: ChatSessionModel;
export declare const chatMessageModel: ChatMessageModel;
declare const _default: {
    chatSessionModel: ChatSessionModel;
    chatMessageModel: ChatMessageModel;
};
export default _default;
//# sourceMappingURL=Chat.d.ts.map