import DatabaseService from '../services/database.service.js';
class CreditBundleModel extends DatabaseService {
    constructor() {
        super('credit_bundles');
        this.initDefaultBundles();
    }
    initDefaultBundles() {
        if (this.count() === 0) {
            const defaultBundles = [
                { id: 'bundle-1', credits: 10, price: 1000, bonus: 0, active: true, createdAt: new Date().toISOString() },
                { id: 'bundle-2', credits: 25, price: 2000, bonus: 5, popular: true, active: true, createdAt: new Date().toISOString() },
                { id: 'bundle-3', credits: 50, price: 3500, bonus: 10, active: true, createdAt: new Date().toISOString() },
                { id: 'bundle-4', credits: 100, price: 6000, bonus: 25, active: true, createdAt: new Date().toISOString() },
            ];
            defaultBundles.forEach(bundle => this.create(bundle));
        }
    }
    findActive() {
        return this.findMany(bundle => bundle.active);
    }
}
class TransactionModel extends DatabaseService {
    constructor() {
        super('transactions');
    }
    findByUser(userId) {
        return this.findMany(tx => tx.userId === userId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    findByType(type) {
        return this.findMany(tx => tx.type === type);
    }
    findPending() {
        return this.findMany(tx => tx.status === 'pending');
    }
}
export const creditBundleModel = new CreditBundleModel();
export const transactionModel = new TransactionModel();
export default { creditBundleModel, transactionModel };
//# sourceMappingURL=Credit.js.map