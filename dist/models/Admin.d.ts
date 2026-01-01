import DatabaseService from '../services/database.service.js';
import { KYC } from '../types/index.js';
export interface KYCDocument extends KYC {
    updatedAt: string;
}
export interface FlagDocument {
    id: string;
    entityType: 'property' | 'user' | 'chat' | 'interest';
    entityId: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    reportedBy: string;
    reviewedBy?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface AdminActionDocument {
    id: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, any>;
    createdAt: string;
}
export interface SettingDocument {
    id: string;
    key: string;
    value: any;
    description?: string;
    updatedBy?: string;
    updatedAt: string;
}
declare class KYCModel extends DatabaseService<KYCDocument> {
    constructor();
    findByAgent(agentId: string): KYCDocument | undefined;
    findPending(): KYCDocument[];
    findByStatus(status: string): KYCDocument[];
}
declare class FlagModel extends DatabaseService<FlagDocument> {
    constructor();
    findPending(): FlagDocument[];
    findByEntity(entityType: string, entityId: string): FlagDocument[];
    findBySeverity(severity: string): FlagDocument[];
}
declare class AdminActionModel extends DatabaseService<AdminActionDocument> {
    constructor();
    findByAdmin(adminId: string): AdminActionDocument[];
    findByAction(action: string): AdminActionDocument[];
    findRecent(limit?: number): AdminActionDocument[];
}
declare class SettingModel extends DatabaseService<SettingDocument> {
    constructor();
    private initDefaultSettings;
    findByKey(key: string): SettingDocument | undefined;
    getValue(key: string): any;
    setValue(key: string, value: any, updatedBy?: string): SettingDocument | undefined;
}
export declare const kycModel: KYCModel;
export declare const flagModel: FlagModel;
export declare const adminActionModel: AdminActionModel;
export declare const settingModel: SettingModel;
declare const _default: {
    kycModel: KYCModel;
    flagModel: FlagModel;
    adminActionModel: AdminActionModel;
    settingModel: SettingModel;
};
export default _default;
//# sourceMappingURL=Admin.d.ts.map