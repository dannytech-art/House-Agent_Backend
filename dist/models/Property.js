import DatabaseService from '../services/database.service.js';
class PropertyModel extends DatabaseService {
    constructor() {
        super('properties');
    }
    findByAgent(agentId) {
        return this.findMany(property => property.agentId === agentId);
    }
    findByLocation(location) {
        return this.findMany(property => property.location.toLowerCase().includes(location.toLowerCase()) ||
            property.area.toLowerCase().includes(location.toLowerCase()));
    }
    findByType(type) {
        return this.findMany(property => property.type === type);
    }
    findFeatured() {
        return this.findMany(property => property.featured);
    }
    findAvailable() {
        return this.findMany(property => property.status === 'available');
    }
    findByPriceRange(minPrice, maxPrice) {
        return this.findMany(property => {
            if (minPrice && property.price < minPrice)
                return false;
            if (maxPrice && property.price > maxPrice)
                return false;
            return true;
        });
    }
    search(filters) {
        return this.findMany(property => {
            if (filters.location &&
                !property.location.toLowerCase().includes(filters.location.toLowerCase()) &&
                !property.area.toLowerCase().includes(filters.location.toLowerCase())) {
                return false;
            }
            if (filters.type && property.type !== filters.type)
                return false;
            if (filters.minPrice && property.price < filters.minPrice)
                return false;
            if (filters.maxPrice && property.price > filters.maxPrice)
                return false;
            if (filters.bedrooms && property.bedrooms !== filters.bedrooms)
                return false;
            if (filters.agentId && property.agentId !== filters.agentId)
                return false;
            if (filters.featured !== undefined && property.featured !== filters.featured)
                return false;
            if (filters.status && property.status !== filters.status)
                return false;
            return true;
        });
    }
}
export const propertyModel = new PropertyModel();
export default propertyModel;
//# sourceMappingURL=Property.js.map