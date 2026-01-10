import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config/index.js';
import { userModel, AgentDocument, UserDocument } from '../models/User.js';
import { sessionModel } from '../models/Session.js';
import { otpModel } from '../models/OTP.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { 
  sendOTPEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail,
  generateOTP,
  isEmailServiceConfigured 
} from '../services/email.service.js';

const router = Router();

// ============================================
// PASSPORT GOOGLE OAUTH SETUP
// ============================================

if (config.google.clientId && config.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackUrl,
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Get role from the state parameter (passed in the initial auth request)
      const state = req.query.state as string;
      let role: 'seeker' | 'agent' = 'seeker';
      
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        role = stateData.role || 'seeker';
      } catch (e) {
        // Default to seeker if state parsing fails
      }

      const googleId = profile.id;
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const name = profile.displayName || profile.name?.givenName || 'User';
      const avatar = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('No email found in Google profile'));
      }

      // Check if user exists by Google ID
      let user = await userModel.findByGoogleId(googleId);

      if (!user) {
        // Check if email is already registered with different auth method
        const existingUser = await userModel.findByEmail(email);
        
        if (existingUser) {
          // Link Google to existing account
          user = await userModel.update(existingUser.id, {
            googleId,
            emailVerified: true,
            authProvider: 'google',
          });
        } else {
          // Create new user
          const userData: any = {
            email,
            name,
            phone: '', // Phone will need to be collected later
            role,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            password_hash: '', // No password for OAuth users
            googleId,
            emailVerified: true,
            authProvider: 'google',
          };

          if (role === 'agent') {
            userData.agent_type = 'semi-direct';
            userData.verified = false;
            userData.level = 1;
            userData.xp = 0;
            userData.credits = 10;
            userData.tier = 'street-scout';
          }

          user = await userModel.create(userData);
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userModel.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Helper function to create JWT and session
async function createAuthSession(user: UserDocument | AgentDocument): Promise<{ token: string; expiresAt: string }> {
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

  await sessionModel.create({
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: now,
    lastActivity: now,
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

// ============================================
// REGISTRATION (Step 1: Create unverified user)
// ============================================

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

    // Validate role
    if (!['seeker', 'agent'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "seeker" or "agent"',
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

    // Create user (unverified)
    const userData: any = {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      phone,
      role,
      emailVerified: false,
      authProvider: 'email',
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

    // Generate and send OTP
    const otp = generateOTP();
    await otpModel.createOTP(email, otp, 'email_verification', newUser.id);

    // Send verification email
    if (isEmailServiceConfigured()) {
      await sendOTPEmail(email, otp, name);
    } else {
      console.log(`📧 OTP for ${email}: ${otp} (Email service not configured)`);
    }

    // Remove sensitive data from response
    const { passwordHash: _, password_hash: __, ...userResponse } = newUser as any;

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: userResponse,
        requiresVerification: true,
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

// ============================================
// SEND OTP (for email verification or resend)
// ============================================

router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, type = 'email_verification' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const user = await userModel.findByEmail(email);
    
    if (!user) {
      // For security, don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    // For email verification, check if already verified
    if (type === 'email_verification' && (user as any).emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    await otpModel.createOTP(email, otp, type as any, user.id);

    // Send email
    if (isEmailServiceConfigured()) {
      if (type === 'password_reset') {
        await sendPasswordResetEmail(email, otp, user.name);
      } else {
        await sendOTPEmail(email, otp, user.name);
      }
    } else {
      console.log(`📧 OTP for ${email}: ${otp} (Email service not configured)`);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully. Please check your email.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
    });
  }
});

// ============================================
// VERIFY OTP (complete email verification)
// ============================================

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp, type = 'email_verification' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required',
      });
    }

    // Verify OTP
    const result = await otpModel.verifyOTP(email, otp, type);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    // Get user
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // For email verification, update user and create session
    if (type === 'email_verification') {
      await userModel.update(user.id, { emailVerified: true });
      
      // Send welcome email
      if (isEmailServiceConfigured()) {
        await sendWelcomeEmail(email, user.name, user.role);
      }

      // Create auth session
      const { token, expiresAt } = await createAuthSession(user);

      // Remove sensitive data
      const { passwordHash: _, password_hash: __, ...userResponse } = user as any;
      userResponse.emailVerified = true;

      return res.json({
        success: true,
        message: 'Email verified successfully!',
        data: {
          user: userResponse,
          token,
          expiresAt,
        },
      });
    }

    // For password reset, return success with reset token
    if (type === 'password_reset') {
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        config.jwt.secret,
        { expiresIn: '15m' }
      );

      return res.json({
        success: true,
        message: 'OTP verified. You can now reset your password.',
        data: {
          resetToken,
        },
      });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
    });
  }
});

// ============================================
// LOGIN
// ============================================

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

    // Check if user uses OAuth only
    if ((user as any).authProvider === 'google' && !user.passwordHash && !(user as any).password_hash) {
      return res.status(401).json({
        success: false,
        error: 'This account uses Google sign-in. Please use "Sign in with Google".',
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

    // Check if email is verified
    if (!(user as any).emailVerified) {
      // Send new OTP
      const otp = generateOTP();
      await otpModel.createOTP(email, otp, 'email_verification', user.id);
      
      if (isEmailServiceConfigured()) {
        await sendOTPEmail(email, otp, user.name);
      } else {
        console.log(`📧 OTP for ${email}: ${otp} (Email service not configured)`);
      }

      return res.status(403).json({
        success: false,
        error: 'Please verify your email first. A new verification code has been sent.',
        requiresVerification: true,
        email: user.email,
      });
    }

    // Create session
    const { token, expiresAt } = await createAuthSession(user);

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

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

// Initiate Google OAuth - role passed as query param
router.get('/google', (req: Request, res: Response, next) => {
  const role = req.query.role as string || 'seeker';
  
  // Validate role
  if (!['seeker', 'agent'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Role must be either "seeker" or "agent"',
    });
  }

  if (!config.google.clientId || !config.google.clientSecret) {
    return res.status(501).json({
      success: false,
      error: 'Google OAuth is not configured',
    });
  }

  // Encode role in state parameter
  const state = Buffer.from(JSON.stringify({ role })).toString('base64');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${config.frontendUrl}/auth/error?error=google_auth_failed`,
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as UserDocument | AgentDocument;
      
      if (!user) {
        return res.redirect(`${config.frontendUrl}/auth/error?error=no_user`);
      }

      // Create auth session
      const { token } = await createAuthSession(user);

      // Redirect to frontend with token
      const redirectUrl = new URL(`${config.frontendUrl}/auth/callback`);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('role', user.role);
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${config.frontendUrl}/auth/error?error=callback_failed`);
    }
  }
);

// ============================================
// GET CURRENT USER
// ============================================

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

// ============================================
// LOGOUT
// ============================================

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

// ============================================
// PASSWORD RESET
// ============================================

// Request password reset (sends OTP)
router.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const user = await userModel.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.',
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    await otpModel.createOTP(email, otp, 'password_reset', user.id);

    if (isEmailServiceConfigured()) {
      await sendPasswordResetEmail(email, otp, user.name);
    } else {
      console.log(`📧 Password reset OTP for ${email}: ${otp} (Email service not configured)`);
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
    });
  }
});

// Complete password reset (after OTP verified)
router.post('/password-reset/complete', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required',
      });
    }

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, config.jwt.secret);
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userModel.update(decoded.userId, { password_hash: passwordHash });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Password reset complete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
});

// Legacy password reset endpoints (kept for backwards compatibility)
router.post('/password-reset', async (req: Request, res: Response) => {
  // Redirect to new endpoint
  req.body.email = req.body.email;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  // Forward to new endpoint
  return res.redirect(307, '/api/auth/password-reset/request');
});

router.patch('/password-reset', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Token and new password are required',
    });
  }

  req.body.resetToken = token;
  return res.redirect(307, '/api/auth/password-reset/complete');
});

// ============================================
// CHECK AUTH STATUS
// ============================================

router.get('/status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({
        success: true,
        data: {
          authenticated: false,
        },
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role: string };
      const user = await userModel.findById(decoded.userId);

      if (!user) {
        return res.json({
          success: true,
          data: {
            authenticated: false,
          },
        });
      }

      const { passwordHash: _, password_hash: __, ...userResponse } = user as any;

      return res.json({
        success: true,
        data: {
          authenticated: true,
          user: userResponse,
        },
      });
    } catch {
      return res.json({
        success: true,
        data: {
          authenticated: false,
        },
      });
    }
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check auth status',
    });
  }
});

export default router;
