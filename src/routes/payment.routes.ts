import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { creditBundleModel, transactionModel } from '../models/Credit.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  initializePayment,
  verifyPayment,
  isPaystackConfigured,
  generateReference,
} from '../services/paystack.service.js';
import { sendNotification } from '../services/notification.service.js';

const router = Router();

// Get available credit bundles
router.get('/bundles', async (req: Request, res: Response) => {
  try {
    const bundles = creditBundleModel.findActive();

    // Format bundles with price per credit calculation
    const formattedBundles = bundles.map(bundle => ({
      id: bundle.id,
      credits: bundle.credits,
      bonus: bundle.bonus,
      totalCredits: bundle.credits + bundle.bonus,
      price: bundle.price,
      priceFormatted: `₦${bundle.price.toLocaleString()}`,
      pricePerCredit: Math.round(bundle.price / (bundle.credits + bundle.bonus)),
      popular: bundle.popular || false,
    }));

    res.json({
      success: true,
      data: formattedBundles,
    });
  } catch (error) {
    console.error('Get bundles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit bundles',
    });
  }
});

// Get agent's credit balance
router.get('/balance', authenticate, requireRole('agent'), async (req: AuthRequest, res: Response) => {
  try {
    const agent = userModel.findById(req.userId!) as any;
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: {
        credits: agent.credits || 0,
        walletBalance: agent.walletBalance || 0,
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

// Get agent's transaction history
router.get('/transactions', authenticate, requireRole('agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, limit = 20, page = 1 } = req.query;

    let transactions = transactionModel.findByUser(req.userId!);

    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: transactions.length,
        totalPages: Math.ceil(transactions.length / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
    });
  }
});

// Initialize credit purchase
router.post('/purchase', authenticate, requireRole('agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { bundleId, callback_url } = req.body;

    if (!bundleId) {
      return res.status(400).json({
        success: false,
        error: 'Bundle ID is required',
      });
    }

    // Check if Paystack is configured
    if (!isPaystackConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Payment service not configured. Please contact support.',
      });
    }

    const bundle = creditBundleModel.findById(bundleId);
    if (!bundle || !bundle.active) {
      return res.status(404).json({
        success: false,
        error: 'Credit bundle not found or inactive',
      });
    }

    const agent = userModel.findById(req.userId!);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    // Generate unique reference
    const reference = generateReference('CREDIT');

    // Create pending transaction record
    const now = new Date().toISOString();
    const transaction = {
      id: uuidv4(),
      userId: req.userId!,
      type: 'credit_purchase' as const,
      amount: bundle.price,
      credits: bundle.credits + bundle.bonus,
      description: `Purchase ${bundle.credits} + ${bundle.bonus} bonus credits`,
      timestamp: now,
      status: 'pending' as const,
      metadata: {
        bundleId: bundle.id,
        reference,
        baseCredits: bundle.credits,
        bonusCredits: bundle.bonus,
      },
    };

    transactionModel.create(transaction);

    // Initialize Paystack payment
    const paystackResponse = await initializePayment({
      email: agent.email,
      amount: bundle.price * 100, // Convert to kobo
      reference,
      metadata: {
        transactionId: transaction.id,
        userId: req.userId,
        bundleId: bundle.id,
        credits: bundle.credits + bundle.bonus,
      },
      callback_url,
    });

    if (!paystackResponse.status || !paystackResponse.data) {
      // Mark transaction as failed
      transactionModel.update(transaction.id, { status: 'failed' });

      return res.status(500).json({
        success: false,
        error: paystackResponse.message || 'Failed to initialize payment',
      });
    }

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        reference,
        authorizationUrl: paystackResponse.data.authorization_url,
        accessCode: paystackResponse.data.access_code,
        bundle: {
          credits: bundle.credits,
          bonus: bundle.bonus,
          totalCredits: bundle.credits + bundle.bonus,
          price: bundle.price,
        },
      },
    });
  } catch (error) {
    console.error('Initialize purchase error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment',
    });
  }
});

// Verify payment (callback endpoint)
router.get('/verify/:reference', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.params;

    // Find the pending transaction
    const transaction = transactionModel.findOne(
      tx => tx.metadata?.reference === reference && tx.userId === req.userId
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          credits: transaction.credits,
          status: 'completed',
        },
      });
    }

    // Verify with Paystack
    const paystackResponse = await verifyPayment(reference);

    if (!paystackResponse.status || !paystackResponse.data) {
      return res.status(400).json({
        success: false,
        error: paystackResponse.message || 'Payment verification failed',
      });
    }

    const paymentData = paystackResponse.data;

    if (paymentData.status === 'success') {
      // Credit the agent's account
      const agent = userModel.findById(req.userId!) as any;
      const creditsToAdd = transaction.credits || 0;

      const now = new Date().toISOString();
      userModel.update(req.userId!, {
        credits: (agent.credits || 0) + creditsToAdd,
        updatedAt: now,
      });

      // Update transaction status
      transactionModel.update(transaction.id, {
        status: 'completed',
        metadata: {
          ...transaction.metadata,
          paystackId: paymentData.id,
          paidAt: paymentData.paid_at,
          channel: paymentData.channel,
        },
      });

      // Notify the agent
      sendNotification({
        userId: req.userId!,
        title: 'Credits Purchased! 💰',
        message: `${creditsToAdd} credits have been added to your account.`,
        type: 'success',
        metadata: {
          transactionId: transaction.id,
          credits: creditsToAdd,
        },
      });

      res.json({
        success: true,
        message: 'Payment successful! Credits added to your account.',
        data: {
          credits: creditsToAdd,
          newBalance: (agent.credits || 0) + creditsToAdd,
          status: 'completed',
        },
      });
    } else if (paymentData.status === 'failed') {
      transactionModel.update(transaction.id, { status: 'failed' });

      res.status(400).json({
        success: false,
        error: 'Payment failed',
        data: {
          status: 'failed',
        },
      });
    } else {
      res.json({
        success: false,
        message: 'Payment pending or abandoned',
        data: {
          status: paymentData.status,
        },
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
});

// Paystack webhook (for automatic verification)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;

      // Find the transaction
      const transaction = transactionModel.findOne(
        tx => tx.metadata?.reference === reference
      );

      if (transaction && transaction.status === 'pending') {
        const userId = transaction.userId;
        const creditsToAdd = transaction.credits || 0;

        // Credit the agent's account
        const agent = userModel.findById(userId) as any;
        if (agent) {
          const now = new Date().toISOString();
          userModel.update(userId, {
            credits: (agent.credits || 0) + creditsToAdd,
            updatedAt: now,
          });

          // Update transaction status
          transactionModel.update(transaction.id, {
            status: 'completed',
            metadata: {
              ...transaction.metadata,
              paystackId: data.id,
              paidAt: data.paid_at,
              channel: data.channel,
            },
          });

          // Notify the agent
          sendNotification({
            userId,
            title: 'Credits Purchased! 💰',
            message: `${creditsToAdd} credits have been added to your account.`,
            type: 'success',
            metadata: {
              transactionId: transaction.id,
              credits: creditsToAdd,
            },
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Check payment status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const configured = isPaystackConfigured();

    res.json({
      success: true,
      data: {
        paymentEnabled: configured,
        provider: 'paystack',
        currency: 'NGN',
      },
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
    });
  }
});

export default router;


