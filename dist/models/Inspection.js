import DatabaseService from '../services/database.service.js';
class InspectionModel extends DatabaseService {
    constructor() {
        super('inspections');
    }
    findByProperty(propertyId) {
        return this.findMany(inspection => inspection.propertyId === propertyId)
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }
    findByAgent(agentId) {
        return this.findMany(inspection => inspection.agentId === agentId)
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }
    findBySeeker(seekerId) {
        return this.findMany(inspection => inspection.seekerId === seekerId)
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }
    findByInterest(interestId) {
        return this.findOne(inspection => inspection.interestId === interestId);
    }
    findUpcoming(agentId) {
        const now = new Date().toISOString();
        return this.findMany(inspection => inspection.agentId === agentId &&
            inspection.scheduledDate >= now.split('T')[0] &&
            inspection.status !== 'cancelled' &&
            inspection.status !== 'completed').sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }
    findPending(agentId) {
        return this.findMany(inspection => inspection.agentId === agentId && inspection.status === 'pending');
    }
}
export const inspectionModel = new InspectionModel();
export default inspectionModel;
//# sourceMappingURL=Inspection.js.map