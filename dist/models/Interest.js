import DatabaseService from '../services/database.service.js';
class InterestModel extends DatabaseService {
    constructor() {
        super('interests');
    }
    findByProperty(propertyId) {
        return this.findMany(interest => interest.propertyId === propertyId);
    }
    findBySeeker(seekerId) {
        return this.findMany(interest => interest.seekerId === seekerId);
    }
    findByStatus(status) {
        return this.findMany(interest => interest.status === status);
    }
    findUnlocked() {
        return this.findMany(interest => interest.unlocked);
    }
    findPending() {
        return this.findMany(interest => interest.status === 'pending');
    }
}
export const interestModel = new InterestModel();
export default interestModel;
//# sourceMappingURL=Interest.js.map