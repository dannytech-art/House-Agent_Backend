import DatabaseService from '../services/database.service.js';
import { PropertyRequest, PropertyType } from '../types/index.js';
export interface PropertyRequestDocument extends PropertyRequest {
    createdAt: string;
    updatedAt: string;
}
declare class PropertyRequestModel extends DatabaseService<PropertyRequestDocument> {
    constructor();
    findBySeeker(seekerId: string): PropertyRequestDocument[];
    findByLocation(location: string): PropertyRequestDocument[];
    findByType(type: PropertyType): PropertyRequestDocument[];
    findActive(): PropertyRequestDocument[];
    findByBudgetRange(minBudget?: number, maxBudget?: number): PropertyRequestDocument[];
    search(filters: {
        location?: string;
        type?: PropertyType;
        minBudget?: number;
        maxBudget?: number;
        bedrooms?: number;
        seekerId?: string;
        status?: 'active' | 'fulfilled' | 'expired';
    }): PropertyRequestDocument[];
    incrementMatches(id: string): PropertyRequestDocument | undefined;
}
export declare const propertyRequestModel: PropertyRequestModel;
export default propertyRequestModel;
//# sourceMappingURL=PropertyRequest.d.ts.map