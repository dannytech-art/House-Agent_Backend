import { Router } from 'express';
import { chatSessionModel, chatMessageModel } from '../models/Chat.js';
import { userModel } from '../models/User.js';
import { propertyModel } from '../models/Property.js';
import { interestModel } from '../models/Interest.js';
import { authenticate } from '../middleware/auth.js';
import { notifyNewMessage } from '../services/notification.service.js';
const router = Router();
// Get all chat sessions for user
router.get('/', authenticate, async (req, res) => {
    try {
        const sessions = await chatSessionModel.findByParticipant(req.userId);
        const currentUser = await userModel.findById(req.userId);
        const isAgent = currentUser?.role === 'agent';
        // Enrich sessions with last message, participant info, and unlock status
        const enrichedSessions = await Promise.all(sessions.map(async (session) => {
            const messages = await chatMessageModel.findBySession(session.id);
            const lastMessage = messages[messages.length - 1];
            const unreadCount = messages.filter(m => !m.read && m.senderId !== req.userId).length;
            const otherParticipantId = session.participantIds.find(id => id !== req.userId);
            const otherParticipant = otherParticipantId ? await userModel.findById(otherParticipantId) : null;
            // Check if interest is unlocked (for agents)
            let isUnlocked = true;
            let interest = null;
            if (session.interestId) {
                interest = await interestModel.findById(session.interestId);
                if (interest && isAgent) {
                    isUnlocked = interest.unlocked;
                }
            }
            // Get property info
            const property = session.propertyId ? await propertyModel.findById(session.propertyId) : null;
            return {
                ...session,
                lastMessage,
                unreadCount,
                isUnlocked,
                canSendMessage: isAgent ? isUnlocked : true, // Seekers can always send
                property: property ? {
                    id: property.id,
                    title: property.title,
                    location: property.location,
                    images: property.images,
                } : null,
                otherParticipant: otherParticipant ? {
                    id: otherParticipant.id,
                    name: otherParticipant.name,
                    avatar: otherParticipant.avatar,
                    role: otherParticipant.role,
                } : null,
            };
        }));
        res.json({
            success: true,
            data: enrichedSessions,
        });
    }
    catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chat sessions',
        });
    }
});
// Get messages for a session
router.get('/:sessionId/messages', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await chatSessionModel.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Chat session not found',
            });
        }
        if (!session.participantIds.includes(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this chat',
            });
        }
        const messages = await chatMessageModel.findBySession(sessionId);
        // Mark messages as read
        for (const msg of messages) {
            if (!msg.read && msg.senderId !== req.userId) {
                await chatMessageModel.update(msg.id, { read: true });
            }
        }
        res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages',
        });
    }
});
// Send message
router.post('/:sessionId/messages', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message, type = 'text', metadata } = req.body;
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
            });
        }
        const session = await chatSessionModel.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Chat session not found',
            });
        }
        if (!session.participantIds.includes(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to send messages in this chat',
            });
        }
        const sender = await userModel.findById(req.userId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        // Check if agent needs to unlock the interest first
        if (sender.role === 'agent' && session.interestId) {
            const interest = await interestModel.findById(session.interestId);
            if (interest && !interest.unlocked) {
                // Get agent's credit balance
                const agent = sender;
                const credits = agent.credits || 0;
                return res.status(403).json({
                    success: false,
                    error: 'You need to unlock this seeker profile to send messages',
                    data: {
                        requiresUnlock: true,
                        interestId: session.interestId,
                        unlockCost: 5,
                        currentCredits: credits,
                        hasEnoughCredits: credits >= 5,
                    },
                });
            }
        }
        const newMessage = await chatMessageModel.create({
            sessionId,
            senderId: req.userId,
            senderName: sender.name,
            senderAvatar: sender.avatar,
            message,
            type,
            metadata,
        });
        // Update session's lastMessageAt
        await chatSessionModel.update(sessionId, {
            lastMessageAt: new Date().toISOString(),
        });
        // Notify the other participant about the new message
        const recipientId = session.participantIds.find(id => id !== req.userId);
        if (recipientId) {
            await notifyNewMessage({
                recipientId,
                senderName: sender.name,
                chatSessionId: sessionId,
                messagePreview: message,
            });
        }
        res.status(201).json({
            success: true,
            data: newMessage,
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message',
        });
    }
});
// Create new chat session
router.post('/', authenticate, async (req, res) => {
    try {
        const { participantId, propertyId, interestId, initialMessage } = req.body;
        if (!participantId) {
            return res.status(400).json({
                success: false,
                error: 'Participant ID is required',
            });
        }
        const participant = await userModel.findById(participantId);
        if (!participant) {
            return res.status(404).json({
                success: false,
                error: 'Participant not found',
            });
        }
        // Check if session already exists between these users
        const sessions = await chatSessionModel.findByParticipant(req.userId);
        const existingSession = sessions.find(s => s.participantIds.includes(participantId) &&
            (!propertyId || s.propertyId === propertyId));
        if (existingSession) {
            return res.json({
                success: true,
                data: existingSession,
            });
        }
        const newSession = await chatSessionModel.create({
            participantIds: [req.userId, participantId],
            propertyId,
            interestId,
        });
        // Send initial message if provided
        if (initialMessage) {
            const sender = await userModel.findById(req.userId);
            await chatMessageModel.create({
                sessionId: newSession.id,
                senderId: req.userId,
                senderName: sender?.name || 'Unknown',
                senderAvatar: sender?.avatar,
                message: initialMessage,
                type: 'text',
            });
        }
        res.status(201).json({
            success: true,
            data: newSession,
        });
    }
    catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create chat session',
        });
    }
});
export default router;
//# sourceMappingURL=chat.routes.js.map