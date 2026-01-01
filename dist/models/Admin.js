import DatabaseService from '../services/database.service.js';
class KYCModel extends DatabaseService {
    constructor() {
        super('kyc');
    }
    findByAgent(agentId) {
        return this.findOne(kyc => kyc.agentId === agentId);
    }
    findPending() {
        return this.findMany(kyc => kyc.status === 'pending');
    }
    findByStatus(status) {
        return this.findMany(kyc => kyc.status === status);
    }
}
class FlagModel extends DatabaseService {
    constructor() {
        super('flags');
    }
    findPending() {
        return this.findMany(flag => flag.status === 'pending');
    }
    findByEntity(entityType, entityId) {
        return this.findMany(flag => flag.entityType === entityType && flag.entityId === entityId);
    }
    findBySeverity(severity) {
        return this.findMany(flag => flag.severity === severity);
    }
}
class AdminActionModel extends DatabaseService {
    constructor() {
        super('admin_actions');
    }
    findByAdmin(adminId) {
        return this.findMany(action => action.adminId === adminId);
    }
    findByAction(action) {
        return this.findMany(a => a.action === action);
    }
    findRecent(limit = 50) {
        return this.findAll()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }
}
class SettingModel extends DatabaseService {
    constructor() {
        super('settings');
        this.initDefaultSettings();
    }
    initDefaultSettings() {
        if (this.count() === 0) {
            const defaults = [
                { id: 's1', key: 'maintenance_mode', value: false, description: 'Enable maintenance mode', updatedAt: new Date().toISOString() },
                { id: 's2', key: 'max_listings_per_agent', value: 50, description: 'Maximum listings per agent', updatedAt: new Date().toISOString() },
                { id: 's3', key: 'interest_unlock_cost', value: 5, description: 'Credits to unlock an interest', updatedAt: new Date().toISOString() },
                { id: 's4', key: 'featured_listing_cost', value: 10, description: 'Credits to feature a listing', updatedAt: new Date().toISOString() },
            ];
            defaults.forEach(setting => this.create(setting));
        }
    }
    findByKey(key) {
        return this.findOne(setting => setting.key === key);
    }
    getValue(key) {
        const setting = this.findByKey(key);
        return setting?.value;
    }
    setValue(key, value, updatedBy) {
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
//# sourceMappingURL=Admin.js.map