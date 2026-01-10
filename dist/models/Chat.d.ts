export interface ChatSessionDocument {
    id: string;
    participantIds: string[];
    propertyId?: string;
    interestId?: string;
    createdAt: string;
    lastMessageAt: string;
    updatedAt: string;
    created_at?: string;
    updated_at?: string;
}
export interface ChatMessageDocument {
    id: string;
    sessionId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    type: 'text' | 'property-brief' | 'inspection-schedule' | 'document';
    metadata?: Record<string, any>;
    timestamp: string;
    read: boolean;
    chat_session_id?: string;
}
declare class ChatSessionModel {
    create(sessionData: Partial<ChatSessionDocument>): Promise<ChatSessionDocument>;
    findById(id: string): Promise<ChatSessionDocument | null>;
    update(id: string, updates: Partial<ChatSessionDocument>): Promise<ChatSessionDocument | null>;
    delete(id: string): Promise<boolean>;
    findAll(): Promise<ChatSessionDocument[]>;
    findByParticipant(userId: string): Promise<ChatSessionDocument[]>;
    findByProperty(propertyId: string): Promise<ChatSessionDocument[]>;
    findByInterest(interestId: string): Promise<ChatSessionDocument | null>;
    findOne(predicate: (session: ChatSessionDocument) => boolean): ChatSessionDocument | undefined;
    findMany(predicate: (session: ChatSessionDocument) => boolean): ChatSessionDocument[];
}
declare class ChatMessageModel {
    create(messageData: Partial<ChatMessageDocument>): Promise<ChatMessageDocument>;
    findById(id: string): Promise<ChatMessageDocument | null>;
    update(id: string, updates: Partial<ChatMessageDocument>): Promise<ChatMessageDocument | null>;
    delete(id: string): Promise<boolean>;
    findBySession(sessionId: string): Promise<ChatMessageDocument[]>;
    findUnread(userId: string): Promise<ChatMessageDocument[]>;
    markAsRead(messageId: string): Promise<boolean>;
    findOne(predicate: (message: ChatMessageDocument) => boolean): ChatMessageDocument | undefined;
    findMany(predicate: (message: ChatMessageDocument) => boolean): ChatMessageDocument[];
}
export declare const chatSessionModel: ChatSessionModel;
export declare const chatMessageModel: ChatMessageModel;
declare const _default: {
    chatSessionModel: ChatSessionModel;
    chatMessageModel: ChatMessageModel;
};
export default _default;
//# sourceMappingURL=Chat.d.ts.map