import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { creditBundleModel, transactionModel } from '../models/Credit.js';
import { userModel } from '../models/User.js';
import paystackService from '../services/paystack.service.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get available credit bundles
router.get('/bundles', async (req, res: Response) => {
  try {
    const bundles = creditBundleModel.findActive();

    res.json({
      success: true,
      data: bundles,
    });
  } catch (error) {
    console.error('Get bundles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit bundles',
    });
  }
});

// Get user's credit balance
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = userModel.findById(req.userId!) as any;
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        credits: user.credits || 0,
        walletBalance: user.walletBalance || 0,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance',
    });
  }
});

// Purchase credits
router.post('/purchase', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bundleId, paymentReference } = req.body;

    if (!bundleId) {
      return res.status(400).json({
        success: false,
        error: 'Bundle ID is required',
      });
    }

    const bundle = creditBundleModel.findById(bundleId);
    if (!bundle || !bundle.active) {
      return res.status(404).json({
        success: false,
        error: 'Credit bundle not found or inactive',
      });
    }

    const user = userModel.findById(req.userId!) as any;
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date().toISOString();
    const totalCredits = bundle.credits + bundle.bonus;

    // Create transaction
    const transaction = {
      id: uuidv4(),
      userId: req.userId!,
      type: 'credit_purchase' as const,
      amount: bundle.price,
      credits: totalCredits,
      description: `Purchased ${bundle.credits} credits + ${bundle.bonus} bonus`,
      timestamp: now,
      status: 'completed' as const,
      metadata: {
        bundleId,
        paymentReference,
      },
    };

    transactionModel.create(transaction);

    // Update user credits
    userModel.update(req.userId!, {
      credits: (user.credits || 0) + totalCredits,
      updatedAt: now,
    });

    res.json({
      success: true,
      data: {
        transaction,
        newBalance: (user.credits || 0) + totalCredits,
      },
    });
  } catch (error) {
    console.error('Purchase credits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase credits',
    });
  }
});

// Get transaction history
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = transactionModel.findByUser(req.userId!);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
    });
  }
});

// Load wallet (admin simulation for now)
router.post('/wallet/load', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required',
      });
    }

    const user = userModel.findById(req.userId!) as any;
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date().toISOString();

    // Create transaction
    const transaction = {
      id: uuidv4(),
      userId: req.userId!,
      type: 'wallet_load' as const,
      amount: Number(amount),
      description: `Loaded ₦${amount} to wallet`,
      timestamp: now,
      status: 'completed' as const,
    };

    transactionModel.create(transaction);

    // Update wallet balance
    userModel.update(req.userId!, {
      walletBalance: (user.walletBalance || 0) + Number(amount),
      updatedAt: now,
    });

    res.json({
      success: true,
      data: {
        transaction,
        newBalance: (user.walletBalance || 0) + Number(amount),
      },
    });
  } catch (error) {
    console.error('Load wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load wallet',
    });
  }
});

// Create or update credit bundle (admin only)
router.post('/bundles', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { credits, price, bonus, popular } = req.body;

    if (!credits || !price) {
      return res.status(400).json({
        success: false,
        error: 'Credits and price are required',
      });
    }

    const now = new Date().toISOString();
    const newBundle = {
      id: uuidv4(),
      credits: Number(credits),
      price: Number(price),
      bonus: Number(bonus) || 0,
      popular: popular || false,
      active: true,
      createdAt: now,
    };

    creditBundleModel.create(newBundle);

    res.status(201).json({
      success: true,
      data: newBundle,
    });
  } catch (error) {
    console.error('Create bundle error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bundle',
    });
  }
});

// Verify payment with Paystack and apply credits (frontend-friendly endpoint)
router.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Payment reference is required' });
    }

    // Call Paystack verify
    const paystackResp = await paystackService.verifyPayment(reference);

    if (!paystackResp || !paystackResp.status || paystackResp.data?.status !== 'success') {
      return res.json({
        success: false,
        status: paystackResp?.data?.status || 'failed',
        message: paystackResp?.message || paystackResp?.data?.gateway_response || 'Payment not successful',
      });
    }

    // Find local transaction by metadata.reference or id
    const transaction = transactionModel.findOne(tx => {
      return (tx.metadata && tx.metadata.reference === reference) || tx.id === reference || (tx as any).reference === reference;
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found in database' });
    }

    // If pending, apply credits and mark completed
    if (transaction.status === 'pending') {
      const now = new Date().toISOString();
      const creditsToAdd = Number(transaction.credits || 0);

      // Update transaction
      transactionModel.update(transaction.id, {
        status: 'completed',
        metadata: { ...(transaction.metadata || {}), paystackId: paystackResp.data?.id, paidAt: paystackResp.data?.paid_at, applied: true },
      });

      // Update user credits
      const user = userModel.findById(transaction.userId) as any;
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const previous = Number(user.credits || 0);
      const newBalance = previous + creditsToAdd;

      userModel.update(transaction.userId, { credits: newBalance, updatedAt: now });

      return res.json({
        success: true,
        status: 'completed',
        credits: creditsToAdd,
        newBalance,
        message: 'Payment verified successfully',
      });
    }

    // If already processed, return current state
    const user = userModel.findById(transaction.userId) as any;
    return res.json({
      success: true,
      status: transaction.status,
      credits: transaction.credits,
      newBalance: user?.credits || 0,
      message: 'Transaction already processed',
    });
  } catch (error: any) {
    console.error('Verify-payment error:', error);

    if (error.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Transaction not found on Paystack' });
    }

    return res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

export default router;


