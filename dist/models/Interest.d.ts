import DatabaseService from '../services/database.service.js';
import { Interest } from '../types/index.js';
export interface InterestDocument extends Interest {
    updatedAt: string;
}
declare class InterestModel extends DatabaseService<InterestDocument> {
    constructor();
    findByProperty(propertyId: string): InterestDocument[];
    findBySeeker(seekerId: string): InterestDocument[];
    findByStatus(status: string): InterestDocument[];
    findUnlocked(): InterestDocument[];
    findPending(): InterestDocument[];
}
export declare const interestModel: InterestModel;
export default interestModel;
//# sourceMappingURL=Interest.d.ts.map