import DatabaseService from '../services/database.service.js';
import { PropertyRequest, PropertyType } from '../types/index.js';

export interface PropertyRequestDocument extends PropertyRequest {
  createdAt: string;
  updatedAt: string;
}

class PropertyRequestModel extends DatabaseService<PropertyRequestDocument> {
  constructor() {
    super('property_requests');
  }

  findBySeeker(seekerId: string): PropertyRequestDocument[] {
    return this.findMany(request => request.seekerId === seekerId);
  }

  findByLocation(location: string): PropertyRequestDocument[] {
    return this.findMany(request => 
      request.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  findByType(type: PropertyType): PropertyRequestDocument[] {
    return this.findMany(request => request.type === type);
  }

  findActive(): PropertyRequestDocument[] {
    return this.findMany(request => request.status === 'active');
  }

  findByBudgetRange(minBudget?: number, maxBudget?: number): PropertyRequestDocument[] {
    return this.findMany(request => {
      if (minBudget && request.maxBudget < minBudget) return false;
      if (maxBudget && request.minBudget > maxBudget) return false;
      return true;
    });
  }

  search(filters: {
    location?: string;
    type?: PropertyType;
    minBudget?: number;
    maxBudget?: number;
    bedrooms?: number;
    seekerId?: string;
    status?: 'active' | 'fulfilled' | 'expired';
  }): PropertyRequestDocument[] {
    return this.findMany(request => {
      if (filters.location && 
          !request.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      if (filters.type && request.type !== filters.type) return false;
      // Check if property budget overlaps with filter budget range
      if (filters.minBudget && request.maxBudget < filters.minBudget) return false;
      if (filters.maxBudget && request.minBudget > filters.maxBudget) return false;
      if (filters.bedrooms && request.bedrooms !== filters.bedrooms) return false;
      if (filters.seekerId && request.seekerId !== filters.seekerId) return false;
      if (filters.status && request.status !== filters.status) return false;
      return true;
    });
  }

  incrementMatches(id: string): PropertyRequestDocument | undefined {
    const request = this.findById(id);
    if (!request) return undefined;
    return this.update(id, { 
      matches: (request.matches || 0) + 1,
      updatedAt: new Date().toISOString()
    });
  }
}

export const propertyRequestModel = new PropertyRequestModel();
export default propertyRequestModel;











