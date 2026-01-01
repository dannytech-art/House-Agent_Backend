import DatabaseService from '../services/database.service.js';
class ChatSessionModel extends DatabaseService {
    constructor() {
        super('chat_sessions');
    }
    findByParticipant(userId) {
        return this.findMany(session => session.participantIds.includes(userId));
    }
    findByProperty(propertyId) {
        return this.findMany(session => session.propertyId === propertyId);
    }
    findByInterest(interestId) {
        return this.findOne(session => session.interestId === interestId);
    }
}
class ChatMessageModel extends DatabaseService {
    constructor() {
        super('chat_messages');
    }
    findBySession(sessionId) {
        return this.findMany(message => message.sessionId === sessionId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    findUnread(userId) {
        return this.findMany(message => !message.read && message.senderId !== userId);
    }
    markAsRead(messageId) {
        const message = this.update(messageId, { read: true });
        return !!message;
    }
}
export const chatSessionModel = new ChatSessionModel();
export const chatMessageModel = new ChatMessageModel();
export default { chatSessionModel, chatMessageModel };
//# sourceMappingURL=Chat.js.map