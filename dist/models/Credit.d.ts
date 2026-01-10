import { CreditBundle, Transaction } from '../types/index.js';
export interface CreditBundleDocument extends Omit<CreditBundle, 'createdAt'> {
    active: boolean;
    created_at?: string;
    createdAt?: string;
}
export interface TransactionDocument extends Transaction {
    userId: string;
    metadata?: Record<string, any>;
}
declare class CreditBundleModel {
    private initialized;
    ensureBundles(): Promise<void>;
    findById(id: string): Promise<CreditBundleDocument | null>;
    findActive(): Promise<CreditBundleDocument[]>;
    findAll(): Promise<CreditBundleDocument[]>;
    count(): number;
}
declare class TransactionModel {
    create(transactionData: Partial<TransactionDocument>): Promise<TransactionDocument>;
    findById(id: string): Promise<TransactionDocument | null>;
    findByUser(userId: string): Promise<TransactionDocument[]>;
    findOne(predicate: (tx: TransactionDocument) => boolean): Promise<TransactionDocument | null>;
    findMany(predicate: (tx: TransactionDocument) => boolean): Promise<TransactionDocument[]>;
    findPending(): Promise<TransactionDocument[]>;
    findByType(type: string): Promise<TransactionDocument[]>;
    update(id: string, updates: Partial<TransactionDocument>): Promise<TransactionDocument | null>;
    delete(id: string): Promise<boolean>;
}
export declare const creditBundleModel: CreditBundleModel;
export declare const transactionModel: TransactionModel;
declare const _default: {
    creditBundleModel: CreditBundleModel;
    transactionModel: TransactionModel;
};
export default _default;
//# sourceMappingURL=Credit.d.ts.map