import { Interest } from '../types/index.js';
export interface InterestDocument extends Omit<Interest, 'createdAt' | 'updatedAt'> {
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
}
declare class InterestModel {
    create(interestData: Partial<InterestDocument>): Promise<InterestDocument>;
    findById(id: string): Promise<InterestDocument | null>;
    update(id: string, updates: Partial<InterestDocument>): Promise<InterestDocument | null>;
    delete(id: string): Promise<boolean>;
    findAll(): Promise<InterestDocument[]>;
    findByProperty(propertyId: string): Promise<InterestDocument[]>;
    findBySeeker(seekerId: string): Promise<InterestDocument[]>;
    findByStatus(status: string): Promise<InterestDocument[]>;
    findUnlocked(): Promise<InterestDocument[]>;
    findPending(): Promise<InterestDocument[]>;
    checkExistingInterest(propertyId: string, seekerId: string): Promise<InterestDocument | null>;
    findOne(predicate: (interest: InterestDocument) => boolean): InterestDocument | undefined;
    findMany(predicate: (interest: InterestDocument) => boolean): InterestDocument[];
}
export declare const interestModel: InterestModel;
export default interestModel;
//# sourceMappingURL=Interest.d.ts.map