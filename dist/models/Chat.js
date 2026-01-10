// @ts-nocheck
import { SupabaseDB, supabase } from '../services/supabase.service.js';
// Helper to convert chat session from database
function sessionToCamelCase(data) {
    if (!data)
        return data;
    return {
        id: data.id,
        participantIds: data.participant_ids || [],
        propertyId: data.property_id,
        interestId: data.interest_id,
        createdAt: data.created_at,
        lastMessageAt: data.last_message_at,
        updatedAt: data.updated_at || data.last_message_at
    };
}
// Helper to convert chat message from database
function messageToCamelCase(data) {
    if (!data)
        return data;
    return {
        id: data.id,
        sessionId: data.chat_session_id,
        senderId: data.sender_id,
        senderName: data.sender_name,
        senderAvatar: data.sender_avatar,
        message: data.message,
        type: data.type || 'text',
        metadata: data.metadata,
        timestamp: data.timestamp,
        read: data.read || false
    };
}
// Helper to convert camelCase to snake_case for chat session
function sessionToSnakeCase(data) {
    const result = {};
    if (data.participantIds !== undefined)
        result.participant_ids = data.participantIds;
    if (data.participant_ids !== undefined)
        result.participant_ids = data.participant_ids;
    if (data.propertyId !== undefined)
        result.property_id = data.propertyId;
    if (data.property_id !== undefined)
        result.property_id = data.property_id;
    if (data.interestId !== undefined)
        result.interest_id = data.interestId;
    if (data.interest_id !== undefined)
        result.interest_id = data.interest_id;
    if (data.lastMessageAt !== undefined)
        result.last_message_at = data.lastMessageAt;
    return result;
}
// Helper to convert camelCase to snake_case for chat message
function messageToSnakeCase(data) {
    const result = {};
    if (data.sessionId !== undefined)
        result.chat_session_id = data.sessionId;
    if (data.chat_session_id !== undefined)
        result.chat_session_id = data.chat_session_id;
    if (data.senderId !== undefined)
        result.sender_id = data.senderId;
    if (data.sender_id !== undefined)
        result.sender_id = data.sender_id;
    if (data.senderName !== undefined)
        result.sender_name = data.senderName;
    if (data.sender_name !== undefined)
        result.sender_name = data.sender_name;
    if (data.senderAvatar !== undefined)
        result.sender_avatar = data.senderAvatar;
    if (data.sender_avatar !== undefined)
        result.sender_avatar = data.sender_avatar;
    if (data.message !== undefined)
        result.message = data.message;
    if (data.type !== undefined)
        result.type = data.type;
    if (data.metadata !== undefined)
        result.metadata = data.metadata;
    if (data.read !== undefined)
        result.read = data.read;
    return result;
}
class ChatSessionModel {
    async create(sessionData) {
        const dbData = sessionToSnakeCase(sessionData);
        const result = await SupabaseDB.createChatSession({
            participant_ids: dbData.participant_ids,
            property_id: dbData.property_id,
            interest_id: dbData.interest_id
        });
        return sessionToCamelCase(result);
    }
    async findById(id) {
        const result = await SupabaseDB.findChatSessionById(id);
        return result ? sessionToCamelCase(result) : null;
    }
    async update(id, updates) {
        const dbData = sessionToSnakeCase(updates);
        const result = await SupabaseDB.updateChatSession(id, dbData);
        return result ? sessionToCamelCase(result) : null;
    }
    async delete(id) {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', id);
        return !error;
    }
    async findAll() {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('last_message_at', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(sessionToCamelCase);
    }
    async findByParticipant(userId) {
        const results = await SupabaseDB.getChatSessionsByParticipant(userId);
        return results.map(sessionToCamelCase);
    }
    async findByProperty(propertyId) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('property_id', propertyId)
            .order('last_message_at', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(sessionToCamelCase);
    }
    async findByInterest(interestId) {
        const result = await SupabaseDB.getChatSessionByInterest(interestId);
        return result ? sessionToCamelCase(result) : null;
    }
    // Legacy sync methods for backwards compatibility
    findOne(predicate) {
        console.warn('ChatSessionModel.findOne is deprecated. Use async methods instead.');
        return undefined;
    }
    findMany(predicate) {
        console.warn('ChatSessionModel.findMany is deprecated. Use async methods instead.');
        return [];
    }
}
class ChatMessageModel {
    async create(messageData) {
        const dbData = messageToSnakeCase(messageData);
        const result = await SupabaseDB.createChatMessage({
            chat_session_id: dbData.chat_session_id,
            sender_id: dbData.sender_id,
            sender_name: dbData.sender_name,
            sender_avatar: dbData.sender_avatar,
            message: dbData.message,
            type: dbData.type,
            metadata: dbData.metadata
        });
        return messageToCamelCase(result);
    }
    async findById(id) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data ? messageToCamelCase(data) : null;
    }
    async update(id, updates) {
        const dbData = messageToSnakeCase(updates);
        const { data, error } = await supabase
            .from('chat_messages')
            .update(dbData)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data ? messageToCamelCase(data) : null;
    }
    async delete(id) {
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', id);
        return !error;
    }
    async findBySession(sessionId) {
        const results = await SupabaseDB.getMessagesBySession(sessionId);
        return results.map(messageToCamelCase);
    }
    async findUnread(userId) {
        // Get all sessions the user is part of
        const sessions = await SupabaseDB.getChatSessionsByParticipant(userId);
        const sessionIds = sessions.map(s => s.id);
        if (sessionIds.length === 0)
            return [];
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .in('chat_session_id', sessionIds)
            .neq('sender_id', userId)
            .eq('read', false)
            .order('timestamp', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(messageToCamelCase);
    }
    async markAsRead(messageId) {
        const { error } = await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('id', messageId);
        return !error;
    }
    // Legacy sync methods for backwards compatibility
    findOne(predicate) {
        console.warn('ChatMessageModel.findOne is deprecated. Use async methods instead.');
        return undefined;
    }
    findMany(predicate) {
        console.warn('ChatMessageModel.findMany is deprecated. Use async methods instead.');
        return [];
    }
}
export const chatSessionModel = new ChatSessionModel();
export const chatMessageModel = new ChatMessageModel();
export default { chatSessionModel, chatMessageModel };
//# sourceMappingURL=Chat.js.map