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
  debugConfig,
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

// Initialize credit purchase (supports both redirect and inline/popup)
router.post('/purchase', authenticate, requireRole('agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { bundleId, callback_url, useInline } = req.body;

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
    console.log(`🔔 Created transaction: id=${transaction.id} userId=${transaction.userId} reference=${reference} amount=${transaction.amount}`);

    // For inline/popup mode, return data for frontend to use with Paystack JS
    if (useInline) {
      const publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
      
      return res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          reference,
          publicKey,
          email: agent.email,
          amount: bundle.price * 100, // In kobo
          currency: 'NGN',
          bundle: {
            credits: bundle.credits,
            bonus: bundle.bonus,
            totalCredits: bundle.credits + bundle.bonus,
            price: bundle.price,
          },
          metadata: {
            transactionId: transaction.id,
            userId: req.userId,
            bundleId: bundle.id,
            credits: bundle.credits + bundle.bonus,
          },
        },
      });
    }

    // For redirect mode, initialize with Paystack
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

// Verify payment by reference (PUBLIC - for inline/popup mode)
// Called after Paystack popup closes successfully
router.post('/verify-inline', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    console.log(`🔍 verify-inline called for reference: ${reference}`);

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required',
      });
    }

      // Try to find the pending transaction by several identifiers
      let transaction = transactionModel.findOne(tx => {
        const meta = tx.metadata || {};
        return (
        meta.reference === reference ||
        meta.transactionId === reference ||
        tx.id === reference
        );
      });

      // If not found locally, try to verify with Paystack and look up by metadata returned
      let paystackResponse: any = null;
      if (!transaction) {
        console.log(`🔎 verify-inline: local transaction not found for reference=${reference}, calling Paystack verify`);
        paystackResponse = await verifyPayment(reference);
        if (paystackResponse && paystackResponse.status && paystackResponse.data) {
        const pd = paystackResponse.data;
        transaction = transactionModel.findOne(tx => {
          const meta = tx.metadata || {};
          return (
          meta.transactionId === pd.metadata?.transactionId ||
          meta.reference === pd.reference ||
          tx.id === pd.metadata?.transactionId
          );
        });
        console.log('🔎 verify-inline: lookup after Paystack verify result, transaction found=', !!transaction);
        }
      }

    if (!transaction) {
      console.warn(`⚠️ verify-inline: Transaction not found for reference=${reference}`);
      const pending = transactionModel.findPending();
      console.warn(`   Pending transactions count: ${pending.length}`);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // If already completed, return success with current balance
    if (transaction.status === 'completed') {
      const agent = userModel.findById(transaction.userId) as any;
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          credits: transaction.credits,
          newBalance: agent?.credits || 0,
          status: 'completed',
        },
      });
    }

      // If we haven't already called Paystack above, do so to get payment details
      if (!paystackResponse) {
        paystackResponse = await verifyPayment(reference);
      }

      if (!paystackResponse || !paystackResponse.status || !paystackResponse.data) {
        console.error('⛔ Paystack verify failed for reference', reference, paystackResponse?.message);
        return res.status(400).json({
        success: false,
        error: paystackResponse?.message || 'Payment verification failed',
        });
      }

      const paymentData = paystackResponse.data;

    console.log('✅ Paystack verify returned (callback - first):', {
      reference: paymentData.reference,
      status: paymentData.status,
      id: paymentData.id,
    });
    console.log('✅ Paystack verify returned (verify-inline):', {
      reference: paymentData.reference,
      status: paymentData.status,
      id: paymentData.id,
    });

    if (paymentData.status === 'success') {
      // Credit the agent's account
      const agent = userModel.findById(transaction.userId) as any;
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

        const creditsToAdd = Number(transaction.credits || 0);
      const previousBalance = Number(agent.credits || 0);
      const newBalance = previousBalance + creditsToAdd;
      const now = new Date().toISOString();

      // Update user credits
      userModel.update(transaction.userId, {
        credits: newBalance,
        updatedAt: now,
      });

      console.log(`💰 verify-inline: credited user ${transaction.userId} +${creditsToAdd} (before=${previousBalance} after=${newBalance})`);

      // Update transaction status and mark applied so reconcile won't double-apply
      transactionModel.update(transaction.id, {
        status: 'completed',
        metadata: {
          ...transaction.metadata,
          paystackId: paymentData.id,
          paidAt: paymentData.paid_at || now,
          channel: paymentData.channel,
          applied: true,
        },
      });

      // Notify the agent
      sendNotification({
        userId: transaction.userId,
        title: 'Credits Purchased! 💰',
        message: `${creditsToAdd} credits have been added to your account. New balance: ${newBalance} credits.`,
        type: 'success',
        metadata: {
          transactionId: transaction.id,
          credits: creditsToAdd,
          newBalance,
        },
      });

      return res.json({
        success: true,
        message: 'Payment successful! Credits added to your account.',
        data: {
          creditsAdded: creditsToAdd,
          previousBalance,
          newBalance,
          status: 'completed',
        },
      });
    } else if (paymentData.status === 'failed') {
      transactionModel.update(transaction.id, { status: 'failed' });

      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        data: {
          status: 'failed',
        },
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment pending or abandoned',
        data: {
          status: paymentData.status,
        },
      });
    }
  } catch (error) {
    console.error('Verify inline payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
});

// Callback endpoint - Paystack redirects here after payment (for redirect mode)
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { reference, trxref } = req.query;
    const paymentReference = (reference || trxref) as string;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required',
      });
    }

    // Verify with Paystack first to get canonical reference/metadata
    const paystackResponse = await verifyPayment(paymentReference);

    if (!paystackResponse.status || !paystackResponse.data) {
      return res.status(400).json({
        success: false,
        error: paystackResponse.message || 'Payment verification failed',
      });
    }

    const paymentData = paystackResponse.data;

    // Find the pending transaction by any matching identifier returned by Paystack
    const transaction = transactionModel.findOne(tx => {
      const meta = tx.metadata || {};
      const paystackMeta = paymentData.metadata || {};
      return (
        meta.reference === paymentData.reference ||
        meta.transactionId === paystackMeta.transactionId ||
        tx.id === paystackMeta.transactionId
      );
    });

    if (!transaction) {
      console.warn(`⚠️ callback: Transaction not found for paystack reference=${paymentData.reference}`);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // If already completed, return success
    if (transaction.status === 'completed') {
      const agent = userModel.findById(transaction.userId) as any;
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          credits: transaction.credits,
          newBalance: agent?.credits || 0,
          status: 'completed',
        },
      });
    }

    // (Paystack already verified above; continue with `paymentData`)

    if (paymentData.status === 'success') {
      // Credit the agent's account
      const agent = userModel.findById(transaction.userId) as any;
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const creditsToAdd = transaction.credits || 0;
      const previousBalance = agent.credits || 0;
      const newBalance = previousBalance + creditsToAdd;
      const now = new Date().toISOString();

      userModel.update(transaction.userId, {
        credits: newBalance,
        updatedAt: now,
      });

      console.log(`💰 Credits updated for user ${transaction.userId}: ${previousBalance} -> ${newBalance}`);

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
        userId: transaction.userId,
        title: 'Credits Purchased! 💰',
        message: `${creditsToAdd} credits have been added to your account.`,
        type: 'success',
        metadata: {
          transactionId: transaction.id,
          credits: creditsToAdd,
        },
      });

      return res.json({
        success: true,
        message: 'Payment successful! Credits added to your account.',
        data: {
          creditsAdded: creditsToAdd,
          previousBalance,
          newBalance,
          status: 'completed',
        },
      });
    } else if (paymentData.status === 'failed') {
      transactionModel.update(transaction.id, { status: 'failed' });

      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        data: {
          status: 'failed',
        },
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment pending or abandoned',
        data: {
          status: paymentData.status,
        },
      });
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
});

// Verify payment (authenticated - for manual verification)
router.get('/verify/:reference', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.params;

    // Try to find transaction locally first by several identifiers
    let transaction = transactionModel.findOne(tx => {
      const meta = tx.metadata || {};
      return (
        (meta.reference === reference || meta.transactionId === reference || tx.id === reference) &&
        tx.userId === req.userId
      );
    });

    let paystackResponse: any = null;
    let paymentData: any = null;

    if (!transaction) {
      console.log(`🔎 verify/:reference: local transaction not found for reference=${reference}, calling Paystack verify`);
      paystackResponse = await verifyPayment(reference);
      if (!paystackResponse || !paystackResponse.status || !paystackResponse.data) {
        console.error('⛔ Paystack verify failed for reference', reference, paystackResponse?.message);
        return res.status(400).json({
          success: false,
          error: paystackResponse?.message || 'Payment verification failed',
        });
      }

      paymentData = paystackResponse.data;
      console.log('✅ Paystack verify returned (verify route):', {
        reference: paymentData.reference,
        status: paymentData.status,
        id: paymentData.id,
      });

      transaction = transactionModel.findOne(tx => {
        const meta = tx.metadata || {};
        return (
          (meta.transactionId === paymentData.metadata?.transactionId || meta.reference === paymentData.reference || tx.id === paymentData.metadata?.transactionId) &&
          tx.userId === req.userId
        );
      });

      if (!transaction) {
        console.warn(`⚠️ verify/:reference: Transaction not found after Paystack verify for reference=${reference} userId=${req.userId}`);
        const pending = transactionModel.findPending();
        console.warn(`   Pending transactions count: ${pending.length}`);
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
      }
    } else {
      // If transaction found locally, still call Paystack to get payment status
      paystackResponse = await verifyPayment(reference);
      if (!paystackResponse || !paystackResponse.status || !paystackResponse.data) {
        console.error('⛔ Paystack verify failed for reference', reference, paystackResponse?.message);
        return res.status(400).json({
          success: false,
          error: paystackResponse?.message || 'Payment verification failed',
        });
      }
      paymentData = paystackResponse.data;
      console.log('✅ Paystack verify returned (verify route):', {
        reference: paymentData.reference,
        status: paymentData.status,
        id: paymentData.id,
      });
    }

    if (transaction.status === 'completed') {
      const agent = userModel.findById(req.userId!) as any;
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          credits: transaction.credits,
          newBalance: agent?.credits || 0,
          status: 'completed',
        },
      });
    }

    // (Paystack already verified above; use `paymentData` from earlier verify)

    if (paymentData.status === 'success') {
      // Credit the agent's account
      const agent = userModel.findById(req.userId!) as any;
      const creditsToAdd = Number(transaction.credits || 0);
      const previousBalance = Number(agent.credits || 0);
      const newBalance = previousBalance + creditsToAdd;

      const now = new Date().toISOString();
      userModel.update(req.userId!, {
        credits: newBalance,
        updatedAt: now,
      });

      console.log(`💰 verify/:reference: credited user ${req.userId!} +${creditsToAdd} (before=${previousBalance} after=${newBalance})`);

      // Update transaction status and mark applied
      transactionModel.update(transaction.id, {
        status: 'completed',
        metadata: {
          ...transaction.metadata,
          paystackId: paymentData.id,
          paidAt: paymentData.paid_at || now,
          channel: paymentData.channel,
          applied: true,
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
          newBalance: newBalance,
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
    console.log('🔔 [WEBHOOK] Received webhook request');
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    
    // Verify webhook signature using raw body when available
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';

    // Determine raw body string. When express.raw middleware is used, req.body will be a Buffer.
    const rawBodyString = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

    console.log('   Raw body:', rawBodyString.substring(0, 200) + '...');

    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(rawBodyString)
      .digest('hex');

    const signatureHeader = (req.headers['x-paystack-signature'] || '') as string;

    console.log('   Computed hash:', hash.substring(0, 20) + '...');
    console.log('   Header signature:', signatureHeader.substring(0, 20) + '...');

    if (!signatureHeader || hash !== signatureHeader) {
      console.warn('⚠️ [WEBHOOK] Signature verification FAILED');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    console.log('✅ [WEBHOOK] Signature verified');

    const event = Buffer.isBuffer(req.body) ? JSON.parse(rawBodyString) : req.body;

    console.log('   Event type:', event.event);
    console.log('   Event data:', JSON.stringify(event.data, null, 2));

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;

      console.log(`🔔 Webhook charge.success received: reference=${reference} id=${data.id}`);

      // Find the transaction by multiple possible keys:
      // - our internal metadata.transactionId (recommended)
      // - metadata.reference (if we used same reference)
      // - transaction id matching data.metadata.transactionId
      const metaRef = data.metadata && (data.metadata.transactionId || data.metadata.reference);

      const transaction = transactionModel.findOne(tx => {
        const meta = tx.metadata || {};
        return (
          // Paystack returns the reference it used
          meta.reference === reference ||
          // Our internal transaction id stored in metadata
          meta.transactionId === reference ||
          // Match by transactionId sent in metadata (recommended)
          (data.metadata && (meta.transactionId === data.metadata.transactionId || tx.id === data.metadata.transactionId)) ||
          // In case Paystack returned the original reference in metadata
          meta.reference === data.metadata?.reference
        );
      });

      if (!transaction) {
        console.warn(`⚠️ Webhook: no matching transaction found for reference=${reference} metadataTransactionId=${metaRef} fullMetadata=${JSON.stringify(data.metadata)}`);
      } else if (transaction.status !== 'pending') {
        console.log(`ℹ️ Webhook: transaction found but status=${transaction.status} id=${transaction.id}`);
      } else {
        const userId = transaction.userId;
        const creditsToAdd = transaction.credits || 0;

        // Credit the agent's account
        const agent = userModel.findById(userId) as any;
        if (agent) {
          const previous = Number(agent.credits || 0);
          const now = new Date().toISOString();
          userModel.update(userId, {
            credits: previous + creditsToAdd,
            updatedAt: now,
          });

          console.log(`💰 Webhook: credited user ${userId} +${creditsToAdd} (before=${previous} after=${previous + creditsToAdd})`);

          // Update transaction status and mark applied
          transactionModel.update(transaction.id, {
            status: 'completed',
            metadata: {
              ...transaction.metadata,
              paystackId: data.id,
              paidAt: data.paid_at,
              channel: data.channel,
              applied: true,
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
        } else {
          console.warn(`⚠️ Webhook: user not found for id=${userId}`);
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
router.get('/status', async (req: Request, res: Response) => {
  try {
    const configured = isPaystackConfigured();
    
    // Log debug info
    debugConfig();

    res.json({
      success: true,
      data: {
        paymentEnabled: configured,
        provider: 'paystack',
        currency: 'NGN',
        message: configured 
          ? 'Payment service is ready' 
          : 'PAYSTACK_SECRET_KEY not found in .env file',
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

// Debug endpoint (remove in production)
router.get('/debug', async (req: Request, res: Response) => {
  debugConfig();
  
  res.json({
    success: true,
    data: {
      envLoaded: !!process.env.PAYSTACK_SECRET_KEY,
      keyPrefix: process.env.PAYSTACK_SECRET_KEY?.substring(0, 10) || 'NOT_SET',
      publicKeyPrefix: process.env.PAYSTACK_PUBLIC_KEY?.substring(0, 10) || 'NOT_SET',
    },
  });
});

// Reconcile endpoint - applies completed transactions that haven't been applied to user balances yet
// Only enabled in development environment
router.post('/reconcile', async (req: Request, res: Response) => {
  try {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'development') {
      return res.status(403).json({ success: false, error: 'Reconcile allowed only in development' });
    }

    const completed = transactionModel.findMany(tx => tx.status === 'completed');
    let applied = 0;
    const details: any[] = [];

    for (const tx of completed) {
      const already = tx.metadata?.applied;
      if (already) continue;

      const user = userModel.findById(tx.userId) as any;
      if (!user) {
        details.push({ id: tx.id, applied: false, reason: 'user_not_found' });
        continue;
      }

      const prev = Number(user.credits || 0);
      userModel.update(tx.userId, { credits: prev + (tx.credits || 0), updatedAt: new Date().toISOString() });
      transactionModel.update(tx.id, { metadata: { ...tx.metadata, applied: true } });
      applied++;
      details.push({ id: tx.id, applied: true, before: prev, after: prev + (tx.credits || 0) });
    }

    res.json({ success: true, applied, details });
  } catch (error) {
    console.error('Reconcile error:', error);
    res.status(500).json({ success: false, error: 'Failed to reconcile' });
  }
});

// Test webhook endpoint - manually trigger webhook for debugging
// Only enabled in development environment
router.post('/test-webhook', async (req: Request, res: Response) => {
  try {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'development') {
      return res.status(403).json({ success: false, error: 'Test webhook allowed only in development' });
    }

    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, error: 'reference is required' });
    }

    console.log(`\n🧪 [TEST-WEBHOOK] Starting test webhook for reference=${reference}\n`);

    // Find transaction by reference
    let transaction = transactionModel.findOne(tx => {
      const meta = tx.metadata || {};
      return meta.reference === reference;
    });

    if (!transaction) {
      console.warn(`⚠️ [TEST-WEBHOOK] Transaction not found for reference=${reference}`);
      return res.status(404).json({ success: false, error: 'Transaction not found', reference });
    }

    console.log(`✅ [TEST-WEBHOOK] Found transaction id=${transaction.id} userId=${transaction.userId} status=${transaction.status}`);

    if (transaction.status !== 'pending') {
      console.log(`ℹ️ [TEST-WEBHOOK] Transaction already ${transaction.status}, skipping`);
      return res.json({ success: true, message: `Transaction already ${transaction.status}` });
    }

    const userId = transaction.userId;
    const creditsToAdd = Number(transaction.credits || 0);

    const agent = userModel.findById(userId) as any;
    if (!agent) {
      console.warn(`⚠️ [TEST-WEBHOOK] User not found for id=${userId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const previous = Number(agent.credits || 0);
    const newBalance = previous + creditsToAdd;
    const now = new Date().toISOString();

    console.log(`💰 [TEST-WEBHOOK] Crediting user ${userId}: ${previous} + ${creditsToAdd} = ${newBalance}`);

    // Update user credits
    userModel.update(userId, {
      credits: newBalance,
      updatedAt: now,
    });

    console.log(`✅ [TEST-WEBHOOK] User credits updated in database`);

    // Update transaction status and mark applied
    transactionModel.update(transaction.id, {
      status: 'completed',
      metadata: {
        ...transaction.metadata,
        paystackId: Math.floor(Math.random() * 10000000),
        paidAt: now,
        channel: 'card',
        applied: true,
      },
    });

    console.log(`✅ [TEST-WEBHOOK] Transaction status updated to completed\n`);

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

    return res.json({
      success: true,
      message: 'Test webhook processed successfully',
      data: {
        userId,
        creditsAdded: creditsToAdd,
        previousBalance: previous,
        newBalance,
      },
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to process test webhook' });
  }
});

export default router;



