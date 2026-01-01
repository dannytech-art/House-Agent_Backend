import DatabaseService from '../services/database.service.js';
import { Interest } from '../types/index.js';

export interface InterestDocument extends Interest {
  updatedAt: string;
}

class InterestModel extends DatabaseService<InterestDocument> {
  constructor() {
    super('interests');
  }

  findByProperty(propertyId: string): InterestDocument[] {
    return this.findMany(interest => interest.propertyId === propertyId);
  }

  findBySeeker(seekerId: string): InterestDocument[] {
    return this.findMany(interest => interest.seekerId === seekerId);
  }

  findByStatus(status: string): InterestDocument[] {
    return this.findMany(interest => interest.status === status);
  }

  findUnlocked(): InterestDocument[] {
    return this.findMany(interest => interest.unlocked);
  }

  findPending(): InterestDocument[] {
    return this.findMany(interest => interest.status === 'pending');
  }
}

export const interestModel = new InterestModel();
export default interestModel;


