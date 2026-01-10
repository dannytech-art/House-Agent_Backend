import { SupabaseDB, supabase } from '../services/supabase.service.js';
import { User, Agent } from '../types/index.js';

export interface UserDocument extends Omit<User, 'active'> {
  password_hash: string;
  passwordHash?: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export interface AgentDocument extends Omit<Agent, 'active'> {
  password_hash: string;
  passwordHash?: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

// Helper to convert database snake_case to camelCase
function toCamelCase(data: any): any {
  if (!data) return data;
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: data.role,
    avatar: data.avatar,
    passwordHash: data.password_hash,
    verified: data.verified,
    emailVerified: data.email_verified || false,
    googleId: data.google_id,
    authProvider: data.auth_provider || 'email',
    agentType: data.agent_type,
    kycStatus: data.kyc_status,
    level: data.level,
    xp: data.xp,
    credits: data.credits || 0,
    walletBalance: data.wallet_balance || 0,
    streak: data.streak,
    totalListings: data.total_listings || 0,
    totalInterests: data.total_interests || 0,
    responseTime: data.response_time,
    rating: data.rating,
    tier: data.tier,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    active: true
  };
}

// Helper to convert camelCase to snake_case for database
function toSnakeCase(data: any): any {
  const result: any = {};
  
  if (data.email !== undefined) result.email = data.email;
  if (data.name !== undefined) result.name = data.name;
  if (data.phone !== undefined) result.phone = data.phone;
  if (data.role !== undefined) result.role = data.role;
  if (data.avatar !== undefined) result.avatar = data.avatar;
  if (data.passwordHash !== undefined) result.password_hash = data.passwordHash;
  if (data.password_hash !== undefined) result.password_hash = data.password_hash;
  if (data.verified !== undefined) result.verified = data.verified;
  if (data.emailVerified !== undefined) result.email_verified = data.emailVerified;
  if (data.email_verified !== undefined) result.email_verified = data.email_verified;
  if (data.googleId !== undefined) result.google_id = data.googleId;
  if (data.google_id !== undefined) result.google_id = data.google_id;
  if (data.authProvider !== undefined) result.auth_provider = data.authProvider;
  if (data.auth_provider !== undefined) result.auth_provider = data.auth_provider;
  if (data.agentType !== undefined) result.agent_type = data.agentType;
  if (data.agent_type !== undefined) result.agent_type = data.agent_type;
  if (data.kycStatus !== undefined) result.kyc_status = data.kycStatus;
  if (data.level !== undefined) result.level = data.level;
  if (data.xp !== undefined) result.xp = data.xp;
  if (data.credits !== undefined) result.credits = data.credits;
  if (data.walletBalance !== undefined) result.wallet_balance = data.walletBalance;
  if (data.streak !== undefined) result.streak = data.streak;
  if (data.totalListings !== undefined) result.total_listings = data.totalListings;
  if (data.totalInterests !== undefined) result.total_interests = data.totalInterests;
  if (data.responseTime !== undefined) result.response_time = data.responseTime;
  if (data.rating !== undefined) result.rating = data.rating;
  if (data.tier !== undefined) result.tier = data.tier;
  
  return result;
}

class UserModel {
  async create(userData: Partial<UserDocument | AgentDocument>): Promise<UserDocument | AgentDocument> {
    const dbData = toSnakeCase(userData);
    const result = await SupabaseDB.createUser({
      email: dbData.email,
      password_hash: dbData.password_hash,
      name: dbData.name,
      phone: dbData.phone,
      role: dbData.role,
      agent_type: dbData.agent_type,
      avatar: dbData.avatar
    });
    return toCamelCase(result);
  }

  async findById(id: string): Promise<UserDocument | AgentDocument | null> {
    const result = await SupabaseDB.findUserById(id);
    return result ? toCamelCase(result) : null;
  }

  async findByEmail(email: string): Promise<UserDocument | AgentDocument | null> {
    const result = await SupabaseDB.findUserByEmail(email);
    return result ? toCamelCase(result) : null;
  }

  async update(id: string, updates: Partial<UserDocument | AgentDocument>): Promise<UserDocument | AgentDocument | null> {
    const dbData = toSnakeCase(updates);
    const result = await SupabaseDB.updateUser(id, dbData);
    return result ? toCamelCase(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    return !error;
  }

  async findAll(): Promise<(UserDocument | AgentDocument)[]> {
    const results = await SupabaseDB.getAllUsers();
    return results.map(toCamelCase);
  }

  async findAgents(): Promise<AgentDocument[]> {
    const results = await SupabaseDB.getAgents();
    return results.map(toCamelCase);
  }

  async findSeekers(): Promise<UserDocument[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'seeker')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findAdmins(): Promise<UserDocument[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | AgentDocument | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  // Legacy sync methods for backwards compatibility - now async
  findOne(predicate: (user: UserDocument | AgentDocument) => boolean): UserDocument | AgentDocument | undefined {
    console.warn('UserModel.findOne is deprecated. Use async methods instead.');
    return undefined;
  }

  findMany(predicate: (user: UserDocument | AgentDocument) => boolean): (UserDocument | AgentDocument)[] {
    console.warn('UserModel.findMany is deprecated. Use async methods instead.');
    return [];
  }
}

export const userModel = new UserModel();
export default userModel;
