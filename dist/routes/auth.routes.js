import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // ✅ added SignOptions
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { userModel } from '../models/User.js';
import { sessionModel } from '../models/Session.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
// Register new user
router.post('/register', async (req, res) => {
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
        const existingUser = userModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered',
            });
        }
        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);
        const now = new Date().toISOString();
        let newUser;
        if (role === 'agent') {
            newUser = {
                id: uuidv4(),
                email,
                name,
                phone,
                role: 'agent',
                passwordHash,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                agentType: agentType || 'semi-direct',
                verified: false,
                kycStatus: 'unverified',
                level: 1,
                xp: 0,
                credits: 10,
                walletBalance: 0,
                streak: 0,
                totalListings: 0,
                totalInterests: 0,
                responseTime: 0,
                rating: 0,
                joinedDate: now,
                tier: 'street-scout',
                badges: [],
                createdAt: now,
                updatedAt: now,
                active: true,
            };
        }
        else {
            newUser = {
                id: uuidv4(),
                email,
                name,
                phone,
                role,
                passwordHash,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                createdAt: now,
                updatedAt: now,
                active: true,
            };
        }
        userModel.create(newUser);
        // ✅ Create JWT token properly for TypeScript
        const secret = config.jwt.secret;
        const options = { expiresIn: config.jwt.expiresIn };
        const token = jwt.sign({ userId: newUser.id, role: newUser.role }, secret, options);
        // Create session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        sessionModel.create({
            id: uuidv4(),
            userId: newUser.id,
            token,
            expiresAt: expiresAt.toISOString(),
            createdAt: now,
            lastActivity: now,
        });
        // Remove password hash from response
        const { passwordHash: _, ...userResponse } = newUser;
        res.status(201).json({
            success: true,
            data: {
                user: userResponse,
                token,
            },
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register user',
        });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }
        const user = userModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
        }
        if (!user.active) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated',
            });
        }
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
        }
        // ✅ Create JWT token properly
        const secret = config.jwt.secret;
        const options = { expiresIn: config.jwt.expiresIn };
        const token = jwt.sign({ userId: user.id, role: user.role }, secret, options);
        const now = new Date().toISOString();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        // Create session
        sessionModel.create({
            id: uuidv4(),
            userId: user.id,
            token,
            expiresAt: expiresAt.toISOString(),
            createdAt: now,
            lastActivity: now,
        });
        // Remove password hash from response
        const { passwordHash: _, ...userResponse } = user;
        res.json({
            success: true,
            data: {
                user: userResponse,
                token,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login',
        });
    }
});
// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = userModel.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const { passwordHash: _, ...userResponse } = user;
        res.json({
            success: true,
            data: userResponse,
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user',
        });
    }
});
// Logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (token) {
            const session = sessionModel.findByToken(token);
            if (session) {
                sessionModel.delete(session.id);
            }
        }
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout',
        });
    }
});
// Request password reset
router.post('/password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent',
        });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process password reset',
        });
    }
});
// Reset password with token
router.patch('/password-reset', async (req, res) => {
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
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password',
        });
    }
});
export default router;
//# sourceMappingURL=auth.routes.js.map