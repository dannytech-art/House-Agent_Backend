import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { userModel, AgentDocument, UserDocument } from '../models/User.js';
import { sessionModel } from '../models/Session.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role, agentType } = req.body;

    // Validate required fields
    if (!email || !password || !name || !phone || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, name, phone, role',
      });
    }

    // Check if email already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    // Create user in database
    const userData: any = {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      phone,
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    };

    if (role === 'agent') {
      userData.agent_type = agentType || 'semi-direct';
      userData.verified = false;
      userData.level = 1;
      userData.xp = 0;
      userData.credits = 10;
      userData.tier = 'street-scout';
    }

    const newUser = await userModel.create(userData);

    // Create JWT token
    const secret = config.jwt.secret as string;
    const options: SignOptions = { expiresIn: config.jwt.expiresIn as unknown as SignOptions['expiresIn'] };

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      secret,
      options
    );

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await sessionModel.create({
      userId: newUser.id,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      lastActivity: now,
    });

    // Remove password hash from response
    const { passwordHash: _, password_hash: __, ...userResponse } = newUser as any;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
    });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    if (user.active === false) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash || (user as any).password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Create JWT token
    const secret = config.jwt.secret as string;
    const options: SignOptions = { expiresIn: config.jwt.expiresIn as unknown as SignOptions['expiresIn'] };

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      options
    );

    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create session
    await sessionModel.create({
      userId: user.id,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      lastActivity: now,
    });

    // Remove password hash from response
    const { passwordHash: _, password_hash: __, ...userResponse } = user as any;

    res.json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userModel.findById(req.userId!);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { passwordHash: _, password_hash: __, ...userResponse } = user as any;

    res.json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      const session = await sessionModel.findByToken(token);
      if (session) {
        await sessionModel.delete(session.id);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    });
  }
});

// Request password reset
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset',
    });
  }
});

// Reset password with token
router.patch('/password-reset', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required',
      });
    }

    // In a real app, verify the reset token
    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
});

export default router;
