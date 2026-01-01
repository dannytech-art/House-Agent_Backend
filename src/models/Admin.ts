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

class KYCModel extends DatabaseService<KYCDocument> {
  constructor() {
    super('kyc');
  }

  findByAgent(agentId: string): KYCDocument | undefined {
    return this.findOne(kyc => kyc.agentId === agentId);
  }

  findPending(): KYCDocument[] {
    return this.findMany(kyc => kyc.status === 'pending');
  }

  findByStatus(status: string): KYCDocument[] {
    return this.findMany(kyc => kyc.status === status);
  }
}

class FlagModel extends DatabaseService<FlagDocument> {
  constructor() {
    super('flags');
  }

  findPending(): FlagDocument[] {
    return this.findMany(flag => flag.status === 'pending');
  }

  findByEntity(entityType: string, entityId: string): FlagDocument[] {
    return this.findMany(flag => 
      flag.entityType === entityType && flag.entityId === entityId
    );
  }

  findBySeverity(severity: string): FlagDocument[] {
    return this.findMany(flag => flag.severity === severity);
  }
}

class AdminActionModel extends DatabaseService<AdminActionDocument> {
  constructor() {
    super('admin_actions');
  }

  findByAdmin(adminId: string): AdminActionDocument[] {
    return this.findMany(action => action.adminId === adminId);
  }

  findByAction(action: string): AdminActionDocument[] {
    return this.findMany(a => a.action === action);
  }

  findRecent(limit: number = 50): AdminActionDocument[] {
    return this.findAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

class SettingModel extends DatabaseService<SettingDocument> {
  constructor() {
    super('settings');
    this.initDefaultSettings();
  }

  private initDefaultSettings(): void {
    if (this.count() === 0) {
      const defaults: SettingDocument[] = [
        { id: 's1', key: 'maintenance_mode', value: false, description: 'Enable maintenance mode', updatedAt: new Date().toISOString() },
        { id: 's2', key: 'max_listings_per_agent', value: 50, description: 'Maximum listings per agent', updatedAt: new Date().toISOString() },
        { id: 's3', key: 'interest_unlock_cost', value: 5, description: 'Credits to unlock an interest', updatedAt: new Date().toISOString() },
        { id: 's4', key: 'featured_listing_cost', value: 10, description: 'Credits to feature a listing', updatedAt: new Date().toISOString() },
      ];
      defaults.forEach(setting => this.create(setting));
    }
  }

  findByKey(key: string): SettingDocument | undefined {
    return this.findOne(setting => setting.key === key);
  }

  getValue(key: string): any {
    const setting = this.findByKey(key);
    return setting?.value;
  }

  setValue(key: string, value: any, updatedBy?: string): SettingDocument | undefined {
    const setting = this.findByKey(key);
    if (setting) {
      return this.update(setting.id, { value, updatedBy, updatedAt: new Date().toISOString() });
    }
    return undefined;
  }
}

export const kycModel = new KYCModel();
export const flagModel = new FlagModel();
export const adminActionModel = new AdminActionModel();
export const settingModel = new SettingModel();
export default { kycModel, flagModel, adminActionModel, settingModel };


