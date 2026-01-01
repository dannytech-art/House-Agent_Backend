import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole } from '../middleware/auth.js';
import DatabaseService from '../services/database.service.js';
class ClosableDealModel extends DatabaseService {
    constructor() {
        super('closable_deals');
    }
    findByAgent(agentId) {
        return this.findMany(d => d.agentId === agentId);
    }
    findActive() {
        return this.findMany(d => d.status === 'active' || d.status === 'in-progress');
    }
    findByUrgency(urgency) {
        return this.findMany(d => d.urgency === urgency);
    }
}
class VilanowTaskModel extends DatabaseService {
    constructor() {
        super('vilanow_tasks');
    }
    findByAgent(agentId) {
        return this.findMany(t => t.assignedAgent === agentId);
    }
    findPending() {
        return this.findMany(t => t.status === 'pending' || t.status === 'in-progress');
    }
}
class RiskFlagModel extends DatabaseService {
    constructor() {
        super('risk_flags');
    }
    findActive() {
        return this.findMany(r => r.status === 'active' || r.status === 'investigating');
    }
    findByEntity(entityType, entityId) {
        return this.findMany(r => r.entityType === entityType && r.entityId === entityId);
    }
}
class AutomationRuleModel extends DatabaseService {
    constructor() {
        super('automation_rules');
    }
    findEnabled() {
        return this.findMany(r => r.enabled).sort((a, b) => b.priority - a.priority);
    }
}
const closableDealModel = new ClosableDealModel();
const vilanowTaskModel = new VilanowTaskModel();
const riskFlagModel = new RiskFlagModel();
const automationRuleModel = new AutomationRuleModel();
const router = Router();
// ============ CLOSABLE DEALS ============
// Get closable deals
router.get('/deals', authenticate, requireRole('admin', 'agent'), async (req, res) => {
    try {
        const { status, urgency, assignedTo } = req.query;
        let deals;
        if (req.userRole === 'agent') {
            deals = closableDealModel.findByAgent(req.userId);
        }
        else {
            deals = closableDealModel.findAll();
        }
        if (status) {
            deals = deals.filter(d => d.status === status);
        }
        if (urgency) {
            deals = deals.filter(d => d.urgency === urgency);
        }
        if (assignedTo) {
            deals = deals.filter(d => d.assignedTo === assignedTo);
        }
        res.json({
            success: true,
            data: deals,
        });
    }
    catch (error) {
        console.error('Get deals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get deals',
        });
    }
});
// Create closable deal
router.post('/deals', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { propertyId, agentId, urgency, closingProbability, assignedTo, notes } = req.body;
        if (!propertyId || !agentId) {
            return res.status(400).json({
                success: false,
                error: 'Property ID and Agent ID are required',
            });
        }
        const now = new Date().toISOString();
        const newDeal = {
            id: uuidv4(),
            propertyId,
            agentId,
            urgency: urgency || 'medium',
            closingProbability: closingProbability || 50,
            status: 'active',
            assignedTo,
            notes,
            createdAt: now,
            updatedAt: now,
        };
        closableDealModel.create(newDeal);
        res.status(201).json({
            success: true,
            data: newDeal,
        });
    }
    catch (error) {
        console.error('Create deal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create deal',
        });
    }
});
// Update closable deal
router.put('/deals/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id;
        delete updates.createdAt;
        updates.updatedAt = new Date().toISOString();
        const updatedDeal = closableDealModel.update(id, updates);
        if (!updatedDeal) {
            return res.status(404).json({
                success: false,
                error: 'Deal not found',
            });
        }
        res.json({
            success: true,
            data: updatedDeal,
        });
    }
    catch (error) {
        console.error('Update deal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update deal',
        });
    }
});
// ============ VILANOW TASKS ============
// Get tasks
router.get('/tasks', authenticate, requireRole('admin', 'agent'), async (req, res) => {
    try {
        const { status, priority, assignedAgent } = req.query;
        let tasks;
        if (req.userRole === 'agent') {
            tasks = vilanowTaskModel.findByAgent(req.userId);
        }
        else {
            tasks = vilanowTaskModel.findAll();
        }
        if (status) {
            tasks = tasks.filter(t => t.status === status);
        }
        if (priority) {
            tasks = tasks.filter(t => t.priority === priority);
        }
        if (assignedAgent) {
            tasks = tasks.filter(t => t.assignedAgent === assignedAgent);
        }
        res.json({
            success: true,
            data: tasks,
        });
    }
    catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tasks',
        });
    }
});
// Create task
router.post('/tasks', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { dealId, propertyTitle, assignedAgent, priority, deadline, notes } = req.body;
        if (!dealId || !propertyTitle || !assignedAgent) {
            return res.status(400).json({
                success: false,
                error: 'Deal ID, property title, and assigned agent are required',
            });
        }
        const now = new Date().toISOString();
        const newTask = {
            id: uuidv4(),
            dealId,
            propertyTitle,
            assignedAgent,
            priority: priority || 'medium',
            status: 'pending',
            deadline,
            notes,
            createdAt: now,
            updatedAt: now,
        };
        vilanowTaskModel.create(newTask);
        res.status(201).json({
            success: true,
            data: newTask,
        });
    }
    catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create task',
        });
    }
});
// Update task
router.put('/tasks/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const task = vilanowTaskModel.findById(id);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }
        // Agents can only update their own tasks
        if (req.userRole === 'agent' && task.assignedAgent !== req.userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this task',
            });
        }
        delete updates.id;
        delete updates.createdAt;
        updates.updatedAt = new Date().toISOString();
        const updatedTask = vilanowTaskModel.update(id, updates);
        res.json({
            success: true,
            data: updatedTask,
        });
    }
    catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update task',
        });
    }
});
// ============ RISK FLAGS ============
// Get risk flags
router.get('/risks', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { type, severity, status } = req.query;
        let risks = riskFlagModel.findAll();
        if (type) {
            risks = risks.filter(r => r.type === type);
        }
        if (severity) {
            risks = risks.filter(r => r.severity === severity);
        }
        if (status) {
            risks = risks.filter(r => r.status === status);
        }
        else {
            risks = riskFlagModel.findActive();
        }
        res.json({
            success: true,
            data: risks,
        });
    }
    catch (error) {
        console.error('Get risks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get risk flags',
        });
    }
});
// Create risk flag
router.post('/risks', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { entityType, entityId, type, severity, evidence, description } = req.body;
        if (!entityType || !entityId || !type || !severity) {
            return res.status(400).json({
                success: false,
                error: 'Entity type, entity ID, type, and severity are required',
            });
        }
        const now = new Date().toISOString();
        const newRisk = {
            id: uuidv4(),
            entityType,
            entityId,
            type,
            severity,
            status: 'active',
            evidence,
            description,
            createdBy: req.userId,
            createdAt: now,
            updatedAt: now,
        };
        riskFlagModel.create(newRisk);
        res.status(201).json({
            success: true,
            data: newRisk,
        });
    }
    catch (error) {
        console.error('Create risk error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create risk flag',
        });
    }
});
// Update risk flag
router.put('/risks/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id;
        delete updates.createdAt;
        delete updates.createdBy;
        updates.updatedAt = new Date().toISOString();
        const updatedRisk = riskFlagModel.update(id, updates);
        if (!updatedRisk) {
            return res.status(404).json({
                success: false,
                error: 'Risk flag not found',
            });
        }
        res.json({
            success: true,
            data: updatedRisk,
        });
    }
    catch (error) {
        console.error('Update risk error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update risk flag',
        });
    }
});
// ============ AUTOMATION RULES ============
// Get automation rules
router.get('/automation', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { enabled } = req.query;
        let rules;
        if (enabled === 'true') {
            rules = automationRuleModel.findEnabled();
        }
        else {
            rules = automationRuleModel.findAll();
        }
        res.json({
            success: true,
            data: rules,
        });
    }
    catch (error) {
        console.error('Get automation rules error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get automation rules',
        });
    }
});
// Create automation rule
router.post('/automation', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { name, description, condition, action, enabled, priority } = req.body;
        if (!name || !condition || !action) {
            return res.status(400).json({
                success: false,
                error: 'Name, condition, and action are required',
            });
        }
        const now = new Date().toISOString();
        const newRule = {
            id: uuidv4(),
            name,
            description,
            condition,
            action,
            enabled: enabled ?? true,
            priority: priority ?? 0,
            triggerCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        automationRuleModel.create(newRule);
        res.status(201).json({
            success: true,
            data: newRule,
        });
    }
    catch (error) {
        console.error('Create automation rule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create automation rule',
        });
    }
});
// Update automation rule
router.put('/automation/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id;
        delete updates.createdAt;
        delete updates.triggerCount;
        updates.updatedAt = new Date().toISOString();
        const updatedRule = automationRuleModel.update(id, updates);
        if (!updatedRule) {
            return res.status(404).json({
                success: false,
                error: 'Automation rule not found',
            });
        }
        res.json({
            success: true,
            data: updatedRule,
        });
    }
    catch (error) {
        console.error('Update automation rule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update automation rule',
        });
    }
});
// Delete automation rule
router.delete('/automation/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = automationRuleModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Automation rule not found',
            });
        }
        res.json({
            success: true,
            message: 'Automation rule deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete automation rule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete automation rule',
        });
    }
});
export default router;
//# sourceMappingURL=ciu.routes.js.map