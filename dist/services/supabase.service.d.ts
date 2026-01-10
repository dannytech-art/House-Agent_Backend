import { SupabaseClient } from '@supabase/supabase-js';
export declare const supabase: SupabaseClient<any, "public", "public", any, any>;
export declare function isSupabaseConfigured(): boolean;
export declare function testConnection(): Promise<boolean>;
export declare class SupabaseDB {
    static createUser(userData: {
        email: string;
        password_hash: string;
        name: string;
        phone: string;
        role: 'seeker' | 'agent' | 'admin';
        agent_type?: string;
        avatar?: string;
    }): Promise<any>;
    static findUserByEmail(email: string): Promise<any>;
    static findUserById(id: string): Promise<any>;
    static updateUser(id: string, updates: Partial<any>): Promise<any>;
    static getAllUsers(): Promise<any[]>;
    static getAgents(): Promise<any[]>;
    static createProperty(propertyData: {
        title: string;
        type: string;
        price: number;
        location: string;
        area: string;
        bedrooms?: number;
        bathrooms?: number;
        images?: string[];
        videos?: string[];
        amenities?: string[];
        description: string;
        agent_id: string;
        agent_type?: string;
        agent_name?: string;
        agent_verified?: boolean;
    }): Promise<any>;
    static findPropertyById(id: string): Promise<any>;
    static getAllProperties(filters?: {
        location?: string;
        type?: string;
        minPrice?: number;
        maxPrice?: number;
        status?: string;
    }): Promise<any[]>;
    static getPropertiesByAgent(agentId: string): Promise<any[]>;
    static updateProperty(id: string, updates: Partial<any>): Promise<any>;
    static deleteProperty(id: string): Promise<boolean>;
    static createInterest(interestData: {
        property_id: string;
        seeker_id: string;
        seeker_name: string;
        seeker_phone: string;
        message: string;
        seriousness_score?: number;
    }): Promise<any>;
    static findInterestById(id: string): Promise<any>;
    static getInterestsByProperty(propertyId: string): Promise<any[]>;
    static getInterestsBySeeker(seekerId: string): Promise<any[]>;
    static updateInterest(id: string, updates: Partial<any>): Promise<any>;
    static checkExistingInterest(propertyId: string, seekerId: string): Promise<any>;
    static createChatSession(sessionData: {
        participant_ids: string[];
        property_id?: string;
        interest_id?: string;
    }): Promise<any>;
    static findChatSessionById(id: string): Promise<any>;
    static getChatSessionsByParticipant(userId: string): Promise<any[]>;
    static getChatSessionByInterest(interestId: string): Promise<any>;
    static updateChatSession(id: string, updates: Partial<any>): Promise<any>;
    static createChatMessage(messageData: {
        chat_session_id: string;
        sender_id: string;
        sender_name: string;
        sender_avatar?: string;
        message: string;
        type?: string;
        metadata?: any;
    }): Promise<any>;
    static getMessagesBySession(sessionId: string, limit?: number): Promise<any[]>;
    static createTransaction(transactionData: {
        user_id: string;
        type: 'credit_purchase' | 'credit_spent' | 'wallet_load' | 'wallet_debit';
        amount: number;
        credits?: number;
        description: string;
        status?: 'completed' | 'pending' | 'failed';
        bundle_id?: string;
    }): Promise<any>;
    static findTransactionById(id: string): Promise<any>;
    static getTransactionsByUser(userId: string): Promise<any[]>;
    static updateTransaction(id: string, updates: Partial<any>): Promise<any>;
    static getCreditBundles(): Promise<any[]>;
    static findCreditBundleById(id: string): Promise<any>;
    static createNotification(notificationData: {
        target_user_id: string;
        title: string;
        message: string;
        type: 'interest' | 'message' | 'system' | 'achievement' | 'marketplace' | 'admin';
        metadata?: any;
    }): Promise<any>;
    static getNotificationsByUser(userId: string): Promise<any[]>;
    static markNotificationAsRead(id: string): Promise<any>;
    static markAllNotificationsAsRead(userId: string): Promise<any[]>;
    static createInspection(inspectionData: {
        property_id: string;
        interest_id: string;
        seeker_id: string;
        agent_id: string;
        scheduled_date: string;
        notes?: string;
    }): Promise<any>;
    static getInspectionsByProperty(propertyId: string): Promise<any[]>;
    static getInspectionsBySeeker(seekerId: string): Promise<any[]>;
    static getInspectionsByAgent(agentId: string): Promise<any[]>;
    static updateInspection(id: string, updates: Partial<any>): Promise<any>;
    static createPropertyRequest(requestData: {
        seeker_id: string;
        type: string;
        location: string;
        min_budget: number;
        max_budget: number;
        bedrooms: number;
        description?: string;
    }): Promise<any>;
    static getPropertyRequestsBySeeker(seekerId: string): Promise<any[]>;
    static getAllPropertyRequests(status?: string): Promise<any[]>;
    static addToWatchlist(userId: string, propertyId: string): Promise<any>;
    static removeFromWatchlist(userId: string, propertyId: string): Promise<boolean>;
    static getWatchlistByUser(userId: string): Promise<any[]>;
    static isPropertyInWatchlist(userId: string, propertyId: string): Promise<boolean>;
}
export default supabase;
//# sourceMappingURL=supabase.service.d.ts.map