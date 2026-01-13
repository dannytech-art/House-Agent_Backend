import { SupabaseDB, supabase } from '../services/supabase.service.js';
// Helper to convert database snake_case to camelCase
function toCamelCase(data) {
    if (!data)
        return data;
    return {
        id: data.id,
        propertyId: data.property_id,
        seekerId: data.seeker_id,
        seekerName: data.seeker_name,
        seekerPhone: data.seeker_phone,
        message: data.message,
        seriousnessScore: data.seriousness_score || 50,
        unlocked: data.unlocked || false,
        status: data.status || 'pending',
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}
// Helper to convert camelCase to snake_case for database
function toSnakeCase(data) {
    const result = {};
    if (data.propertyId !== undefined)
        result.property_id = data.propertyId;
    if (data.property_id !== undefined)
        result.property_id = data.property_id;
    if (data.seekerId !== undefined)
        result.seeker_id = data.seekerId;
    if (data.seeker_id !== undefined)
        result.seeker_id = data.seeker_id;
    if (data.seekerName !== undefined)
        result.seeker_name = data.seekerName;
    if (data.seeker_name !== undefined)
        result.seeker_name = data.seeker_name;
    if (data.seekerPhone !== undefined)
        result.seeker_phone = data.seekerPhone;
    if (data.seeker_phone !== undefined)
        result.seeker_phone = data.seeker_phone;
    if (data.message !== undefined)
        result.message = data.message;
    if (data.seriousnessScore !== undefined)
        result.seriousness_score = data.seriousnessScore;
    if (data.seriousness_score !== undefined)
        result.seriousness_score = data.seriousness_score;
    if (data.unlocked !== undefined)
        result.unlocked = data.unlocked;
    if (data.status !== undefined)
        result.status = data.status;
    return result;
}
class InterestModel {
    async create(interestData) {
        const dbData = toSnakeCase(interestData);
        const result = await SupabaseDB.createInterest({
            property_id: dbData.property_id,
            seeker_id: dbData.seeker_id,
            seeker_name: dbData.seeker_name,
            seeker_phone: dbData.seeker_phone,
            message: dbData.message,
            seriousness_score: dbData.seriousness_score
        });
        return toCamelCase(result);
    }
    async findById(id) {
        const result = await SupabaseDB.findInterestById(id);
        return result ? toCamelCase(result) : null;
    }
    async update(id, updates) {
        const dbData = toSnakeCase(updates);
        const result = await SupabaseDB.updateInterest(id, dbData);
        return result ? toCamelCase(result) : null;
    }
    async delete(id) {
        const { error } = await supabase
            .from('interests')
            .delete()
            .eq('id', id);
        return !error;
    }
    async findAll() {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(toCamelCase);
    }
    async findByProperty(propertyId) {
        const results = await SupabaseDB.getInterestsByProperty(propertyId);
        return results.map(toCamelCase);
    }
    async findBySeeker(seekerId) {
        const results = await SupabaseDB.getInterestsBySeeker(seekerId);
        return results.map(toCamelCase);
    }
    async findByStatus(status) {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(toCamelCase);
    }
    async findUnlocked() {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('unlocked', true)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(toCamelCase);
    }
    async findPending() {
        return this.findByStatus('pending');
    }
    async checkExistingInterest(propertyId, seekerId) {
        const result = await SupabaseDB.checkExistingInterest(propertyId, seekerId);
        return result ? toCamelCase(result) : null;
    }
    // Legacy sync methods for backwards compatibility
    findOne(predicate) {
        console.warn('InterestModel.findOne is deprecated. Use async methods instead.');
        return undefined;
    }
    findMany(predicate) {
        console.warn('InterestModel.findMany is deprecated. Use async methods instead.');
        return [];
    }
}
export const interestModel = new InterestModel();
export default interestModel;
//# sourceMappingURL=Interest.js.map