import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { propertyModel } from '../models/Property.js';
import { userModel } from '../models/User.js';
import { interestModel } from '../models/Interest.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { notifyPropertyListed } from '../services/notification.service.js';
const router = Router();
// Get all properties (with filters) - for clients to browse
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { location, type, minPrice, maxPrice, bedrooms, agentId, featured, status, page = 1, limit = 20 } = req.query;
        const filters = {};
        if (location)
            filters.location = location;
        if (type)
            filters.type = type;
        if (minPrice)
            filters.minPrice = Number(minPrice);
        if (maxPrice)
            filters.maxPrice = Number(maxPrice);
        if (bedrooms)
            filters.bedrooms = Number(bedrooms);
        if (agentId)
            filters.agentId = agentId;
        if (featured === 'true')
            filters.featured = true;
        // Default to showing only available properties unless specified
        if (status) {
            filters.status = status;
        }
        else {
            filters.status = 'available';
        }
        let properties = propertyModel.search(filters);
        // Pagination
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedProperties = properties.slice(startIndex, endIndex);
        res.json({
            success: true,
            data: paginatedProperties,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: properties.length,
                totalPages: Math.ceil(properties.length / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get properties',
        });
    }
});
// Get my properties (for agents) with interest counts - MUST come before /:id
router.get('/my/listings', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const properties = propertyModel.findByAgent(req.userId);
        // Enrich with interest counts
        const enrichedProperties = properties.map(property => {
            const interests = interestModel.findByProperty(property.id);
            const unlockedInterests = interests.filter(i => i.unlocked);
            const pendingInterests = interests.filter(i => !i.unlocked);
            return {
                ...property,
                interestStats: {
                    total: interests.length,
                    unlocked: unlockedInterests.length,
                    pending: pendingInterests.length,
                },
            };
        });
        res.json({
            success: true,
            data: enrichedProperties,
        });
    }
    catch (error) {
        console.error('Get my listings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get listings',
        });
    }
});
// Get agent statistics - MUST come before /:id
router.get('/my/stats', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const properties = propertyModel.findByAgent(req.userId);
        const allInterests = properties.flatMap(p => interestModel.findByProperty(p.id));
        const stats = {
            totalListings: properties.length,
            availableListings: properties.filter(p => p.status === 'available').length,
            pendingListings: properties.filter(p => p.status === 'pending').length,
            soldListings: properties.filter(p => p.status === 'sold').length,
            totalInterests: allInterests.length,
            unlockedInterests: allInterests.filter(i => i.unlocked).length,
            pendingInterests: allInterests.filter(i => !i.unlocked).length,
            contactedInterests: allInterests.filter(i => i.status === 'contacted').length,
        };
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Get agent stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics',
        });
    }
});
// Get property by ID - with interest check for logged-in users
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const property = propertyModel.findById(id);
        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found',
            });
        }
        // Get agent info
        const agent = userModel.findById(property.agentId);
        // Check if current user has already expressed interest
        let userInterest = null;
        if (req.userId) {
            const existingInterest = interestModel.findOne(i => i.propertyId === id && i.seekerId === req.userId);
            if (existingInterest) {
                userInterest = {
                    id: existingInterest.id,
                    status: existingInterest.status,
                    createdAt: existingInterest.createdAt,
                };
            }
        }
        res.json({
            success: true,
            data: {
                ...property,
                agent: agent ? {
                    id: agent.id,
                    name: agent.name,
                    avatar: agent.avatar,
                    verified: agent.verified || false,
                    rating: agent.rating,
                    totalListings: agent.totalListings,
                } : null,
                userInterest,
            },
        });
    }
    catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get property',
        });
    }
});
// Create property (agents only)
// Supports form fields: location, type, agentType, title, price, bedrooms, bathrooms, description, amenities, images, videos
router.post('/', authenticate, requireRole('agent', 'admin'), async (req, res) => {
    try {
        const { title, type, price, location, area, bedrooms, bathrooms, images, videos, amenities, description, featured, agentType: requestAgentType // Allow overriding agent type per listing (direct/semi-direct)
         } = req.body;
        // Validate required fields
        if (!title || !type || !price || !location) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: title, type, price, location',
            });
        }
        // Validate property type
        const validTypes = ['apartment', 'house', 'duplex', 'penthouse', 'studio', 'land'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid property type. Must be one of: ${validTypes.join(', ')}`,
            });
        }
        // Validate price
        if (isNaN(Number(price)) || Number(price) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Price must be a positive number',
            });
        }
        const agent = userModel.findById(req.userId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
            });
        }
        // Validate amenities if provided
        const validAmenities = ['Pool', 'Gym', '24/7 Security', 'Parking', 'Generator', 'BQ', 'Garden', 'Smart Home'];
        const sanitizedAmenities = amenities
            ? amenities.filter((a) => validAmenities.includes(a))
            : [];
        // Determine agent type for this listing
        const listingAgentType = requestAgentType === 'direct' || requestAgentType === 'semi-direct'
            ? requestAgentType
            : agent.agentType || 'semi-direct';
        const now = new Date().toISOString();
        const newProperty = {
            id: uuidv4(),
            title,
            type,
            price: Number(price),
            location,
            area: area || location, // Use location as area if not provided
            bedrooms: bedrooms ? Number(bedrooms) : undefined,
            bathrooms: bathrooms ? Number(bathrooms) : undefined,
            images: images || [],
            videos: videos || [],
            amenities: sanitizedAmenities,
            description: description || '',
            agentId: req.userId,
            agentType: listingAgentType,
            agentName: agent.name,
            agentVerified: agent.verified || false,
            postedAt: now,
            featured: featured || false,
            status: 'available',
            createdAt: now,
            updatedAt: now,
        };
        propertyModel.create(newProperty);
        // Update agent's total listings
        if (agent.role === 'agent') {
            userModel.update(agent.id, {
                totalListings: (agent.totalListings || 0) + 1,
                updatedAt: now,
            });
        }
        // Send notification to agent that property was listed
        notifyPropertyListed({
            agentId: req.userId,
            propertyId: newProperty.id,
            propertyTitle: newProperty.title,
        });
        res.status(201).json({
            success: true,
            data: newProperty,
            message: 'Property listed successfully! Clients can now see and express interest in your listing.',
        });
    }
    catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create property',
        });
    }
});
// Update property
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const property = propertyModel.findById(id);
        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found',
            });
        }
        // Only allow property owner or admin to update
        if (property.agentId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this property',
            });
        }
        // Prevent updating protected fields
        delete updates.id;
        delete updates.agentId;
        delete updates.createdAt;
        updates.updatedAt = new Date().toISOString();
        const updatedProperty = propertyModel.update(id, updates);
        res.json({
            success: true,
            data: updatedProperty,
        });
    }
    catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update property',
        });
    }
});
// Delete property
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const property = propertyModel.findById(id);
        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found',
            });
        }
        // Only allow property owner or admin to delete
        if (property.agentId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this property',
            });
        }
        propertyModel.delete(id);
        // Update agent's total listings
        const agent = userModel.findById(property.agentId);
        if (agent && agent.role === 'agent') {
            userModel.update(agent.id, {
                totalListings: Math.max(0, (agent.totalListings || 1) - 1),
                updatedAt: new Date().toISOString(),
            });
        }
        res.json({
            success: true,
            message: 'Property deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete property',
        });
    }
});
export default router;
//# sourceMappingURL=property.routes.js.map