import DatabaseService from '../services/database.service.js';
import { User, Agent } from '../types/index.js';
export interface UserDocument extends User {
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
    active: boolean;
}
export interface AgentDocument extends Agent {
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
    active: boolean;
}
declare class UserModel extends DatabaseService<UserDocument | AgentDocument> {
    constructor();
    findByEmail(email: string): UserDocument | AgentDocument | undefined;
    findAgents(): AgentDocument[];
    findSeekers(): UserDocument[];
    findAdmins(): UserDocument[];
    findActiveUsers(): (UserDocument | AgentDocument)[];
}
export declare const userModel: UserModel;
export default userModel;
//# sourceMappingURL=User.d.ts.map