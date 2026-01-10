// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { userModel } from '../models/User.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const users = userModel.findAll().map(user => {
      const { passwordHash, ...userData } = user;
      return userData;
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
    });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { passwordHash, ...userData } = user;

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

// Update user
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow users to update themselves or admins to update anyone
    if (req.userId !== id && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this user',
      });
    }

    // Prevent updating sensitive fields
    delete updates.id;
    delete updates.email;
    delete updates.role;
    delete updates.passwordHash;

    // Handle password update separately
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }

    updates.updatedAt = new Date().toISOString();

    const updatedUser = userModel.update(id, updates);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { passwordHash, ...userData } = updatedUser;

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
});

// Delete user (soft delete by default)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.body;

    // Only allow users to delete themselves or admins to delete anyone
    if (req.userId !== id && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this user',
      });
    }

    if (hardDelete && req.userRole === 'admin') {
      const deleted = userModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
    } else {
      const updated = userModel.update(id, { active: false, updatedAt: new Date().toISOString() });
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
});

// Get agents list (public)
router.get('/agents/list', async (req: AuthRequest, res: Response) => {
  try {
    const agents = userModel.findAgents()
      .filter(agent => agent.active && agent.verified)
      .map(agent => {
        const { passwordHash, ...agentData } = agent;
        return agentData;
      });

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
    });
  }
});

export default router;


