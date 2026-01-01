import DatabaseService from '../services/database.service.js';
class QuestModel extends DatabaseService {
    constructor() {
        super('quests');
    }
    findByUser(userId) {
        return this.findMany(quest => quest.userId === userId);
    }
    findActive(userId) {
        const now = new Date();
        return this.findMany(quest => quest.userId === userId &&
            !quest.completed &&
            new Date(quest.expiresAt) > now);
    }
    findCompleted(userId) {
        return this.findMany(quest => quest.userId === userId && quest.completed);
    }
}
class ChallengeModel extends DatabaseService {
    constructor() {
        super('challenges');
    }
    findByAgent(agentId) {
        return this.findMany(challenge => challenge.agentId === agentId);
    }
    findActive(agentId) {
        const now = new Date();
        return this.findMany(challenge => challenge.agentId === agentId &&
            !challenge.completed &&
            new Date(challenge.deadline) > now);
    }
}
class TerritoryModel extends DatabaseService {
    constructor() {
        super('territories');
    }
    findByAgent(agentId) {
        return this.findMany(territory => territory.agentId === agentId);
    }
    findByArea(area) {
        return this.findMany(territory => territory.area.toLowerCase().includes(area.toLowerCase()));
    }
}
class BadgeModel extends DatabaseService {
    constructor() {
        super('badges');
    }
    findByAgent(agentId) {
        return this.findMany(badge => badge.agentId === agentId);
    }
    hasBadge(agentId, badge) {
        return this.findMany(b => b.agentId === agentId && b.badge === badge).length > 0;
    }
}
export const questModel = new QuestModel();
export const challengeModel = new ChallengeModel();
export const territoryModel = new TerritoryModel();
export const badgeModel = new BadgeModel();
export default { questModel, challengeModel, territoryModel, badgeModel };
//# sourceMappingURL=Gamification.js.map