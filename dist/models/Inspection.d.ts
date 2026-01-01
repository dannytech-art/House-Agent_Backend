import DatabaseService from '../services/database.service.js';
export interface InspectionDocument {
    id: string;
    interestId: string;
    propertyId: string;
    seekerId: string;
    seekerName: string;
    seekerPhone: string;
    agentId: string;
    scheduledDate: string;
    scheduledTime: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
    notes?: string;
    agentNotes?: string;
    createdAt: string;
    updatedAt: string;
}
declare class InspectionModel extends DatabaseService<InspectionDocument> {
    constructor();
    findByProperty(propertyId: string): InspectionDocument[];
    findByAgent(agentId: string): InspectionDocument[];
    findBySeeker(seekerId: string): InspectionDocument[];
    findByInterest(interestId: string): InspectionDocument | undefined;
    findUpcoming(agentId: string): InspectionDocument[];
    findPending(agentId: string): InspectionDocument[];
}
export declare const inspectionModel: InspectionModel;
export default inspectionModel;
//# sourceMappingURL=Inspection.d.ts.map