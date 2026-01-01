import DatabaseService from '../services/database.service.js';
import { Quest, AgentChallenge, AgentTerritory } from '../types/index.js';
export interface QuestDocument extends Quest {
    userId: string;
    createdAt: string;
}
export interface ChallengeDocument extends AgentChallenge {
    agentId: string;
    createdAt: string;
}
export interface TerritoryDocument extends AgentTerritory {
    id: string;
    agentId: string;
    state?: string;
    dailyIncome?: number;
    claimedAt: string;
}
export interface BadgeDocument {
    id: string;
    agentId: string;
    badge: string;
    earnedAt: string;
}
declare class QuestModel extends DatabaseService<QuestDocument> {
    constructor();
    findByUser(userId: string): QuestDocument[];
    findActive(userId: string): QuestDocument[];
    findCompleted(userId: string): QuestDocument[];
}
declare class ChallengeModel extends DatabaseService<ChallengeDocument> {
    constructor();
    findByAgent(agentId: string): ChallengeDocument[];
    findActive(agentId: string): ChallengeDocument[];
}
declare class TerritoryModel extends DatabaseService<TerritoryDocument> {
    constructor();
    findByAgent(agentId: string): TerritoryDocument[];
    findByArea(area: string): TerritoryDocument[];
}
declare class BadgeModel extends DatabaseService<BadgeDocument> {
    constructor();
    findByAgent(agentId: string): BadgeDocument[];
    hasBadge(agentId: string, badge: string): boolean;
}
export declare const questModel: QuestModel;
export declare const challengeModel: ChallengeModel;
export declare const territoryModel: TerritoryModel;
export declare const badgeModel: BadgeModel;
declare const _default: {
    questModel: QuestModel;
    challengeModel: ChallengeModel;
    territoryModel: TerritoryModel;
    badgeModel: BadgeModel;
};
export default _default;
//# sourceMappingURL=Gamification.d.ts.map