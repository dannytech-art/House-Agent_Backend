export interface UserDocument {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'seeker' | 'agent' | 'admin';
    avatar?: string;
    password_hash: string;
    passwordHash: string;
    emailVerified?: boolean;
    googleId?: string;
    authProvider?: string;
    created_at: string;
    updated_at: string;
    createdAt: string;
    updatedAt: string;
    active: boolean;
}
export interface AgentDocument extends UserDocument {
    agentType: 'direct' | 'semi-direct';
    verified: boolean;
    kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
    level: number;
    xp: number;
    credits: number;
    walletBalance: number;
    streak: number;
    totalListings: number;
    totalInterests: number;
    responseTime: number;
    rating: number;
    tier: string;
}
declare class UserModel {
    create(userData: Partial<UserDocument | AgentDocument>): Promise<UserDocument | AgentDocument>;
    findById(id: string): Promise<UserDocument | AgentDocument | null>;
    findByEmail(email: string): Promise<UserDocument | AgentDocument | null>;
    update(id: string, updates: Partial<UserDocument | AgentDocument>): Promise<UserDocument | AgentDocument | null>;
    delete(id: string): Promise<boolean>;
    findAll(): Promise<(UserDocument | AgentDocument)[]>;
    findAgents(): Promise<AgentDocument[]>;
    findSeekers(): Promise<UserDocument[]>;
    findAdmins(): Promise<UserDocument[]>;
    findByGoogleId(googleId: string): Promise<UserDocument | AgentDocument | null>;
    findOne(predicate: (user: UserDocument | AgentDocument) => boolean): UserDocument | AgentDocument | undefined;
    findMany(predicate: (user: UserDocument | AgentDocument) => boolean): (UserDocument | AgentDocument)[];
}
export declare const userModel: UserModel;
export default userModel;
//# sourceMappingURL=User.d.ts.map