// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { questModel, challengeModel, territoryModel, badgeModel } from '../models/Gamification.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get challenges
router.get('/challenges', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, completed } = req.query;

    let challenges;
    if (agentId) {
      challenges = challengeModel.findByAgent(agentId as string);
    } else if (req.userRole === 'agent') {
      challenges = challengeModel.findByAgent(req.userId!);
    } else {
      challenges = challengeModel.findAll();
    }

    if (completed === 'true') {
      challenges = challenges.filter(c => c.completed);
    } else if (completed === 'false') {
      challenges = challenges.filter(c => !c.completed);
    }

    res.json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get challenges',
    });
  }
});

// Create challenge (admin only)
router.post('/challenges', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, title, description, type, target, reward, deadline } = req.body;

    if (!agentId || !title || !type || !target || !deadline) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const now = new Date().toISOString();
    const newChallenge = {
      id: uuidv4(),
      agentId,
      title,
      description: description || '',
      type,
      progress: 0,
      target: Number(target),
      reward: reward || { xp: 100, credits: 10 },
      deadline,
      completed: false,
      createdAt: now,
    };

    challengeModel.create(newChallenge);

    res.status(201).json({
      success: true,
      data: newChallenge,
    });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create challenge',
    });
  }
});

// Update challenge progress
router.put('/challenges/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const challenge = challengeModel.findById(id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        error: 'Challenge not found',
      });
    }

    if (challenge.agentId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this challenge',
      });
    }

    // Check if challenge is now completed
    if (updates.progress >= challenge.target && !challenge.completed) {
      updates.completed = true;

      // Award rewards to agent
      const agent = userModel.findById(challenge.agentId) as any;
      if (agent) {
        userModel.update(agent.id, {
          xp: (agent.xp || 0) + challenge.reward.xp,
          credits: (agent.credits || 0) + challenge.reward.credits,
          updatedAt: new Date().toISOString(),
        });

        // Award badge if applicable
        if (challenge.reward.badge) {
          badgeModel.create({
            id: uuidv4(),
            agentId: agent.id,
            badge: challenge.reward.badge,
            earnedAt: new Date().toISOString(),
          });
        }
      }
    }

    const updatedChallenge = challengeModel.update(id, updates);

    res.json({
      success: true,
      data: updatedChallenge,
    });
  } catch (error) {
    console.error('Update challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update challenge',
    });
  }
});

// Get quests
router.get('/quests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type, completed } = req.query;

    let quests;
    if (userId) {
      quests = questModel.findByUser(userId as string);
    } else {
      quests = questModel.findByUser(req.userId!);
    }

    if (type) {
      quests = quests.filter(q => q.type === type);
    }

    if (completed === 'true') {
      quests = quests.filter(q => q.completed);
    } else if (completed === 'false') {
      quests = quests.filter(q => !q.completed);
    }

    res.json({
      success: true,
      data: quests,
    });
  } catch (error) {
    console.error('Get quests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quests',
    });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res: Response) => {
  try {
    const { sortBy = 'xp', limit = 10 } = req.query;

    const agents = userModel.findAgents()
      .filter(agent => agent.active)
      .map(agent => {
        const { passwordHash, ...agentData } = agent;
        return agentData;
      });

    // Sort by specified field
    agents.sort((a: any, b: any) => {
      const fieldA = a[sortBy as string] || 0;
      const fieldB = b[sortBy as string] || 0;
      return fieldB - fieldA;
    });

    const topAgents = agents.slice(0, Number(limit));

    res.json({
      success: true,
      data: topAgents,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
    });
  }
});

// Get badges
router.get('/badges', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { agentId } = req.query;

    const badges = agentId
      ? badgeModel.findByAgent(agentId as string)
      : badgeModel.findByAgent(req.userId!);

    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get badges',
    });
  }
});

// Get territories
router.get('/territories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, area } = req.query;

    let territories;
    if (agentId) {
      territories = territoryModel.findByAgent(agentId as string);
    } else if (area) {
      territories = territoryModel.findByArea(area as string);
    } else if (req.userRole === 'agent') {
      territories = territoryModel.findByAgent(req.userId!);
    } else {
      territories = territoryModel.findAll();
    }

    res.json({
      success: true,
      data: territories,
    });
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get territories',
    });
  }
});

export default router;


