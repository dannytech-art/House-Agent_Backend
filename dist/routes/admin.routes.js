import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { kycModel, flagModel, adminActionModel, settingModel } from '../models/Admin.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// Get pending KYC applications
router.get('/kyc/review', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { status } = req.query;
        let kycs;
        if (status) {
            kycs = kycModel.findByStatus(status);
        }
        else {
            kycs = kycModel.findPending();
        }
        // Enrich with agent info
        const enrichedKycs = kycs.map(kyc => {
            const agent = userModel.findById(kyc.agentId);
            return {
                ...kyc,
                agent: agent ? {
                    id: agent.id,
                    name: agent.name,
                    email: agent.email,
                    phone: agent.phone,
                } : null,
            };
        });
        res.json({
            success: true,
            data: enrichedKycs,
        });
    }
    catch (error) {
        console.error('Get KYC error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get KYC applications',
        });
    }
});
// Review KYC application
router.post('/kyc/review', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { agentId, status, notes } = req.body;
        if (!agentId || !status) {
            return res.status(400).json({
                success: false,
                error: 'Agent ID and status are required',
            });
        }
        const kyc = kycModel.findByAgent(agentId);
        if (!kyc) {
            return res.status(404).json({
                success: false,
                error: 'KYC application not found',
            });
        }
        const now = new Date().toISOString();
        // Update KYC
        kycModel.update(kyc.id, {
            status,
            reviewedAt: now,
            reviewedBy: req.userId,
            rejectionReason: status === 'rejected' ? notes : undefined,
            updatedAt: now,
        });
        // Update agent's KYC status
        userModel.update(agentId, {
            kycStatus: status,
            kycCompletedAt: status === 'verified' ? now : undefined,
            verified: status === 'verified',
            updatedAt: now,
        });
        // Log admin action
        adminActionModel.create({
            id: uuidv4(),
            adminId: req.userId,
            action: `kyc_${status}`,
            entityType: 'agent',
            entityId: agentId,
            details: { notes },
            createdAt: now,
        });
        res.json({
            success: true,
            message: `KYC ${status === 'verified' ? 'approved' : 'rejected'} successfully`,
        });
    }
    catch (error) {
        console.error('Review KYC error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to review KYC',
        });
    }
});
// Submit KYC (for agents)
router.post('/kyc/submit', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const { documents } = req.body;
        if (!documents) {
            return res.status(400).json({
                success: false,
                error: 'Documents are required',
            });
        }
        const existingKyc = kycModel.findByAgent(req.userId);
        const now = new Date().toISOString();
        if (existingKyc) {
            // Update existing KYC
            kycModel.update(existingKyc.id, {
                documents,
                status: 'pending',
                submittedAt: now,
                updatedAt: now,
            });
        }
        else {
            // Create new KYC
            kycModel.create({
                id: uuidv4(),
                agentId: req.userId,
                status: 'pending',
                documents,
                submittedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }
        // Update agent's KYC status
        userModel.update(req.userId, {
            kycStatus: 'pending',
            updatedAt: now,
        });
        res.json({
            success: true,
            message: 'KYC submitted successfully',
        });
    }
    catch (error) {
        console.error('Submit KYC error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit KYC',
        });
    }
});
// Get flags
router.get('/flags', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { entityType, status, severity } = req.query;
        let flags = flagModel.findAll();
        if (entityType) {
            flags = flags.filter(f => f.entityType === entityType);
        }
        if (status) {
            flags = flags.filter(f => f.status === status);
        }
        else {
            flags = flags.filter(f => f.status === 'pending');
        }
        if (severity) {
            flags = flags.filter(f => f.severity === severity);
        }
        res.json({
            success: true,
            data: flags,
        });
    }
    catch (error) {
        console.error('Get flags error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get flags',
        });
    }
});
// Create flag (report content)
router.post('/flags', authenticate, async (req, res) => {
    try {
        const { entityType, entityId, reason, severity } = req.body;
        if (!entityType || !entityId || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: entityType, entityId, reason',
            });
        }
        const now = new Date().toISOString();
        const newFlag = {
            id: uuidv4(),
            entityType,
            entityId,
            reason,
            severity: severity || 'medium',
            status: 'pending',
            reportedBy: req.userId,
            createdAt: now,
            updatedAt: now,
        };
        flagModel.create(newFlag);
        res.status(201).json({
            success: true,
            data: newFlag,
        });
    }
    catch (error) {
        console.error('Create flag error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create flag',
        });
    }
});
// Update flag (review)
router.put('/flags/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const flag = flagModel.findById(id);
        if (!flag) {
            return res.status(404).json({
                success: false,
                error: 'Flag not found',
            });
        }
        const now = new Date().toISOString();
        flagModel.update(id, {
            status,
            reviewedBy: req.userId,
            notes,
            updatedAt: now,
        });
        // Log admin action
        adminActionModel.create({
            id: uuidv4(),
            adminId: req.userId,
            action: `flag_${status}`,
            entityType: flag.entityType,
            entityId: flag.entityId,
            details: { notes },
            createdAt: now,
        });
        res.json({
            success: true,
            message: 'Flag updated successfully',
        });
    }
    catch (error) {
        console.error('Update flag error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update flag',
        });
    }
});
// Get admin actions log
router.get('/actions', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { adminId, action, entityType, limit = 50 } = req.query;
        let actions = adminActionModel.findRecent(Number(limit));
        if (adminId) {
            actions = actions.filter(a => a.adminId === adminId);
        }
        if (action) {
            actions = actions.filter(a => a.action === action);
        }
        if (entityType) {
            actions = actions.filter(a => a.entityType === entityType);
        }
        res.json({
            success: true,
            data: actions,
        });
    }
    catch (error) {
        console.error('Get actions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get admin actions',
        });
    }
});
// Get settings
router.get('/settings', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { key } = req.query;
        if (key) {
            const setting = settingModel.findByKey(key);
            res.json({
                success: true,
                data: setting,
            });
        }
        else {
            const settings = settingModel.findAll();
            res.json({
                success: true,
                data: settings,
            });
        }
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get settings',
        });
    }
});
// Update setting
router.post('/settings', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { key, value, description } = req.body;
        if (!key) {
            return res.status(400).json({
                success: false,
                error: 'Setting key is required',
            });
        }
        const existingSetting = settingModel.findByKey(key);
        const now = new Date().toISOString();
        if (existingSetting) {
            settingModel.update(existingSetting.id, {
                value,
                description: description || existingSetting.description,
                updatedBy: req.userId,
                updatedAt: now,
            });
        }
        else {
            settingModel.create({
                id: uuidv4(),
                key,
                value,
                description,
                updatedBy: req.userId,
                updatedAt: now,
            });
        }
        // Log admin action
        adminActionModel.create({
            id: uuidv4(),
            adminId: req.userId,
            action: 'setting_update',
            entityType: 'setting',
            entityId: key,
            details: { value },
            createdAt: now,
        });
        res.json({
            success: true,
            message: 'Setting updated successfully',
        });
    }
    catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update setting',
        });
    }
});
// Dashboard stats
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const users = userModel.findAll();
        const activeUsers = users.filter(u => u.active);
        const agents = userModel.findAgents();
        const verifiedAgents = agents.filter(a => a.verified);
        const pendingKYC = kycModel.findPending();
        const pendingFlags = flagModel.findPending();
        res.json({
            success: true,
            data: {
                totalUsers: users.length,
                activeUsers: activeUsers.length,
                totalAgents: agents.length,
                verifiedAgents: verifiedAgents.length,
                pendingKYC: pendingKYC.length,
                pendingFlags: pendingFlags.length,
            },
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats',
        });
    }
});
export default router;
//# sourceMappingURL=admin.routes.js.map