import DatabaseService from '../services/database.service.js';
class MarketplaceOfferModel extends DatabaseService {
    constructor() {
        super('marketplace_offers');
    }
    findByAgent(agentId) {
        return this.findMany(offer => offer.agentId === agentId);
    }
    findActive() {
        return this.findMany(offer => offer.status === 'active');
    }
    findByType(type) {
        return this.findMany(offer => offer.type === type);
    }
}
class CollaborationModel extends DatabaseService {
    constructor() {
        super('collaborations');
    }
    findByAgent(agentId) {
        return this.findMany(collab => collab.initiatorId === agentId || collab.partnerId === agentId);
    }
    findPending(agentId) {
        return this.findMany(collab => collab.partnerId === agentId && collab.status === 'pending');
    }
    findActive(agentId) {
        return this.findMany(collab => (collab.initiatorId === agentId || collab.partnerId === agentId) &&
            collab.status === 'accepted');
    }
}
export const marketplaceOfferModel = new MarketplaceOfferModel();
export const collaborationModel = new CollaborationModel();
export default { marketplaceOfferModel, collaborationModel };
//# sourceMappingURL=Marketplace.js.map