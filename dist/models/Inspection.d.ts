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
declare class InspectionModel {
    create(inspectionData: Partial<InspectionDocument>): Promise<InspectionDocument>;
    findById(id: string): Promise<InspectionDocument | null>;
    update(id: string, updates: Partial<InspectionDocument>): Promise<InspectionDocument | null>;
    delete(id: string): Promise<boolean>;
    findByProperty(propertyId: string): Promise<InspectionDocument[]>;
    findBySeeker(seekerId: string): Promise<InspectionDocument[]>;
    findByAgent(agentId: string): Promise<InspectionDocument[]>;
    findByInterest(interestId: string): Promise<InspectionDocument | null>;
    findUpcoming(agentId: string): Promise<InspectionDocument[]>;
    findOne(predicate: (inspection: InspectionDocument) => boolean): InspectionDocument | undefined;
    findMany(predicate: (inspection: InspectionDocument) => boolean): InspectionDocument[];
}
export declare const inspectionModel: InspectionModel;
export default inspectionModel;
//# sourceMappingURL=Inspection.d.ts.map