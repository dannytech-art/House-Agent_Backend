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

class CreditBundleModel extends DatabaseService<CreditBundleDocument> {
  constructor() {
    super('credit_bundles');
    this.initDefaultBundles();
  }

  private initDefaultBundles(): void {
    if (this.count() === 0) {
      const defaultBundles: CreditBundleDocument[] = [
        { id: 'bundle-1', credits: 10, price: 1000, bonus: 0, active: true, createdAt: new Date().toISOString() },
        { id: 'bundle-2', credits: 25, price: 2000, bonus: 5, popular: true, active: true, createdAt: new Date().toISOString() },
        { id: 'bundle-3', credits: 50, price: 3500, bonus: 10, active: true, createdAt: new Date().toISOString() },
        { id: 'bundle-4', credits: 100, price: 6000, bonus: 25, active: true, createdAt: new Date().toISOString() },
      ];
      defaultBundles.forEach(bundle => this.create(bundle));
    }
  }

  findActive(): CreditBundleDocument[] {
    return this.findMany(bundle => bundle.active);
  }
}

class TransactionModel extends DatabaseService<TransactionDocument> {
  constructor() {
    super('transactions');
  }

  findByUser(userId: string): TransactionDocument[] {
    return this.findMany(tx => tx.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  findByType(type: string): TransactionDocument[] {
    return this.findMany(tx => tx.type === type);
  }

  findPending(): TransactionDocument[] {
    return this.findMany(tx => tx.status === 'pending');
  }
}

export const creditBundleModel = new CreditBundleModel();
export const transactionModel = new TransactionModel();
export default { creditBundleModel, transactionModel };


