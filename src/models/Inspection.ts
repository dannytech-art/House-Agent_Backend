import { supabase } from '../services/supabase.service.js';

export interface InspectionDocument {
  id: string;
  propertyId: string;
  interestId: string;
  seekerId: string;
  agentId: string;
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper to convert database snake_case to camelCase
function toCamelCase(data: any): InspectionDocument {
  if (!data) return data;
  
  return {
    id: data.id,
    propertyId: data.property_id,
    interestId: data.interest_id,
    seekerId: data.seeker_id,
    agentId: data.agent_id,
    scheduledDate: data.scheduled_date,
    status: data.status || 'scheduled',
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Helper to convert camelCase to snake_case for database
function toSnakeCase(data: any): any {
  const result: any = {};
  
  if (data.propertyId !== undefined) result.property_id = data.propertyId;
  if (data.property_id !== undefined) result.property_id = data.property_id;
  if (data.interestId !== undefined) result.interest_id = data.interestId;
  if (data.interest_id !== undefined) result.interest_id = data.interest_id;
  if (data.seekerId !== undefined) result.seeker_id = data.seekerId;
  if (data.seeker_id !== undefined) result.seeker_id = data.seeker_id;
  if (data.agentId !== undefined) result.agent_id = data.agentId;
  if (data.agent_id !== undefined) result.agent_id = data.agent_id;
  if (data.scheduledDate !== undefined) result.scheduled_date = data.scheduledDate;
  if (data.scheduled_date !== undefined) result.scheduled_date = data.scheduled_date;
  if (data.status !== undefined) result.status = data.status;
  if (data.notes !== undefined) result.notes = data.notes;
  
  return result;
}

class InspectionModel {
  async create(inspectionData: Partial<InspectionDocument>): Promise<InspectionDocument> {
    const dbData = toSnakeCase(inspectionData);
    
    const { data, error } = await supabase
      .from('inspections')
      .insert([{
        property_id: dbData.property_id,
        interest_id: dbData.interest_id,
        seeker_id: dbData.seeker_id,
        agent_id: dbData.agent_id,
        scheduled_date: dbData.scheduled_date,
        notes: dbData.notes,
        status: 'scheduled'
      }])
      .select()
      .single();
    
    if (error) {
      // If inspections table doesn't exist, throw helpful error
      if (error.code === '42P01') {
        throw new Error('Inspections table not found. Please run the database migration.');
      }
      throw error;
    }
    return toCamelCase(data);
  }

  async findById(id: string): Promise<InspectionDocument | null> {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01') return null;
      throw error;
    }
    return data ? toCamelCase(data) : null;
  }

  async update(id: string, updates: Partial<InspectionDocument>): Promise<InspectionDocument | null> {
    const dbData = toSnakeCase(updates);
    
    const { data, error } = await supabase
      .from('inspections')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data ? toCamelCase(data) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', id);
    return !error;
  }

  async findByProperty(propertyId: string): Promise<InspectionDocument[]> {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('property_id', propertyId)
      .order('scheduled_date', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data || []).map(toCamelCase);
  }

  async findBySeeker(seekerId: string): Promise<InspectionDocument[]> {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('scheduled_date', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data || []).map(toCamelCase);
  }

  async findByAgent(agentId: string): Promise<InspectionDocument[]> {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('agent_id', agentId)
      .order('scheduled_date', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data || []).map(toCamelCase);
  }

  async findByInterest(interestId: string): Promise<InspectionDocument | null> {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('interest_id', interestId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01') return null;
      throw error;
    }
    return data ? toCamelCase(data) : null;
  }

  async findUpcoming(agentId: string): Promise<InspectionDocument[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('agent_id', agentId)
      .gte('scheduled_date', now)
      .eq('status', 'scheduled')
      .order('scheduled_date', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data || []).map(toCamelCase);
  }

  // Legacy sync methods for backwards compatibility
  findOne(predicate: (inspection: InspectionDocument) => boolean): InspectionDocument | undefined {
    console.warn('InspectionModel.findOne is deprecated. Use async methods instead.');
    return undefined;
  }

  findMany(predicate: (inspection: InspectionDocument) => boolean): InspectionDocument[] {
    console.warn('InspectionModel.findMany is deprecated. Use async methods instead.');
    return [];
  }
}

export const inspectionModel = new InspectionModel();
export default inspectionModel;
