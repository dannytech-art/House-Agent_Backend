import DatabaseService from '../services/database.service.js';
import { CreditBundle, Transaction } from '../types/index.js';
export interface CreditBundleDocument extends CreditBundle {
    active: boolean;
    createdAt: string;
}
export interface TransactionDocument extends Transaction {
    userId: string;
    metadata?: Record<string, any>;
}
declare class CreditBundleModel extends DatabaseService<CreditBundleDocument> {
    constructor();
    private initDefaultBundles;
    findActive(): CreditBundleDocument[];
}
declare class TransactionModel extends DatabaseService<TransactionDocument> {
    constructor();
    findByUser(userId: string): TransactionDocument[];
    findByType(type: string): TransactionDocument[];
    findPending(): TransactionDocument[];
}
export declare const creditBundleModel: CreditBundleModel;
export declare const transactionModel: TransactionModel;
declare const _default: {
    creditBundleModel: CreditBundleModel;
    transactionModel: TransactionModel;
};
export default _default;
//# sourceMappingURL=Credit.d.ts.map