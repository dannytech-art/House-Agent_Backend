import { Property } from '../types/index.js';
export interface PropertyDocument extends Omit<Property, 'createdAt' | 'updatedAt'> {
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
}
declare class PropertyModel {
    create(propertyData: Partial<PropertyDocument>): Promise<PropertyDocument>;
    findById(id: string): Promise<PropertyDocument | null>;
    update(id: string, updates: Partial<PropertyDocument>): Promise<PropertyDocument | null>;
    delete(id: string): Promise<boolean>;
    findAll(filters?: {
        location?: string;
        type?: string;
        minPrice?: number;
        maxPrice?: number;
        status?: string;
    }): Promise<PropertyDocument[]>;
    findByAgent(agentId: string): Promise<PropertyDocument[]>;
    findByLocation(location: string): Promise<PropertyDocument[]>;
    findByType(type: string): Promise<PropertyDocument[]>;
    findFeatured(): Promise<PropertyDocument[]>;
    findAvailable(): Promise<PropertyDocument[]>;
    findByPriceRange(minPrice?: number, maxPrice?: number): Promise<PropertyDocument[]>;
    search(filters: {
        location?: string;
        type?: string;
        minPrice?: number;
        maxPrice?: number;
        bedrooms?: number;
        agentId?: string;
        featured?: boolean;
        status?: string;
    }): Promise<PropertyDocument[]>;
    findOne(predicate: (property: PropertyDocument) => boolean): PropertyDocument | undefined;
    findMany(predicate: (property: PropertyDocument) => boolean): PropertyDocument[];
}
export declare const propertyModel: PropertyModel;
export default propertyModel;
//# sourceMappingURL=Property.d.ts.map