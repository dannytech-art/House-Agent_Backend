import { SupabaseDB, supabase } from '../services/supabase.service.js';

export interface NotificationDocument {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'interest' | 'chat' | 'message' | 'system' | 'achievement' | 'marketplace' | 'admin';
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

// Helper to convert database snake_case to camelCase
function toCamelCase(data: any): NotificationDocument {
  if (!data) return data;
  
  return {
    id: data.id,
    userId: data.target_user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    read: data.read || false,
    metadata: data.metadata,
    createdAt: data.created_at,
    readAt: data.read_at
  };
}

// Helper to convert camelCase to snake_case for database
function toSnakeCase(data: any): any {
  const result: any = {};
  
  if (data.userId !== undefined) result.target_user_id = data.userId;
  if (data.target_user_id !== undefined) result.target_user_id = data.target_user_id;
  if (data.title !== undefined) result.title = data.title;
  if (data.message !== undefined) result.message = data.message;
  if (data.type !== undefined) result.type = data.type;
  if (data.read !== undefined) result.read = data.read;
  if (data.metadata !== undefined) result.metadata = data.metadata;
  
  return result;
}

class NotificationModel {
  async create(notificationData: Partial<NotificationDocument>): Promise<NotificationDocument> {
    const dbData = toSnakeCase(notificationData);
    
    // Map our notification types to database types
    let dbType = dbData.type;
    if (['info', 'success', 'warning', 'error', 'chat'].includes(dbType)) {
      dbType = 'system'; // Map generic types to 'system'
    }
    
    const result = await SupabaseDB.createNotification({
      target_user_id: dbData.target_user_id,
      title: dbData.title,
      message: dbData.message,
      type: dbType,
      metadata: dbData.metadata
    });
    return toCamelCase(result);
  }

  async findById(id: string): Promise<NotificationDocument | null> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async update(id: string, updates: Partial<NotificationDocument>): Promise<NotificationDocument | null> {
    const dbData = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('notifications')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data ? toCamelCase(data) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    return !error;
  }

  async findByUser(userId: string): Promise<NotificationDocument[]> {
    const results = await SupabaseDB.getNotificationsByUser(userId);
    return results.map(toCamelCase);
  }

  async findUnread(userId: string): Promise<NotificationDocument[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async markAsRead(id: string): Promise<NotificationDocument | null> {
    const result = await SupabaseDB.markNotificationAsRead(id);
    return result ? toCamelCase(result) : null;
  }

  async markAllRead(userId: string): Promise<number> {
    const results = await SupabaseDB.markAllNotificationsAsRead(userId);
    return results?.length || 0;
  }

  async deleteByUser(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('target_user_id', userId)
      .select();
    
    if (error) throw error;
    return data?.length || 0;
  }

  // Legacy sync methods for backwards compatibility
  findOne(predicate: (notification: NotificationDocument) => boolean): NotificationDocument | undefined {
    console.warn('NotificationModel.findOne is deprecated. Use async methods instead.');
    return undefined;
  }

  findMany(predicate: (notification: NotificationDocument) => boolean): NotificationDocument[] {
    console.warn('NotificationModel.findMany is deprecated. Use async methods instead.');
    return [];
  }
}

export const notificationModel = new NotificationModel();
export default notificationModel;
