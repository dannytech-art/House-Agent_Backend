import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { territoryModel } from '../models/Gamification.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import DatabaseService from '../services/database.service.js';
class LocationModel extends DatabaseService {
    constructor() {
        super('locations');
    }
    findByArea(area) {
        return this.findMany(loc => loc.area.toLowerCase().includes(area.toLowerCase()));
    }
    findByState(state) {
        return this.findMany(loc => loc.state === state);
    }
}
const locationModel = new LocationModel();
const router = Router();
// Claim territory
router.post('/claim', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const { area, cost, state, dailyIncome } = req.body;
        if (!area || !cost) {
            return res.status(400).json({
                success: false,
                error: 'Area and cost are required',
            });
        }
        const agent = userModel.findById(req.userId);
        if (!agent || agent.credits < cost) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient credits',
            });
        }
        // Check if already claimed
        const existingTerritory = territoryModel.findOne(t => t.agentId === req.userId && t.area.toLowerCase() === area.toLowerCase());
        if (existingTerritory) {
            return res.status(400).json({
                success: false,
                error: 'You already own this territory',
            });
        }
        const now = new Date().toISOString();
        // Deduct credits
        userModel.update(req.userId, {
            credits: agent.credits - cost,
            updatedAt: now,
        });
        // Create territory
        const newTerritory = {
            id: uuidv4(),
            agentId: req.userId,
            area,
            state,
            dominance: 10,
            activeListings: 0,
            monthlyDeals: 0,
            rank: 1,
            dailyIncome: dailyIncome || Math.floor(cost / 10),
            claimedAt: now,
        };
        territoryModel.create(newTerritory);
        res.status(201).json({
            success: true,
            data: newTerritory,
        });
    }
    catch (error) {
        console.error('Claim territory error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to claim territory',
        });
    }
});
// Get agent's territories
router.get('/my', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const territories = territoryModel.findByAgent(req.userId);
        res.json({
            success: true,
            data: territories,
        });
    }
    catch (error) {
        console.error('Get my territories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get territories',
        });
    }
});
// Get all territories (for map view)
router.get('/', authenticate, async (req, res) => {
    try {
        const { area, agentId } = req.query;
        let territories;
        if (area) {
            territories = territoryModel.findByArea(area);
        }
        else if (agentId) {
            territories = territoryModel.findByAgent(agentId);
        }
        else {
            territories = territoryModel.findAll();
        }
        res.json({
            success: true,
            data: territories,
        });
    }
    catch (error) {
        console.error('Get territories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get territories',
        });
    }
});
// Get locations
router.get('/locations', async (req, res) => {
    try {
        const { area, state, search } = req.query;
        let locations;
        if (area) {
            locations = locationModel.findByArea(area);
        }
        else if (state) {
            locations = locationModel.findByState(state);
        }
        else if (search) {
            locations = locationModel.findMany(loc => loc.name.toLowerCase().includes(search.toLowerCase()) ||
                loc.area.toLowerCase().includes(search.toLowerCase()));
        }
        else {
            locations = locationModel.findAll();
        }
        res.json({
            success: true,
            data: locations,
        });
    }
    catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get locations',
        });
    }
});
// Create location (admin only)
router.post('/locations', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { name, area, state, coordinates, boundaries } = req.body;
        if (!name || !area) {
            return res.status(400).json({
                success: false,
                error: 'Name and area are required',
            });
        }
        const now = new Date().toISOString();
        const newLocation = {
            id: uuidv4(),
            name,
            area,
            state,
            coordinates,
            boundaries,
            createdAt: now,
            updatedAt: now,
        };
        locationModel.create(newLocation);
        res.status(201).json({
            success: true,
            data: newLocation,
        });
    }
    catch (error) {
        console.error('Create location error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create location',
        });
    }
});
// Get location by ID
router.get('/locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const location = locationModel.findById(id);
        if (!location) {
            return res.status(404).json({
                success: false,
                error: 'Location not found',
            });
        }
        res.json({
            success: true,
            data: location,
        });
    }
    catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get location',
        });
    }
});
// Update location (admin only)
router.put('/locations/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id;
        delete updates.createdAt;
        updates.updatedAt = new Date().toISOString();
        const updatedLocation = locationModel.update(id, updates);
        if (!updatedLocation) {
            return res.status(404).json({
                success: false,
                error: 'Location not found',
            });
        }
        res.json({
            success: true,
            data: updatedLocation,
        });
    }
    catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location',
        });
    }
});
// Delete location (admin only)
router.delete('/locations/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = locationModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Location not found',
            });
        }
        res.json({
            success: true,
            message: 'Location deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete location error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete location',
        });
    }
});
export default router;
//# sourceMappingURL=territory.routes.js.map