import { SupabaseDB, supabase } from '../services/supabase.service.js';
import { Property } from '../types/index.js';

export interface PropertyDocument extends Omit<Property, 'createdAt' | 'updatedAt'> {
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper to convert database snake_case to camelCase
function toCamelCase(data: any): PropertyDocument {
  if (!data) return data;
  
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    price: parseFloat(data.price) || 0,
    location: data.location,
    area: data.area,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    images: data.images || [],
    videos: data.videos || [],
    amenities: data.amenities || [],
    description: data.description,
    agentId: data.agent_id,
    agentType: data.agent_type,
    agentName: data.agent_name,
    agentVerified: data.agent_verified,
    postedAt: data.posted_at,
    featured: data.featured,
    status: data.status || 'available',
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Helper to convert camelCase to snake_case for database
function toSnakeCase(data: any): any {
  const result: any = {};
  
  if (data.title !== undefined) result.title = data.title;
  if (data.type !== undefined) result.type = data.type;
  if (data.price !== undefined) result.price = data.price;
  if (data.location !== undefined) result.location = data.location;
  if (data.area !== undefined) result.area = data.area;
  if (data.bedrooms !== undefined) result.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) result.bathrooms = data.bathrooms;
  if (data.images !== undefined) result.images = data.images;
  if (data.videos !== undefined) result.videos = data.videos;
  if (data.amenities !== undefined) result.amenities = data.amenities;
  if (data.description !== undefined) result.description = data.description;
  if (data.agentId !== undefined) result.agent_id = data.agentId;
  if (data.agent_id !== undefined) result.agent_id = data.agent_id;
  if (data.agentType !== undefined) result.agent_type = data.agentType;
  if (data.agent_type !== undefined) result.agent_type = data.agent_type;
  if (data.agentName !== undefined) result.agent_name = data.agentName;
  if (data.agent_name !== undefined) result.agent_name = data.agent_name;
  if (data.agentVerified !== undefined) result.agent_verified = data.agentVerified;
  if (data.agent_verified !== undefined) result.agent_verified = data.agent_verified;
  if (data.featured !== undefined) result.featured = data.featured;
  if (data.status !== undefined) result.status = data.status;
  
  return result;
}

class PropertyModel {
  async create(propertyData: Partial<PropertyDocument>): Promise<PropertyDocument> {
    const dbData = toSnakeCase(propertyData);
    const result = await SupabaseDB.createProperty({
      title: dbData.title,
      type: dbData.type,
      price: dbData.price,
      location: dbData.location,
      area: dbData.area || dbData.location,
      bedrooms: dbData.bedrooms,
      bathrooms: dbData.bathrooms,
      images: dbData.images || [],
      videos: dbData.videos || [],
      amenities: dbData.amenities || [],
      description: dbData.description,
      agent_id: dbData.agent_id,
      agent_type: dbData.agent_type,
      agent_name: dbData.agent_name,
      agent_verified: dbData.agent_verified
    });
    return toCamelCase(result);
  }

  async findById(id: string): Promise<PropertyDocument | null> {
    const result = await SupabaseDB.findPropertyById(id);
    return result ? toCamelCase(result) : null;
  }

  async update(id: string, updates: Partial<PropertyDocument>): Promise<PropertyDocument | null> {
    const dbData = toSnakeCase(updates);
    const result = await SupabaseDB.updateProperty(id, dbData);
    return result ? toCamelCase(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    return await SupabaseDB.deleteProperty(id);
  }

  async findAll(filters?: {
    location?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
  }): Promise<PropertyDocument[]> {
    const results = await SupabaseDB.getAllProperties(filters);
    return results.map(toCamelCase);
  }

  async findByAgent(agentId: string): Promise<PropertyDocument[]> {
    const results = await SupabaseDB.getPropertiesByAgent(agentId);
    return results.map(toCamelCase);
  }

  async findByLocation(location: string): Promise<PropertyDocument[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .or(`location.ilike.%${location}%,area.ilike.%${location}%`)
      .order('posted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findByType(type: string): Promise<PropertyDocument[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('type', type)
      .order('posted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findFeatured(): Promise<PropertyDocument[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('featured', true)
      .order('posted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findAvailable(): Promise<PropertyDocument[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'available')
      .order('posted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findByPriceRange(minPrice?: number, maxPrice?: number): Promise<PropertyDocument[]> {
    let query = supabase.from('properties').select('*');
    
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    
    const { data, error } = await query.order('posted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async search(filters: {
    location?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    agentId?: string;
    featured?: boolean;
    status?: string;
  }): Promise<PropertyDocument[]> {
    let query = supabase.from('properties').select('*');

    if (filters.location) {
      query = query.or(`location.ilike.%${filters.location}%,area.ilike.%${filters.location}%`);
    }
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.minPrice) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
    if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);
    if (filters.agentId) query = query.eq('agent_id', filters.agentId);
    if (filters.featured !== undefined) query = query.eq('featured', filters.featured);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('posted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  // Legacy sync methods for backwards compatibility
  findOne(predicate: (property: PropertyDocument) => boolean): PropertyDocument | undefined {
    console.warn('PropertyModel.findOne is deprecated. Use async methods instead.');
    return undefined;
  }

  findMany(predicate: (property: PropertyDocument) => boolean): PropertyDocument[] {
    console.warn('PropertyModel.findMany is deprecated. Use async methods instead.');
    return [];
  }
}

export const propertyModel = new PropertyModel();
export default propertyModel;
