import { supabase } from '../services/supabase.service.js';
// Helper to convert database snake_case to camelCase
function toCamelCase(data) {
    if (!data)
        return data;
    return {
        id: data.id,
        userId: data.user_id,
        token: data.token,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        lastActivity: data.last_activity
    };
}
// Helper to convert camelCase to snake_case for database
function toSnakeCase(data) {
    const result = {};
    if (data.userId !== undefined)
        result.user_id = data.userId;
    if (data.user_id !== undefined)
        result.user_id = data.user_id;
    if (data.token !== undefined)
        result.token = data.token;
    if (data.expiresAt !== undefined)
        result.expires_at = data.expiresAt;
    if (data.expires_at !== undefined)
        result.expires_at = data.expires_at;
    if (data.createdAt !== undefined)
        result.created_at = data.createdAt;
    if (data.created_at !== undefined)
        result.created_at = data.created_at;
    if (data.lastActivity !== undefined)
        result.last_activity = data.lastActivity;
    if (data.last_activity !== undefined)
        result.last_activity = data.last_activity;
    return result;
}
class SessionModel {
    async create(sessionData) {
        const dbData = toSnakeCase(sessionData);
        const { data, error } = await supabase
            .from('sessions')
            .insert([dbData])
            .select()
            .single();
        if (error) {
            // If sessions table doesn't exist, that's OK for now
            // Sessions are used for logout which isn't critical
            console.warn('Session creation failed (table may not exist):', error.message);
            return { ...sessionData, id: 'temp-' + Date.now() };
        }
        return toCamelCase(data);
    }
    async findById(id) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') {
            if (error.code === '42P01')
                return null;
            throw error;
        }
        return data ? toCamelCase(data) : null;
    }
    async findByToken(token) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('token', token)
            .single();
        if (error && error.code !== 'PGRST116') {
            if (error.code === '42P01')
                return null;
            console.warn('Session lookup failed:', error.message);
            return null;
        }
        return data ? toCamelCase(data) : null;
    }
    async findByUser(userId) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01')
                return [];
            throw error;
        }
        return (data || []).map(toCamelCase);
    }
    async delete(id) {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id);
        if (error && error.code !== '42P01') {
            console.warn('Session deletion failed:', error.message);
        }
        return !error;
    }
    async deleteByUser(userId) {
        const { data, error } = await supabase
            .from('sessions')
            .delete()
            .eq('user_id', userId)
            .select();
        if (error) {
            if (error.code === '42P01')
                return 0;
            throw error;
        }
        return data?.length || 0;
    }
    async findActive() {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .gt('expires_at', now)
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01')
                return [];
            throw error;
        }
        return (data || []).map(toCamelCase);
    }
    async cleanExpired() {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('sessions')
            .delete()
            .lte('expires_at', now)
            .select();
        if (error) {
            if (error.code === '42P01')
                return 0;
            throw error;
        }
        return data?.length || 0;
    }
    async update(id, updates) {
        const dbData = toSnakeCase(updates);
        const { data, error } = await supabase
            .from('sessions')
            .update(dbData)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data ? toCamelCase(data) : null;
    }
    // Legacy sync methods for backwards compatibility
    findOne(predicate) {
        console.warn('SessionModel.findOne is deprecated. Use async methods instead.');
        return undefined;
    }
    findMany(predicate) {
        console.warn('SessionModel.findMany is deprecated. Use async methods instead.');
        return [];
    }
}
export const sessionModel = new SessionModel();
export default sessionModel;
//# sourceMappingURL=Session.js.map