// @ts-nocheck
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { groupModel, groupMessageModel } from '../models/Group.js';
import { userModel } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
// Get user's groups
router.get('/', authenticate, async (req, res) => {
    try {
        const groups = groupModel.findByMember(req.userId);
        res.json({
            success: true,
            data: groups,
        });
    }
    catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get groups',
        });
    }
});
// Create group
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, description, avatar } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Group name is required',
            });
        }
        const creator = userModel.findById(req.userId);
        if (!creator) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const now = new Date().toISOString();
        const newGroup = {
            id: uuidv4(),
            name,
            description: description || '',
            avatar,
            members: [
                {
                    id: req.userId,
                    name: creator.name,
                    avatar: creator.avatar,
                    role: 'admin',
                    joinedAt: now,
                },
            ],
            createdBy: req.userId,
            createdAt: now,
            lastMessageAt: now,
            unreadCount: 0,
        };
        groupModel.create(newGroup);
        res.status(201).json({
            success: true,
            data: newGroup,
        });
    }
    catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create group',
        });
    }
});
// Get group by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const group = groupModel.findById(id);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }
        const isMember = group.members.some(m => m.id === req.userId);
        if (!isMember && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this group',
            });
        }
        res.json({
            success: true,
            data: group,
        });
    }
    catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get group',
        });
    }
});
// Get group messages
router.get('/:groupId/messages', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = groupModel.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }
        const isMember = group.members.some(m => m.id === req.userId);
        if (!isMember && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this group',
            });
        }
        const messages = groupMessageModel.findByGroup(groupId);
        res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('Get group messages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages',
        });
    }
});
// Send message to group
router.post('/:groupId/messages', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { message, type = 'text' } = req.body;
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
            });
        }
        const group = groupModel.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }
        const isMember = group.members.some(m => m.id === req.userId);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this group',
            });
        }
        const sender = userModel.findById(req.userId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const now = new Date().toISOString();
        const newMessage = {
            id: uuidv4(),
            groupId,
            senderId: req.userId,
            senderName: sender.name,
            senderAvatar: sender.avatar,
            message,
            timestamp: now,
            type,
            createdAt: now,
        };
        groupMessageModel.create(newMessage);
        // Update group's lastMessageAt
        groupModel.update(groupId, { lastMessageAt: now });
        res.status(201).json({
            success: true,
            data: newMessage,
        });
    }
    catch (error) {
        console.error('Send group message error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message',
        });
    }
});
// Add member to group
router.post('/:groupId/members', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
            });
        }
        const group = groupModel.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }
        // Check if requester is admin of the group
        const requesterMember = group.members.find(m => m.id === req.userId);
        if (!requesterMember || requesterMember.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only group admins can add members',
            });
        }
        // Check if user is already a member
        if (group.members.some(m => m.id === userId)) {
            return res.status(400).json({
                success: false,
                error: 'User is already a member',
            });
        }
        const newMember = userModel.findById(userId);
        if (!newMember) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const now = new Date().toISOString();
        const updatedMembers = [
            ...group.members,
            {
                id: userId,
                name: newMember.name,
                avatar: newMember.avatar,
                role: 'member',
                joinedAt: now,
            },
        ];
        groupModel.update(groupId, { members: updatedMembers });
        res.json({
            success: true,
            message: 'Member added successfully',
        });
    }
    catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add member',
        });
    }
});
export default router;
//# sourceMappingURL=group.routes.js.map