import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { marketplaceOfferModel, collaborationModel } from '../models/Marketplace.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// Get marketplace offers
router.get('/offers', authenticate, async (req, res) => {
    try {
        const { agentId, type, status } = req.query;
        let offers = marketplaceOfferModel.findAll();
        if (agentId) {
            offers = offers.filter(o => o.agentId === agentId);
        }
        if (type) {
            offers = offers.filter(o => o.type === type);
        }
        if (status) {
            offers = offers.filter(o => o.status === status);
        }
        else {
            // Default to active offers
            offers = offers.filter(o => o.status === 'active');
        }
        res.json({
            success: true,
            data: offers,
        });
    }
    catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get offers',
        });
    }
});
// Create marketplace offer
router.post('/offers', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const { type, propertyId, description, price } = req.body;
        if (!type || !description || !price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: type, description, price',
            });
        }
        const agent = userModel.findById(req.userId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
            });
        }
        const now = new Date().toISOString();
        const newOffer = {
            id: uuidv4(),
            type,
            agentId: req.userId,
            agentName: agent.name,
            propertyId,
            description,
            price: Number(price),
            status: 'active',
            createdAt: now,
            updatedAt: now,
        };
        marketplaceOfferModel.create(newOffer);
        res.status(201).json({
            success: true,
            data: newOffer,
        });
    }
    catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create offer',
        });
    }
});
// Purchase offer
router.post('/offers/:offerId/purchase', authenticate, async (req, res) => {
    try {
        const { offerId } = req.params;
        const offer = marketplaceOfferModel.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Offer not found',
            });
        }
        if (offer.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Offer is no longer available',
            });
        }
        if (offer.agentId === req.userId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot purchase your own offer',
            });
        }
        const buyer = userModel.findById(req.userId);
        if (!buyer || buyer.credits < offer.price) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient credits',
            });
        }
        const now = new Date().toISOString();
        // Deduct credits from buyer
        userModel.update(req.userId, {
            credits: buyer.credits - offer.price,
            updatedAt: now,
        });
        // Add credits to seller
        const seller = userModel.findById(offer.agentId);
        if (seller) {
            userModel.update(offer.agentId, {
                credits: (seller.credits || 0) + offer.price,
                updatedAt: now,
            });
        }
        // Update offer status
        marketplaceOfferModel.update(offerId, {
            status: 'completed',
            updatedAt: now,
        });
        res.json({
            success: true,
            message: 'Offer purchased successfully',
            data: {
                newBalance: buyer.credits - offer.price,
            },
        });
    }
    catch (error) {
        console.error('Purchase offer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to purchase offer',
        });
    }
});
// Get collaborations
router.get('/collaborations', authenticate, async (req, res) => {
    try {
        const { agentId, type, status } = req.query;
        let collaborations = agentId
            ? collaborationModel.findByAgent(agentId)
            : collaborationModel.findByAgent(req.userId);
        if (type) {
            collaborations = collaborations.filter(c => c.type === type);
        }
        if (status) {
            collaborations = collaborations.filter(c => c.status === status);
        }
        res.json({
            success: true,
            data: collaborations,
        });
    }
    catch (error) {
        console.error('Get collaborations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get collaborations',
        });
    }
});
// Create collaboration request
router.post('/collaborations', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const { partnerId, type, propertyId, terms, commission } = req.body;
        if (!partnerId || !type || !terms) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: partnerId, type, terms',
            });
        }
        const partner = userModel.findById(partnerId);
        if (!partner || partner.role !== 'agent') {
            return res.status(404).json({
                success: false,
                error: 'Partner agent not found',
            });
        }
        const now = new Date().toISOString();
        const newCollaboration = {
            id: uuidv4(),
            type,
            initiatorId: req.userId,
            partnerId,
            propertyId,
            status: 'pending',
            terms,
            commission,
            createdAt: now,
            updatedAt: now,
        };
        collaborationModel.create(newCollaboration);
        res.status(201).json({
            success: true,
            data: newCollaboration,
        });
    }
    catch (error) {
        console.error('Create collaboration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create collaboration',
        });
    }
});
// Update collaboration (accept/reject)
router.put('/collaborations/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const collaboration = collaborationModel.findById(id);
        if (!collaboration) {
            return res.status(404).json({
                success: false,
                error: 'Collaboration not found',
            });
        }
        // Only partner can accept/reject
        if (collaboration.partnerId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this collaboration',
            });
        }
        const updatedCollaboration = collaborationModel.update(id, {
            status,
            updatedAt: new Date().toISOString(),
        });
        res.json({
            success: true,
            data: updatedCollaboration,
        });
    }
    catch (error) {
        console.error('Update collaboration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update collaboration',
        });
    }
});
export default router;
//# sourceMappingURL=marketplace.routes.js.map