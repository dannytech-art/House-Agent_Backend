import { SupabaseDB, supabase } from '../services/supabase.service.js';
// Helper to convert credit bundle from database
function bundleToCamelCase(data) {
    if (!data)
        return data;
    return {
        id: data.id,
        credits: data.credits,
        price: parseFloat(data.price) || 0,
        bonus: data.bonus_credits || 0,
        popular: data.popular || false,
        active: data.active !== false,
        createdAt: data.created_at
    };
}
// Helper to convert transaction from database  
function transactionToCamelCase(data) {
    if (!data)
        return data;
    return {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        amount: parseFloat(data.amount) || 0,
        credits: data.credits,
        description: data.description,
        status: data.status || 'pending',
        timestamp: data.timestamp,
        metadata: data.metadata || {}
    };
}
// Helper to convert transaction to snake_case
function transactionToSnakeCase(data) {
    const result = {};
    if (data.userId !== undefined)
        result.user_id = data.userId;
    if (data.user_id !== undefined)
        result.user_id = data.user_id;
    if (data.type !== undefined)
        result.type = data.type;
    if (data.amount !== undefined)
        result.amount = data.amount;
    if (data.credits !== undefined)
        result.credits = data.credits;
    if (data.description !== undefined)
        result.description = data.description;
    if (data.status !== undefined)
        result.status = data.status;
    if (data.bundleId !== undefined)
        result.bundle_id = data.bundleId;
    if (data.bundle_id !== undefined)
        result.bundle_id = data.bundle_id;
    if (data.metadata !== undefined)
        result.metadata = data.metadata;
    return result;
}
// Default bundles to seed if table is empty
const defaultBundles = [
    { id: 'bundle-1', name: '10 Credits', credits: 10, price: 1000, bonus_credits: 0, popular: false, active: true },
    { id: 'bundle-2', name: '25 Credits', credits: 25, price: 2000, bonus_credits: 5, popular: true, active: true },
    { id: 'bundle-3', name: '50 Credits', credits: 50, price: 3500, bonus_credits: 10, popular: false, active: true },
    { id: 'bundle-4', name: '100 Credits', credits: 100, price: 6000, bonus_credits: 25, popular: false, active: true },
];
class CreditBundleModel {
    initialized = false;
    async ensureBundles() {
        if (this.initialized)
            return;
        try {
            const { data, error } = await supabase
                .from('credit_bundles')
                .select('count')
                .limit(1);
            if (error && error.code === '42P01') {
                // Table doesn't exist - will use default bundles
                console.log('ℹ️ Credit bundles table not found, using default bundles');
                this.initialized = true;
                return;
            }
            // Check if table is empty
            const { data: bundles } = await supabase
                .from('credit_bundles')
                .select('id')
                .limit(1);
            if (!bundles || bundles.length === 0) {
                // Seed default bundles
                console.log('📦 Seeding default credit bundles...');
                await supabase.from('credit_bundles').insert(defaultBundles);
            }
            this.initialized = true;
        }
        catch (err) {
            console.warn('Warning: Could not initialize credit bundles:', err);
            this.initialized = true;
        }
    }
    async findById(id) {
        await this.ensureBundles();
        // First try database
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') {
            if (error.code === '42P01') {
                // Table doesn't exist - use default bundles
                const bundle = defaultBundles.find(b => b.id === id);
                return bundle ? bundleToCamelCase(bundle) : null;
            }
            throw error;
        }
        if (data)
            return bundleToCamelCase(data);
        // Fallback to default bundles
        const bundle = defaultBundles.find(b => b.id === id);
        return bundle ? bundleToCamelCase(bundle) : null;
    }
    async findActive() {
        await this.ensureBundles();
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .eq('active', true)
            .order('price', { ascending: true });
        if (error) {
            if (error.code === '42P01') {
                // Table doesn't exist - use default bundles
                return defaultBundles.filter(b => b.active).map(bundleToCamelCase);
            }
            throw error;
        }
        if (data && data.length > 0) {
            return data.map(bundleToCamelCase);
        }
        // Fallback to default bundles
        return defaultBundles.filter(b => b.active).map(bundleToCamelCase);
    }
    async findAll() {
        await this.ensureBundles();
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .order('price', { ascending: true });
        if (error) {
            if (error.code === '42P01') {
                return defaultBundles.map(bundleToCamelCase);
            }
            throw error;
        }
        if (data && data.length > 0) {
            return data.map(bundleToCamelCase);
        }
        return defaultBundles.map(bundleToCamelCase);
    }
    // Legacy method
    count() {
        return defaultBundles.length;
    }
}
class TransactionModel {
    async create(transactionData) {
        const dbData = transactionToSnakeCase(transactionData);
        // Store metadata properly
        if (transactionData.metadata) {
            dbData.metadata = transactionData.metadata;
        }
        const result = await SupabaseDB.createTransaction({
            user_id: dbData.user_id,
            type: dbData.type,
            amount: dbData.amount,
            credits: dbData.credits,
            description: dbData.description,
            status: dbData.status || 'pending',
            bundle_id: dbData.bundle_id
        });
        // Update with metadata
        if (transactionData.metadata) {
            await supabase
                .from('transactions')
                .update({ metadata: transactionData.metadata })
                .eq('id', result.id);
        }
        return transactionToCamelCase({ ...result, metadata: transactionData.metadata });
    }
    async findById(id) {
        const result = await SupabaseDB.findTransactionById(id);
        return result ? transactionToCamelCase(result) : null;
    }
    async findByUser(userId) {
        const results = await SupabaseDB.getTransactionsByUser(userId);
        return results.map(transactionToCamelCase);
    }
    async findOne(predicate) {
        // For complex queries, fetch all and filter in memory
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('timestamp', { ascending: false });
        if (error)
            throw error;
        const transactions = (data || []).map(transactionToCamelCase);
        return transactions.find(predicate) || null;
    }
    async findMany(predicate) {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('timestamp', { ascending: false });
        if (error)
            throw error;
        const transactions = (data || []).map(transactionToCamelCase);
        return transactions.filter(predicate);
    }
    async findPending() {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'pending')
            .order('timestamp', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(transactionToCamelCase);
    }
    async findByType(type) {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', type)
            .order('timestamp', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(transactionToCamelCase);
    }
    async update(id, updates) {
        const dbData = transactionToSnakeCase(updates);
        const result = await SupabaseDB.updateTransaction(id, dbData);
        return result ? transactionToCamelCase(result) : null;
    }
    async delete(id) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);
        return !error;
    }
}
export const creditBundleModel = new CreditBundleModel();
export const transactionModel = new TransactionModel();
export default { creditBundleModel, transactionModel };
//# sourceMappingURL=Credit.js.map