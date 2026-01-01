import DatabaseService from '../services/database.service.js';
class PropertyRequestModel extends DatabaseService {
    constructor() {
        super('property_requests');
    }
    findBySeeker(seekerId) {
        return this.findMany(request => request.seekerId === seekerId);
    }
    findByLocation(location) {
        return this.findMany(request => request.location.toLowerCase().includes(location.toLowerCase()));
    }
    findByType(type) {
        return this.findMany(request => request.type === type);
    }
    findActive() {
        return this.findMany(request => request.status === 'active');
    }
    findByBudgetRange(minBudget, maxBudget) {
        return this.findMany(request => {
            if (minBudget && request.maxBudget < minBudget)
                return false;
            if (maxBudget && request.minBudget > maxBudget)
                return false;
            return true;
        });
    }
    search(filters) {
        return this.findMany(request => {
            if (filters.location &&
                !request.location.toLowerCase().includes(filters.location.toLowerCase())) {
                return false;
            }
            if (filters.type && request.type !== filters.type)
                return false;
            // Check if property budget overlaps with filter budget range
            if (filters.minBudget && request.maxBudget < filters.minBudget)
                return false;
            if (filters.maxBudget && request.minBudget > filters.maxBudget)
                return false;
            if (filters.bedrooms && request.bedrooms !== filters.bedrooms)
                return false;
            if (filters.seekerId && request.seekerId !== filters.seekerId)
                return false;
            if (filters.status && request.status !== filters.status)
                return false;
            return true;
        });
    }
    incrementMatches(id) {
        const request = this.findById(id);
        if (!request)
            return undefined;
        return this.update(id, {
            matches: (request.matches || 0) + 1,
            updatedAt: new Date().toISOString()
        });
    }
}
export const propertyRequestModel = new PropertyRequestModel();
export default propertyRequestModel;
//# sourceMappingURL=PropertyRequest.js.map