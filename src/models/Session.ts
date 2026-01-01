import DatabaseService from '../services/database.service.js';
import { Session } from '../types/index.js';

class SessionModel extends DatabaseService<Session> {
  constructor() {
    super('sessions');
  }

  findByUser(userId: string): Session[] {
    return this.findMany(session => session.userId === userId);
  }

  findByToken(token: string): Session | undefined {
    return this.findOne(session => session.token === token);
  }

  findActive(): Session[] {
    const now = new Date();
    return this.findMany(session => new Date(session.expiresAt) > now);
  }

  cleanExpired(): number {
    const now = new Date();
    const expired = this.findMany(session => new Date(session.expiresAt) <= now);
    expired.forEach(session => this.delete(session.id));
    return expired.length;
  }

  deleteByUser(userId: string): number {
    const sessions = this.findByUser(userId);
    sessions.forEach(session => this.delete(session.id));
    return sessions.length;
  }
}

export const sessionModel = new SessionModel();
export default sessionModel;


