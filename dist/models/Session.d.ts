import { Session } from '../types/index.js';
declare class SessionModel {
    create(sessionData: Partial<Session>): Promise<Session>;
    findById(id: string): Promise<Session | null>;
    findByToken(token: string): Promise<Session | null>;
    findByUser(userId: string): Promise<Session[]>;
    delete(id: string): Promise<boolean>;
    deleteByUser(userId: string): Promise<number>;
    findActive(): Promise<Session[]>;
    cleanExpired(): Promise<number>;
    update(id: string, updates: Partial<Session>): Promise<Session | null>;
    findOne(predicate: (session: Session) => boolean): Session | undefined;
    findMany(predicate: (session: Session) => boolean): Session[];
}
export declare const sessionModel: SessionModel;
export default sessionModel;
//# sourceMappingURL=Session.d.ts.map