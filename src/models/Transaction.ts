import { SupabaseDB, supabase } from '../services/supabase.service.js';

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

// Helper to convert database snake_case to camelCase
function toCamelCase(data: any): TransactionDocument {
  if (!data) return data;
  
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    amount: parseFloat(data.amount) || 0,
    credits: data.credits,
    description: data.description,
    status: data.status || 'pending',
    bundleId: data.bundle_id,
    reference: data.reference,
    timestamp: data.timestamp
  };
}

// Helper to convert camelCase to snake_case for database
function toSnakeCase(data: any): any {
  const result: any = {};
  
  if (data.userId !== undefined) result.user_id = data.userId;
  if (data.user_id !== undefined) result.user_id = data.user_id;
  if (data.type !== undefined) result.type = data.type;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.credits !== undefined) result.credits = data.credits;
  if (data.description !== undefined) result.description = data.description;
  if (data.status !== undefined) result.status = data.status;
  if (data.bundleId !== undefined) result.bundle_id = data.bundleId;
  if (data.bundle_id !== undefined) result.bundle_id = data.bundle_id;
  if (data.reference !== undefined) result.reference = data.reference;
  
  return result;
}

class TransactionModel {
  async create(transactionData: Partial<TransactionDocument>): Promise<TransactionDocument> {
    const dbData = toSnakeCase(transactionData);
    
    const result = await SupabaseDB.createTransaction({
      user_id: dbData.user_id,
      type: dbData.type,
      amount: dbData.amount,
      credits: dbData.credits,
      description: dbData.description,
      status: dbData.status || 'pending',
      bundle_id: dbData.bundle_id
    });
    return toCamelCase(result);
  }

  async findById(id: string): Promise<TransactionDocument | null> {
    const result = await SupabaseDB.findTransactionById(id);
    return result ? toCamelCase(result) : null;
  }

  async update(id: string, updates: Partial<TransactionDocument>): Promise<TransactionDocument | null> {
    const dbData = toSnakeCase(updates);
    const result = await SupabaseDB.updateTransaction(id, dbData);
    return result ? toCamelCase(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    return !error;
  }

  async findByUser(userId: string): Promise<TransactionDocument[]> {
    const results = await SupabaseDB.getTransactionsByUser(userId);
    return results.map(toCamelCase);
  }

  async findByReference(reference: string): Promise<TransactionDocument | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async findByStatus(status: string): Promise<TransactionDocument[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', status)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async findPending(): Promise<TransactionDocument[]> {
    return this.findByStatus('pending');
  }

  async findCompleted(): Promise<TransactionDocument[]> {
    return this.findByStatus('completed');
  }

  // Legacy sync methods for backwards compatibility
  findOne(predicate: (transaction: TransactionDocument) => boolean): TransactionDocument | undefined {
    console.warn('TransactionModel.findOne is deprecated. Use async methods instead.');
    return undefined;
  }

  findMany(predicate: (transaction: TransactionDocument) => boolean): TransactionDocument[] {
    console.warn('TransactionModel.findMany is deprecated. Use async methods instead.');
    return [];
  }
}

export const transactionModel = new TransactionModel();
export default transactionModel;




