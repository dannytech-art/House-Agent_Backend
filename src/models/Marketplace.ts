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

class MarketplaceOfferModel extends DatabaseService<MarketplaceOfferDocument> {
  constructor() {
    super('marketplace_offers');
  }

  findByAgent(agentId: string): MarketplaceOfferDocument[] {
    return this.findMany(offer => offer.agentId === agentId);
  }

  findActive(): MarketplaceOfferDocument[] {
    return this.findMany(offer => offer.status === 'active');
  }

  findByType(type: string): MarketplaceOfferDocument[] {
    return this.findMany(offer => offer.type === type);
  }
}

class CollaborationModel extends DatabaseService<CollaborationDocument> {
  constructor() {
    super('collaborations');
  }

  findByAgent(agentId: string): CollaborationDocument[] {
    return this.findMany(collab => 
      collab.initiatorId === agentId || collab.partnerId === agentId
    );
  }

  findPending(agentId: string): CollaborationDocument[] {
    return this.findMany(collab => 
      collab.partnerId === agentId && collab.status === 'pending'
    );
  }

  findActive(agentId: string): CollaborationDocument[] {
    return this.findMany(collab => 
      (collab.initiatorId === agentId || collab.partnerId === agentId) &&
      collab.status === 'accepted'
    );
  }
}

export const marketplaceOfferModel = new MarketplaceOfferModel();
export const collaborationModel = new CollaborationModel();
export default { marketplaceOfferModel, collaborationModel };


