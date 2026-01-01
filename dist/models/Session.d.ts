import DatabaseService from '../services/database.service.js';
import { Session } from '../types/index.js';
declare class SessionModel extends DatabaseService<Session> {
    constructor();
    findByUser(userId: string): Session[];
    findByToken(token: string): Session | undefined;
    findActive(): Session[];
    cleanExpired(): number;
    deleteByUser(userId: string): number;
}
export declare const sessionModel: SessionModel;
export default sessionModel;
//# sourceMappingURL=Session.d.ts.map