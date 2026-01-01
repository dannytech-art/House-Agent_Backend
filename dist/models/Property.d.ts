import DatabaseService from '../services/database.service.js';
import { Property } from '../types/index.js';
export interface PropertyDocument extends Property {
    createdAt: string;
    updatedAt: string;
}
declare class PropertyModel extends DatabaseService<PropertyDocument> {
    constructor();
    findByAgent(agentId: string): PropertyDocument[];
    findByLocation(location: string): PropertyDocument[];
    findByType(type: string): PropertyDocument[];
    findFeatured(): PropertyDocument[];
    findAvailable(): PropertyDocument[];
    findByPriceRange(minPrice?: number, maxPrice?: number): PropertyDocument[];
    search(filters: {
        location?: string;
        type?: string;
        minPrice?: number;
        maxPrice?: number;
        bedrooms?: number;
        agentId?: string;
        featured?: boolean;
        status?: string;
    }): PropertyDocument[];
}
export declare const propertyModel: PropertyModel;
export default propertyModel;
//# sourceMappingURL=Property.d.ts.map