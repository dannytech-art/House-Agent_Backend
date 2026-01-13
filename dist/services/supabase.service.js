import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables before anything else
dotenv.config({ path: path.join(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
let supabaseInstance = null;
function initializeSupabase() {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('⚠️ Supabase configuration missing!');
        console.error('Required environment variables:');
        console.error('- SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
        console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
        console.error('');
        console.error('📋 To configure Supabase:');
        console.error('   1. Go to your Supabase project dashboard');
        console.error('   2. Navigate to Settings > API');
        console.error('   3. Copy the URL and service_role key');
        console.error('   4. Add them to your .env file:');
        console.error('      SUPABASE_URL=https://your-project.supabase.co');
        console.error('      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
        console.error('');
        return null;
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
supabaseInstance = initializeSupabase();
// Get supabase client - throws if not configured
function getSupabase() {
    if (!supabaseInstance) {
        throw new Error('Database not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env');
    }
    return supabaseInstance;
}
// Export supabase client getter
export const supabase = new Proxy({}, {
    get(_, prop) {
        const client = getSupabase();
        const value = client[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});
// Check if Supabase is configured
export function isSupabaseConfigured() {
    return !!(supabaseUrl && supabaseServiceKey && supabaseInstance);
}
// Helper to ensure Supabase is available
function ensureSupabase() {
    if (!supabaseInstance) {
        throw new Error('Database not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.');
    }
    return supabaseInstance;
}
// Test database connection
export async function testConnection() {
    if (!isSupabaseConfigured()) {
        console.error('❌ Supabase is not configured');
        return false;
    }
    try {
        // Simple query to test connection - just check if we can reach the database
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            // Check for common errors
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                console.log('⚠️ Database connected but tables not created yet. Run the SQL schema.');
                return true; // Connection works, just no tables
            }
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
        console.log('✅ Database connection successful');
        return true;
    }
    catch (error) {
        // Handle network errors gracefully
        if (error.message?.includes('fetch failed') || error.cause?.code === 'ENOTFOUND') {
            console.error('❌ Cannot reach Supabase. Check your internet connection or SUPABASE_URL.');
        }
        else {
            console.error('❌ Database connection error:', error.message || error);
        }
        return false;
    }
}
// Generic database operations
export class SupabaseDB {
    // ============================================
    // USER OPERATIONS
    // ============================================
    static async createUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async findUserByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
        if (error && error.code !== 'PGRST116')
            throw error; // PGRST116 = no rows returned
        return data;
    }
    static async findUserById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    static async updateUser(id, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async getAgents() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'agent')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    // ============================================
    // PROPERTY OPERATIONS
    // ============================================
    static async createProperty(propertyData) {
        const { data, error } = await supabase
            .from('properties')
            .insert([propertyData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async findPropertyById(id) {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    static async getAllProperties(filters) {
        let query = supabase
            .from('properties')
            .select('*')
            .order('posted_at', { ascending: false });
        if (filters?.location) {
            query = query.ilike('location', `%${filters.location}%`);
        }
        if (filters?.type) {
            query = query.eq('type', filters.type);
        }
        if (filters?.minPrice) {
            query = query.gte('price', filters.minPrice);
        }
        if (filters?.maxPrice) {
            query = query.lte('price', filters.maxPrice);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    static async getPropertiesByAgent(agentId) {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('agent_id', agentId)
            .order('posted_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async updateProperty(id, updates) {
        const { data, error } = await supabase
            .from('properties')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async deleteProperty(id) {
        const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return true;
    }
    // ============================================
    // INTEREST OPERATIONS
    // ============================================
    static async createInterest(interestData) {
        const { data, error } = await supabase
            .from('interests')
            .insert([interestData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async findInterestById(id) {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    static async getInterestsByProperty(propertyId) {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async getInterestsBySeeker(seekerId) {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('seeker_id', seekerId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async updateInterest(id, updates) {
        const { data, error } = await supabase
            .from('interests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async checkExistingInterest(propertyId, seekerId) {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('property_id', propertyId)
            .eq('seeker_id', seekerId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    // ============================================
    // CHAT SESSION OPERATIONS
    // ============================================
    static async createChatSession(sessionData) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert([sessionData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async findChatSessionById(id) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    static async getChatSessionsByParticipant(userId) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .contains('participant_ids', [userId])
            .order('last_message_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async getChatSessionByInterest(interestId) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('interest_id', interestId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    static async updateChatSession(id, updates) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // ============================================
    // CHAT MESSAGE OPERATIONS
    // ============================================
    static async createChatMessage(messageData) {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([messageData])
            .select()
            .single();
        if (error)
            throw error;
        // Update last_message_at on the chat session
        await supabase
            .from('chat_sessions')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', messageData.chat_session_id);
        return data;
    }
    static async getMessagesBySession(sessionId, limit = 50) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_session_id', sessionId)
            .order('timestamp', { ascending: true })
            .limit(limit);
        if (error)
            throw error;
        return data || [];
    }
    // ============================================
    // TRANSACTION OPERATIONS
    // ============================================
    static async createTransaction(transactionData) {
        const { data, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async findTransactionById(id) {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    static async getTransactionsByUser(userId) {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async updateTransaction(id, updates) {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // ============================================
    // CREDIT BUNDLE OPERATIONS
    // ============================================
    static async getCreditBundles() {
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .eq('active', true)
            .order('price', { ascending: true });
        if (error)
            throw error;
        return data || [];
    }
    static async findCreditBundleById(id) {
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    // ============================================
    // NOTIFICATION OPERATIONS
    // ============================================
    static async createNotification(notificationData) {
        const { data, error } = await supabase
            .from('notifications')
            .insert([notificationData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async getNotificationsByUser(userId) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('target_user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async markNotificationAsRead(id) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async markAllNotificationsAsRead(userId) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('target_user_id', userId)
            .eq('read', false)
            .select();
        if (error)
            throw error;
        return data;
    }
    // ============================================
    // INSPECTION OPERATIONS
    // ============================================
    static async createInspection(inspectionData) {
        // Using a different approach since inspections table might not exist in schema
        // We'll add it to a general table or create if needed
        const { data, error } = await supabase
            .from('inspections')
            .insert([{
                ...inspectionData,
                status: 'scheduled'
            }])
            .select()
            .single();
        if (error) {
            // If table doesn't exist, we'll store in a different way
            if (error.code === '42P01') {
                console.error('Inspections table does not exist. Please run the schema migration.');
                throw new Error('Inspections table not found. Please create it in Supabase.');
            }
            throw error;
        }
        return data;
    }
    static async getInspectionsByProperty(propertyId) {
        const { data, error } = await supabase
            .from('inspections')
            .select('*')
            .eq('property_id', propertyId)
            .order('scheduled_date', { ascending: true });
        if (error && error.code !== '42P01')
            throw error;
        return data || [];
    }
    static async getInspectionsBySeeker(seekerId) {
        const { data, error } = await supabase
            .from('inspections')
            .select('*')
            .eq('seeker_id', seekerId)
            .order('scheduled_date', { ascending: true });
        if (error && error.code !== '42P01')
            throw error;
        return data || [];
    }
    static async getInspectionsByAgent(agentId) {
        const { data, error } = await supabase
            .from('inspections')
            .select('*')
            .eq('agent_id', agentId)
            .order('scheduled_date', { ascending: true });
        if (error && error.code !== '42P01')
            throw error;
        return data || [];
    }
    static async updateInspection(id, updates) {
        const { data, error } = await supabase
            .from('inspections')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // ============================================
    // PROPERTY REQUEST OPERATIONS
    // ============================================
    static async createPropertyRequest(requestData) {
        const { data, error } = await supabase
            .from('property_requests')
            .insert([requestData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async getPropertyRequestsBySeeker(seekerId) {
        const { data, error } = await supabase
            .from('property_requests')
            .select('*')
            .eq('seeker_id', seekerId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    static async getAllPropertyRequests(status) {
        let query = supabase
            .from('property_requests')
            .select('*')
            .order('created_at', { ascending: false });
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    // ============================================
    // WATCHLIST OPERATIONS
    // ============================================
    static async addToWatchlist(userId, propertyId) {
        const { data, error } = await supabase
            .from('watchlist')
            .insert([{ user_id: userId, property_id: propertyId }])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async removeFromWatchlist(userId, propertyId) {
        const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', userId)
            .eq('property_id', propertyId);
        if (error)
            throw error;
        return true;
    }
    static async getWatchlistByUser(userId) {
        const { data, error } = await supabase
            .from('watchlist')
            .select(`
        *,
        properties(*)
      `)
            .eq('user_id', userId);
        if (error)
            throw error;
        return data || [];
    }
    static async isPropertyInWatchlist(userId, propertyId) {
        const { data, error } = await supabase
            .from('watchlist')
            .select('id')
            .eq('user_id', userId)
            .eq('property_id', propertyId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return !!data;
    }
}
export default supabase;
//# sourceMappingURL=supabase.service.js.map