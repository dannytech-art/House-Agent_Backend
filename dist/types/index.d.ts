export type UserRole = 'seeker' | 'agent' | 'admin';
export type AgentType = 'direct' | 'semi-direct';
export type PropertyType = 'apartment' | 'house' | 'duplex' | 'penthouse' | 'studio' | 'land';
export type AgentTier = 'street-scout' | 'area-broker' | 'market-dealer' | 'territory-leader' | 'city-mogul';
export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    avatar?: string;
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
    active: boolean;
}
export interface Agent extends User {
    agentType: AgentType;
    verified: boolean;
    kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
    kycCompletedAt?: string;
    level: number;
    xp: number;
    credits: number;
    walletBalance: number;
    streak: number;
    totalListings: number;
    totalInterests: number;
    responseTime: number;
    rating: number;
    joinedDate: string;
    tier: AgentTier;
    badges: string[];
    weeklyRank?: number;
}
export interface Property {
    id: string;
    title: string;
    type: PropertyType;
    price: number;
    location: string;
    area: string;
    bedrooms?: number;
    bathrooms?: number;
    images: string[];
    videos?: string[];
    amenities: string[];
    description: string;
    agentId: string;
    agentType: AgentType;
    agentName: string;
    agentVerified: boolean;
    postedAt: string;
    featured: boolean;
    status: 'available' | 'pending' | 'sold';
    createdAt: string;
    updatedAt: string;
}
export interface Interest {
    id: string;
    propertyId: string;
    seekerId: string;
    seekerName: string;
    seekerPhone: string;
    message: string;
    seriousnessScore: number;
    createdAt: string;
    unlocked: boolean;
    status: 'pending' | 'contacted' | 'viewing-scheduled' | 'closed';
    updatedAt: string;
}
export interface ChatSession {
    id: string;
    participantIds: string[];
    propertyId?: string;
    interestId?: string;
    createdAt: string;
    lastMessageAt: string;
    updatedAt: string;
}
export interface ChatMessage {
    id: string;
    sessionId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    timestamp: string;
    type: 'text' | 'property-brief' | 'inspection-schedule' | 'document';
    metadata?: Record<string, any>;
    read: boolean;
}
export interface CreditBundle {
    id: string;
    credits: number;
    price: number;
    bonus: number;
    popular?: boolean;
    active: boolean;
    createdAt: string;
}
export interface Transaction {
    id: string;
    userId: string;
    type: 'credit_purchase' | 'credit_spent' | 'wallet_load' | 'wallet_debit';
    amount: number;
    credits?: number;
    description: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'failed';
    metadata?: Record<string, any>;
}
export interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    lastActivity: string;
}
export interface KYC {
    id: string;
    agentId: string;
    status: 'unverified' | 'pending' | 'verified' | 'rejected';
    documents: {
        idCard?: string;
        businessLicense?: string;
        proofOfAddress?: string;
        other?: string[];
    };
    submittedAt?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Quest {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly';
    progress: number;
    target: number;
    reward: {
        xp: number;
        credits: number;
    };
    completed: boolean;
    expiresAt: string;
}
export interface AgentChallenge {
    id: string;
    title: string;
    description: string;
    type: 'upload' | 'pricing' | 'deal' | 'collaboration';
    progress: number;
    target: number;
    reward: {
        xp: number;
        credits: number;
        badge?: string;
    };
    deadline: string;
    completed: boolean;
}
export interface AgentTerritory {
    area: string;
    dominance: number;
    activeListings: number;
    monthlyDeals: number;
    rank: number;
}
export interface MarketplaceOffer {
    id: string;
    type: 'lead' | 'co-broking' | 'access';
    agentId: string;
    agentName: string;
    propertyId?: string;
    description: string;
    price: number;
    status: 'active' | 'pending' | 'completed';
    createdAt: string;
}
export interface GroupMember {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'member';
    joinedAt: string;
}
export interface Group {
    id: string;
    name: string;
    description: string;
    avatar?: string;
    members: GroupMember[];
    createdBy: string;
    createdAt: string;
    lastMessageAt: string;
    unreadCount: number;
}
export interface GroupMessage {
    id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    timestamp: string;
    type: 'text' | 'image' | 'document' | 'system';
}
export interface PropertyRequest {
    id: string;
    seekerId: string;
    type: PropertyType;
    location: string;
    minBudget: number;
    maxBudget: number;
    bedrooms: number;
    description: string;
    status: 'active' | 'fulfilled' | 'expired';
    createdAt: string;
    updatedAt: string;
    matches: number;
}
//# sourceMappingURL=index.d.ts.map