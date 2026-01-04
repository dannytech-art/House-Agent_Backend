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

class InspectionModel extends DatabaseService<InspectionDocument> {
  constructor() {
    super('inspections');
  }

  findByProperty(propertyId: string): InspectionDocument[] {
    return this.findMany(inspection => inspection.propertyId === propertyId)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }

  findByAgent(agentId: string): InspectionDocument[] {
    return this.findMany(inspection => inspection.agentId === agentId)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }

  findBySeeker(seekerId: string): InspectionDocument[] {
    return this.findMany(inspection => inspection.seekerId === seekerId)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }

  findByInterest(interestId: string): InspectionDocument | undefined {
    return this.findOne(inspection => inspection.interestId === interestId);
  }

  findUpcoming(agentId: string): InspectionDocument[] {
    const now = new Date().toISOString();
    return this.findMany(
      inspection => inspection.agentId === agentId && 
                    inspection.scheduledDate >= now.split('T')[0] &&
                    inspection.status !== 'cancelled' &&
                    inspection.status !== 'completed'
    ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }

  findPending(agentId: string): InspectionDocument[] {
    return this.findMany(
      inspection => inspection.agentId === agentId && inspection.status === 'pending'
    );
  }
}

export const inspectionModel = new InspectionModel();
export default inspectionModel;




