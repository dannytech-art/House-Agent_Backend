// @ts-nocheck
import { Router } from 'express';
import { interestModel } from '../models/Interest.js';
import { propertyModel } from '../models/Property.js';
import { userModel } from '../models/User.js';
import { chatSessionModel, chatMessageModel } from '../models/Chat.js';
import { inspectionModel } from '../models/Inspection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { notifyInterestExpressed, notifyInterestUnlocked } from '../services/notification.service.js';
const router = Router();
// Get interests (filtered by property or seeker)
router.get('/', authenticate, async (req, res) => {
    try {
        const { propertyId, seekerId, status } = req.query;
        let interests;
        if (propertyId) {
            interests = await interestModel.findByProperty(propertyId);
        }
        else if (seekerId) {
            // Only allow users to see their own interests or admins
            if (seekerId !== req.userId && req.userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to view these interests',
                });
            }
            interests = await interestModel.findBySeeker(seekerId);
        }
        else if (req.userRole === 'agent') {
            // Get interests for all properties owned by this agent
            const agentProperties = await propertyModel.findByAgent(req.userId);
            const propertyIds = agentProperties.map(p => p.id);
            const allInterests = await interestModel.findAll();
            interests = allInterests.filter(i => propertyIds.includes(i.propertyId));
        }
        else if (req.userRole === 'admin') {
            interests = await interestModel.findAll();
        }
        else {
            interests = await interestModel.findBySeeker(req.userId);
        }
        if (status) {
            interests = interests.filter(i => i.status === status);
        }
        // Enrich interests with property and chat session info
        const enrichedInterests = await Promise.all(interests.map(async (interest) => {
            const property = await propertyModel.findById(interest.propertyId);
            const chatSession = await chatSessionModel.findByInterest(interest.id);
            return {
                ...interest,
                property: property ? {
                    id: property.id,
                    title: property.title,
                    location: property.location,
                    price: property.price,
                    images: property.images,
                } : null,
                chatSessionId: chatSession?.id || null,
            };
        }));
        res.json({
            success: true,
            data: enrichedInterests,
        });
    }
    catch (error) {
        console.error('Get interests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get interests',
        });
    }
});
// Get all seekers who expressed interest in agent's properties (Agent Dashboard)
router.get('/agent/seekers', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const { propertyId, status } = req.query;
        // Get agent's properties
        const agentProperties = await propertyModel.findByAgent(req.userId);
        const propertyIds = propertyId
            ? [propertyId]
            : agentProperties.map(p => p.id);
        // Get all interests for these properties
        const allInterests = await interestModel.findAll();
        let interests = allInterests.filter(i => propertyIds.includes(i.propertyId));
        if (status) {
            interests = interests.filter(i => i.status === status);
        }
        // Sort by most recent first
        interests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Enrich with full details
        const enrichedInterests = await Promise.all(interests.map(async (interest) => {
            const property = await propertyModel.findById(interest.propertyId);
            const seeker = await userModel.findById(interest.seekerId);
            const chatSession = await chatSessionModel.findByInterest(interest.id);
            const inspection = await inspectionModel.findByInterest(interest.id);
            return {
                id: interest.id,
                status: interest.status,
                unlocked: interest.unlocked,
                message: interest.message,
                seriousnessScore: interest.seriousnessScore,
                createdAt: interest.createdAt,
                seeker: seeker ? {
                    id: seeker.id,
                    name: seeker.name,
                    phone: interest.unlocked ? seeker.phone : '******' + seeker.phone.slice(-4),
                    avatar: seeker.avatar,
                } : null,
                property: property ? {
                    id: property.id,
                    title: property.title,
                    location: property.location,
                    price: property.price,
                    images: property.images,
                } : null,
                chatSessionId: chatSession?.id || null,
                inspection: inspection ? {
                    id: inspection.id,
                    scheduledDate: inspection.scheduledDate,
                    status: inspection.status,
                    notes: inspection.notes,
                } : null,
            };
        }));
        res.json({
            success: true,
            data: enrichedInterests,
            summary: {
                total: enrichedInterests.length,
                pending: enrichedInterests.filter(i => i.status === 'pending').length,
                contacted: enrichedInterests.filter(i => i.status === 'contacted').length,
                viewingScheduled: enrichedInterests.filter(i => i.status === 'viewing-scheduled').length,
                closed: enrichedInterests.filter(i => i.status === 'closed').length,
            },
        });
    }
    catch (error) {
        console.error('Get agent seekers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get seekers',
        });
    }
});
// Get interests for a specific property (Agent)
router.get('/property/:propertyId', authenticate, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const property = await propertyModel.findById(propertyId);
        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found',
            });
        }
        // Only property owner or admin can view
        if (property.agentId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view interests for this property',
            });
        }
        const interests = await interestModel.findByProperty(propertyId);
        // Enrich with seeker and inspection info
        const enrichedInterests = await Promise.all(interests.map(async (interest) => {
            const seeker = await userModel.findById(interest.seekerId);
            const chatSession = await chatSessionModel.findByInterest(interest.id);
            const inspection = await inspectionModel.findByInterest(interest.id);
            return {
                ...interest,
                seekerPhone: interest.unlocked ? interest.seekerPhone : '******' + interest.seekerPhone.slice(-4),
                seeker: seeker ? {
                    id: seeker.id,
                    name: seeker.name,
                    avatar: seeker.avatar,
                } : null,
                chatSessionId: chatSession?.id || null,
                inspection: inspection ? {
                    id: inspection.id,
                    scheduledDate: inspection.scheduledDate,
                    status: inspection.status,
                } : null,
            };
        }));
        res.json({
            success: true,
            data: enrichedInterests,
            property: {
                id: property.id,
                title: property.title,
                location: property.location,
            },
        });
    }
    catch (error) {
        console.error('Get property interests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get interests',
        });
    }
});
// Get my interests (for seekers/clients) with inspection info
router.get('/my', authenticate, async (req, res) => {
    try {
        const interests = await interestModel.findBySeeker(req.userId);
        // Enrich with property info, chat session, and inspection
        const enrichedInterests = await Promise.all(interests.map(async (interest) => {
            const property = await propertyModel.findById(interest.propertyId);
            const chatSession = await chatSessionModel.findByInterest(interest.id);
            const inspection = await inspectionModel.findByInterest(interest.id);
            return {
                ...interest,
                property: property ? {
                    id: property.id,
                    title: property.title,
                    location: property.location,
                    area: property.area,
                    price: property.price,
                    type: property.type,
                    bedrooms: property.bedrooms,
                    bathrooms: property.bathrooms,
                    images: property.images,
                    agentName: property.agentName,
                    agentVerified: property.agentVerified,
                    agentId: property.agentId,
                } : null,
                chatSessionId: chatSession?.id || null,
                inspection: inspection ? {
                    id: inspection.id,
                    scheduledDate: inspection.scheduledDate,
                    status: inspection.status,
                    notes: inspection.notes,
                } : null,
            };
        }));
        res.json({
            success: true,
            data: enrichedInterests,
        });
    }
    catch (error) {
        console.error('Get my interests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get your interests',
        });
    }
});
// Create interest (seekers expressing interest in a property)
router.post('/', authenticate, async (req, res) => {
    try {
        const { propertyId, message, seriousnessScore } = req.body;
        if (!propertyId) {
            return res.status(400).json({
                success: false,
                error: 'Property ID is required',
            });
        }
        const property = await propertyModel.findById(propertyId);
        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found',
            });
        }
        // Check if property is available
        if (property.status !== 'available') {
            return res.status(400).json({
                success: false,
                error: 'This property is no longer available',
            });
        }
        const seeker = await userModel.findById(req.userId);
        if (!seeker) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        // Check if already expressed interest
        const existingInterest = await interestModel.checkExistingInterest(propertyId, req.userId);
        if (existingInterest) {
            // Return existing interest with chat session
            const chatSession = await chatSessionModel.findByInterest(existingInterest.id);
            return res.status(400).json({
                success: false,
                error: 'You have already expressed interest in this property',
                data: {
                    interestId: existingInterest.id,
                    chatSessionId: chatSession?.id,
                },
            });
        }
        const now = new Date().toISOString();
        // Create the interest
        const newInterest = await interestModel.create({
            propertyId,
            seekerId: req.userId,
            seekerName: seeker.name,
            seekerPhone: seeker.phone,
            message: message || '',
            seriousnessScore: seriousnessScore || 5,
            unlocked: false,
            status: 'pending',
        });
        // Automatically create a chat session between seeker and agent
        const chatSession = await chatSessionModel.create({
            participantIds: [req.userId, property.agentId],
            propertyId: property.id,
            interestId: newInterest.id,
        });
        // Send initial system message in the chat
        await chatMessageModel.create({
            sessionId: chatSession.id,
            senderId: req.userId,
            senderName: seeker.name,
            senderAvatar: seeker.avatar,
            message: message || `Hi, I'm interested in your property "${property.title}". I'd like to know more about it.`,
            type: 'text',
        });
        // Send notifications to both parties
        await notifyInterestExpressed({
            agentId: property.agentId,
            seekerId: req.userId,
            seekerName: seeker.name,
            propertyId: property.id,
            propertyTitle: property.title,
            chatSessionId: chatSession.id,
        });
        // Update agent's total interests
        const agent = await userModel.findById(property.agentId);
        if (agent && agent.role === 'agent') {
            await userModel.update(agent.id, {
                totalInterests: (agent.totalInterests || 0) + 1,
            });
        }
        res.status(201).json({
            success: true,
            data: {
                interest: newInterest,
                chatSession: {
                    id: chatSession.id,
                    participantIds: chatSession.participantIds,
                    propertyId: chatSession.propertyId,
                },
            },
            message: 'Interest expressed successfully! A chat has been started with the agent.',
        });
    }
    catch (error) {
        console.error('Create interest error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create interest',
        });
    }
});
// Update interest (agent unlocking, updating status)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const interest = await interestModel.findById(id);
        if (!interest) {
            return res.status(404).json({
                success: false,
                error: 'Interest not found',
            });
        }
        // Verify authorization
        const property = await propertyModel.findById(interest.propertyId);
        const isPropertyOwner = property && property.agentId === req.userId;
        const isSeeker = interest.seekerId === req.userId;
        const isAdmin = req.userRole === 'admin';
        if (!isPropertyOwner && !isSeeker && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this interest',
            });
        }
        // Prevent updating protected fields
        delete updates.id;
        delete updates.propertyId;
        delete updates.seekerId;
        delete updates.createdAt;
        const updatedInterest = await interestModel.update(id, updates);
        res.json({
            success: true,
            data: updatedInterest,
        });
    }
    catch (error) {
        console.error('Update interest error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update interest',
        });
    }
});
// Unlock interest (costs credits)
router.post('/:id/unlock', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const interest = await interestModel.findById(id);
        if (!interest) {
            return res.status(404).json({
                success: false,
                error: 'Interest not found',
            });
        }
        const property = await propertyModel.findById(interest.propertyId);
        if (!property || property.agentId !== req.userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to unlock this interest',
            });
        }
        if (interest.unlocked) {
            return res.status(400).json({
                success: false,
                error: 'Interest is already unlocked',
            });
        }
        const agent = await userModel.findById(req.userId);
        const unlockCost = 5; // Credits to unlock
        if (!agent || (agent.credits || 0) < unlockCost) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient credits to unlock interest',
            });
        }
        // Deduct credits and unlock
        await userModel.update(agent.id, {
            credits: (agent.credits || 0) - unlockCost,
        });
        const updatedInterest = await interestModel.update(id, {
            unlocked: true,
            status: 'contacted',
        });
        // Notify the seeker that their interest was unlocked
        const chatSession = await chatSessionModel.findByInterest(id);
        await notifyInterestUnlocked({
            seekerId: interest.seekerId,
            agentName: agent.name,
            propertyTitle: property.title,
            chatSessionId: chatSession?.id || '',
        });
        res.json({
            success: true,
            data: {
                interest: updatedInterest,
                chatSessionId: chatSession?.id,
                creditsRemaining: (agent.credits || 0) - unlockCost,
            },
        });
    }
    catch (error) {
        console.error('Unlock interest error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unlock interest',
        });
    }
});
// Get chat session for an interest
router.get('/:id/chat', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const interest = await interestModel.findById(id);
        if (!interest) {
            return res.status(404).json({
                success: false,
                error: 'Interest not found',
            });
        }
        // Verify user is participant
        const property = await propertyModel.findById(interest.propertyId);
        const isAgent = property && property.agentId === req.userId;
        const isSeeker = interest.seekerId === req.userId;
        if (!isAgent && !isSeeker && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this chat',
            });
        }
        const chatSession = await chatSessionModel.findByInterest(id);
        if (!chatSession) {
            return res.status(404).json({
                success: false,
                error: 'Chat session not found for this interest',
            });
        }
        // Get messages
        const messages = await chatMessageModel.findBySession(chatSession.id);
        // Get other participant info
        const otherParticipantId = chatSession.participantIds.find(pid => pid !== req.userId);
        const otherParticipant = otherParticipantId ? await userModel.findById(otherParticipantId) : null;
        res.json({
            success: true,
            data: {
                session: chatSession,
                messages,
                property: property ? {
                    id: property.id,
                    title: property.title,
                    location: property.location,
                    price: property.price,
                    images: property.images,
                } : null,
                otherParticipant: otherParticipant ? {
                    id: otherParticipant.id,
                    name: otherParticipant.name,
                    avatar: otherParticipant.avatar,
                    role: otherParticipant.role,
                } : null,
            },
        });
    }
    catch (error) {
        console.error('Get interest chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chat session',
        });
    }
});
export default router;
//# sourceMappingURL=interest.routes.js.map