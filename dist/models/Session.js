import DatabaseService from '../services/database.service.js';
class SessionModel extends DatabaseService {
    constructor() {
        super('sessions');
    }
    findByUser(userId) {
        return this.findMany(session => session.userId === userId);
    }
    findByToken(token) {
        return this.findOne(session => session.token === token);
    }
    findActive() {
        const now = new Date();
        return this.findMany(session => new Date(session.expiresAt) > now);
    }
    cleanExpired() {
        const now = new Date();
        const expired = this.findMany(session => new Date(session.expiresAt) <= now);
        expired.forEach(session => this.delete(session.id));
        return expired.length;
    }
    deleteByUser(userId) {
        const sessions = this.findByUser(userId);
        sessions.forEach(session => this.delete(session.id));
        return sessions.length;
    }
}
export const sessionModel = new SessionModel();
export default sessionModel;
//# sourceMappingURL=Session.js.map