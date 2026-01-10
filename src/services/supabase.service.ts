import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables before anything else
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabaseInstance: SupabaseClient | null = null;

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
function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error('Database not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env');
  }
  return supabaseInstance;
}

// Export supabase client getter
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey && supabaseInstance);
}

// Helper to ensure Supabase is available
function ensureSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error('Database not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.');
  }
  return supabaseInstance;
}

// Test database connection
export async function testConnection(): Promise<boolean> {
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
  } catch (error: any) {
    // Handle network errors gracefully
    if (error.message?.includes('fetch failed') || error.cause?.code === 'ENOTFOUND') {
      console.error('❌ Cannot reach Supabase. Check your internet connection or SUPABASE_URL.');
    } else {
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
  
  static async createUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    phone: string;
    role: 'seeker' | 'agent' | 'admin';
    agent_type?: string;
    avatar?: string;
  }) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  static async findUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateUser(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getAgents() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'agent')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // ============================================
  // PROPERTY OPERATIONS
  // ============================================

  static async createProperty(propertyData: {
    title: string;
    type: string;
    price: number;
    location: string;
    area: string;
    bedrooms?: number;
    bathrooms?: number;
    images?: string[];
    videos?: string[];
    amenities?: string[];
    description: string;
    agent_id: string;
    agent_type?: string;
    agent_name?: string;
    agent_verified?: boolean;
  }) {
    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findPropertyById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getAllProperties(filters?: {
    location?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
  }) {
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
    if (error) throw error;
    return data || [];
  }

  static async getPropertiesByAgent(agentId: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('agent_id', agentId)
      .order('posted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async updateProperty(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteProperty(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  // ============================================
  // INTEREST OPERATIONS
  // ============================================

  static async createInterest(interestData: {
    property_id: string;
    seeker_id: string;
    seeker_name: string;
    seeker_phone: string;
    message: string;
    seriousness_score?: number;
  }) {
    const { data, error } = await supabase
      .from('interests')
      .insert([interestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findInterestById(id: string) {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getInterestsByProperty(propertyId: string) {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getInterestsBySeeker(seekerId: string) {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async updateInterest(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('interests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async checkExistingInterest(propertyId: string, seekerId: string) {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .eq('property_id', propertyId)
      .eq('seeker_id', seekerId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // ============================================
  // CHAT SESSION OPERATIONS
  // ============================================

  static async createChatSession(sessionData: {
    participant_ids: string[];
    property_id?: string;
    interest_id?: string;
  }) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([sessionData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findChatSessionById(id: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getChatSessionsByParticipant(userId: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getChatSessionByInterest(interestId: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('interest_id', interestId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateChatSession(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============================================
  // CHAT MESSAGE OPERATIONS
  // ============================================

  static async createChatMessage(messageData: {
    chat_session_id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar?: string;
    message: string;
    type?: string;
    metadata?: any;
  }) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([messageData])
      .select()
      .single();
    
    if (error) throw error;

    // Update last_message_at on the chat session
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', messageData.chat_session_id);

    return data;
  }

  static async getMessagesBySession(sessionId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('timestamp', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  // ============================================
  // TRANSACTION OPERATIONS
  // ============================================

  static async createTransaction(transactionData: {
    user_id: string;
    type: 'credit_purchase' | 'credit_spent' | 'wallet_load' | 'wallet_debit';
    amount: number;
    credits?: number;
    description: string;
    status?: 'completed' | 'pending' | 'failed';
    bundle_id?: string;
  }) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findTransactionById(id: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getTransactionsByUser(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async updateTransaction(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
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
    
    if (error) throw error;
    return data || [];
  }

  static async findCreditBundleById(id: string) {
    const { data, error } = await supabase
      .from('credit_bundles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================

  static async createNotification(notificationData: {
    target_user_id: string;
    title: string;
    message: string;
    type: 'interest' | 'message' | 'system' | 'achievement' | 'marketplace' | 'admin';
    metadata?: any;
  }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getNotificationsByUser(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async markNotificationAsRead(id: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async markAllNotificationsAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('target_user_id', userId)
      .eq('read', false)
      .select();
    
    if (error) throw error;
    return data;
  }

  // ============================================
  // INSPECTION OPERATIONS
  // ============================================

  static async createInspection(inspectionData: {
    property_id: string;
    interest_id: string;
    seeker_id: string;
    agent_id: string;
    scheduled_date: string;
    notes?: string;
  }) {
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

  static async getInspectionsByProperty(propertyId: string) {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('property_id', propertyId)
      .order('scheduled_date', { ascending: true });
    
    if (error && error.code !== '42P01') throw error;
    return data || [];
  }

  static async getInspectionsBySeeker(seekerId: string) {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('scheduled_date', { ascending: true });
    
    if (error && error.code !== '42P01') throw error;
    return data || [];
  }

  static async getInspectionsByAgent(agentId: string) {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('agent_id', agentId)
      .order('scheduled_date', { ascending: true });
    
    if (error && error.code !== '42P01') throw error;
    return data || [];
  }

  static async updateInspection(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('inspections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============================================
  // PROPERTY REQUEST OPERATIONS
  // ============================================

  static async createPropertyRequest(requestData: {
    seeker_id: string;
    type: string;
    location: string;
    min_budget: number;
    max_budget: number;
    bedrooms: number;
    description?: string;
  }) {
    const { data, error } = await supabase
      .from('property_requests')
      .insert([requestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getPropertyRequestsBySeeker(seekerId: string) {
    const { data, error } = await supabase
      .from('property_requests')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getAllPropertyRequests(status?: string) {
    let query = supabase
      .from('property_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ============================================
  // WATCHLIST OPERATIONS
  // ============================================

  static async addToWatchlist(userId: string, propertyId: string) {
    const { data, error } = await supabase
      .from('watchlist')
      .insert([{ user_id: userId, property_id: propertyId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async removeFromWatchlist(userId: string, propertyId: string) {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    
    if (error) throw error;
    return true;
  }

  static async getWatchlistByUser(userId: string) {
    const { data, error } = await supabase
      .from('watchlist')
      .select(`
        *,
        properties(*)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  }

  static async isPropertyInWatchlist(userId: string, propertyId: string) {
    const { data, error } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
}

export default supabase;

