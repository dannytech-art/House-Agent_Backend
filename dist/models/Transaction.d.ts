export interface TransactionDocument {
    id: string;
    userId: string;
    type: 'credit_purchase' | 'credit_spent' | 'wallet_load' | 'wallet_debit';
    amount: number;
    credits?: number;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    bundleId?: string;
    reference?: string;
    timestamp: string;
}
declare class TransactionModel {
    create(transactionData: Partial<TransactionDocument>): Promise<TransactionDocument>;
    findById(id: string): Promise<TransactionDocument | null>;
    update(id: string, updates: Partial<TransactionDocument>): Promise<TransactionDocument | null>;
    delete(id: string): Promise<boolean>;
    findByUser(userId: string): Promise<TransactionDocument[]>;
    findByReference(reference: string): Promise<TransactionDocument | null>;
    findByStatus(status: string): Promise<TransactionDocument[]>;
    findPending(): Promise<TransactionDocument[]>;
    findCompleted(): Promise<TransactionDocument[]>;
    findOne(predicate: (transaction: TransactionDocument) => boolean): TransactionDocument | undefined;
    findMany(predicate: (transaction: TransactionDocument) => boolean): TransactionDocument[];
}
export declare const transactionModel: TransactionModel;
export default transactionModel;
//# sourceMappingURL=Transaction.d.ts.map