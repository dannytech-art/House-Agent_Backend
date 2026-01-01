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

class QuestModel extends DatabaseService<QuestDocument> {
  constructor() {
    super('quests');
  }

  findByUser(userId: string): QuestDocument[] {
    return this.findMany(quest => quest.userId === userId);
  }

  findActive(userId: string): QuestDocument[] {
    const now = new Date();
    return this.findMany(quest => 
      quest.userId === userId && 
      !quest.completed && 
      new Date(quest.expiresAt) > now
    );
  }

  findCompleted(userId: string): QuestDocument[] {
    return this.findMany(quest => quest.userId === userId && quest.completed);
  }
}

class ChallengeModel extends DatabaseService<ChallengeDocument> {
  constructor() {
    super('challenges');
  }

  findByAgent(agentId: string): ChallengeDocument[] {
    return this.findMany(challenge => challenge.agentId === agentId);
  }

  findActive(agentId: string): ChallengeDocument[] {
    const now = new Date();
    return this.findMany(challenge => 
      challenge.agentId === agentId && 
      !challenge.completed && 
      new Date(challenge.deadline) > now
    );
  }
}

class TerritoryModel extends DatabaseService<TerritoryDocument> {
  constructor() {
    super('territories');
  }

  findByAgent(agentId: string): TerritoryDocument[] {
    return this.findMany(territory => territory.agentId === agentId);
  }

  findByArea(area: string): TerritoryDocument[] {
    return this.findMany(territory => 
      territory.area.toLowerCase().includes(area.toLowerCase())
    );
  }
}

class BadgeModel extends DatabaseService<BadgeDocument> {
  constructor() {
    super('badges');
  }

  findByAgent(agentId: string): BadgeDocument[] {
    return this.findMany(badge => badge.agentId === agentId);
  }

  hasBadge(agentId: string, badge: string): boolean {
    return this.findMany(b => b.agentId === agentId && b.badge === badge).length > 0;
  }
}

export const questModel = new QuestModel();
export const challengeModel = new ChallengeModel();
export const territoryModel = new TerritoryModel();
export const badgeModel = new BadgeModel();
export default { questModel, challengeModel, territoryModel, badgeModel };


