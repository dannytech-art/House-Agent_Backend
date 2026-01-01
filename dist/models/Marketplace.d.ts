import DatabaseService from '../services/database.service.js';
import { MarketplaceOffer } from '../types/index.js';
export interface MarketplaceOfferDocument extends MarketplaceOffer {
    createdAt: string;
    updatedAt: string;
}
export interface CollaborationDocument {
    id: string;
    type: 'co-broking' | 'lead-share' | 'territory-access';
    initiatorId: string;
    partnerId: string;
    propertyId?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    terms: string;
    commission?: number;
    createdAt: string;
    updatedAt: string;
}
declare class MarketplaceOfferModel extends DatabaseService<MarketplaceOfferDocument> {
    constructor();
    findByAgent(agentId: string): MarketplaceOfferDocument[];
    findActive(): MarketplaceOfferDocument[];
    findByType(type: string): MarketplaceOfferDocument[];
}
declare class CollaborationModel extends DatabaseService<CollaborationDocument> {
    constructor();
    findByAgent(agentId: string): CollaborationDocument[];
    findPending(agentId: string): CollaborationDocument[];
    findActive(agentId: string): CollaborationDocument[];
}
export declare const marketplaceOfferModel: MarketplaceOfferModel;
export declare const collaborationModel: CollaborationModel;
declare const _default: {
    marketplaceOfferModel: MarketplaceOfferModel;
    collaborationModel: CollaborationModel;
};
export default _default;
//# sourceMappingURL=Marketplace.d.ts.map