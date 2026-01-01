import DatabaseService from '../services/database.service.js';
import { Property } from '../types/index.js';

export interface PropertyDocument extends Property {
  createdAt: string;
  updatedAt: string;
}

class PropertyModel extends DatabaseService<PropertyDocument> {
  constructor() {
    super('properties');
  }

  findByAgent(agentId: string): PropertyDocument[] {
    return this.findMany(property => property.agentId === agentId);
  }

  findByLocation(location: string): PropertyDocument[] {
    return this.findMany(property => 
      property.location.toLowerCase().includes(location.toLowerCase()) ||
      property.area.toLowerCase().includes(location.toLowerCase())
    );
  }

  findByType(type: string): PropertyDocument[] {
    return this.findMany(property => property.type === type);
  }

  findFeatured(): PropertyDocument[] {
    return this.findMany(property => property.featured);
  }

  findAvailable(): PropertyDocument[] {
    return this.findMany(property => property.status === 'available');
  }

  findByPriceRange(minPrice?: number, maxPrice?: number): PropertyDocument[] {
    return this.findMany(property => {
      if (minPrice && property.price < minPrice) return false;
      if (maxPrice && property.price > maxPrice) return false;
      return true;
    });
  }

  search(filters: {
    location?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    agentId?: string;
    featured?: boolean;
    status?: string;
  }): PropertyDocument[] {
    return this.findMany(property => {
      if (filters.location && 
          !property.location.toLowerCase().includes(filters.location.toLowerCase()) &&
          !property.area.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      if (filters.type && property.type !== filters.type) return false;
      if (filters.minPrice && property.price < filters.minPrice) return false;
      if (filters.maxPrice && property.price > filters.maxPrice) return false;
      if (filters.bedrooms && property.bedrooms !== filters.bedrooms) return false;
      if (filters.agentId && property.agentId !== filters.agentId) return false;
      if (filters.featured !== undefined && property.featured !== filters.featured) return false;
      if (filters.status && property.status !== filters.status) return false;
      return true;
    });
  }
}

export const propertyModel = new PropertyModel();
export default propertyModel;


