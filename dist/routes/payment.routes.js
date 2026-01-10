import { Router } from 'express';
import crypto from 'crypto';
import { creditBundleModel, transactionModel } from '../models/Credit.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { initializePayment, verifyPayment, isPaystackConfigured, generateReference, debugConfig, } from '../services/paystack.service.js';
import { sendNotification } from '../services/notification.service.js';
const router = Router();
// Get available credit bundles
router.get('/bundles', async (req, res) => {
    try {
        const bundles = await creditBundleModel.findActive();
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
    }
    catch (error) {
        console.error('Get bundles error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get credit bundles',
        });
    }
});
// Get agent's credit balance
router.get('/balance', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const agent = await userModel.findById(req.userId);
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
    }
    catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get balance',
        });
    }
});
// Get agent's transaction history
router.get('/transactions', authenticate, requireRole('agent'), async (req, res) => {
    try {
        const { type, limit = 20, page = 1 } = req.query;
        let transactions = await transactionModel.findByUser(req.userId);
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
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transactions',
        });
    }
});
// Initialize credit purchase (supports both redirect and inline/popup)
router.post('/purchase', authenticate, requireRole('agent'), async (req, res) => {
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
        const bundle = await creditBundleModel.findById(bundleId);
        if (!bundle || !bundle.active) {
            return res.status(404).json({
                success: false,
                error: 'Credit bundle not found or inactive',
            });
        }
        const agent = await userModel.findById(req.userId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
            });
        }
        // Generate unique reference
        const reference = generateReference('CREDIT');
        // Create pending transaction record
        const transaction = await transactionModel.create({
            userId: req.userId,
            type: 'credit_purchase',
            amount: bundle.price,
            credits: bundle.credits + bundle.bonus,
            description: `Purchase ${bundle.credits} + ${bundle.bonus} bonus credits`,
            status: 'pending',
            metadata: {
                bundleId: bundle.id,
                reference,
                baseCredits: bundle.credits,
                bonusCredits: bundle.bonus,
            },
        });
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
            await transactionModel.update(transaction.id, { status: 'failed' });
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
    }
    catch (error) {
        console.error('Initialize purchase error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize payment',
        });
    }
});
// Verify payment by reference (PUBLIC - for inline/popup mode)
router.post('/verify-inline', async (req, res) => {
    try {
        const { reference } = req.body;
        console.log(`🔍 verify-inline called for reference: ${reference}`);
        if (!reference) {
            return res.status(400).json({
                success: false,
                error: 'Payment reference is required',
            });
        }
        // Try to find the pending transaction
        let transaction = await transactionModel.findOne(tx => {
            const meta = tx.metadata || {};
            return (meta.reference === reference ||
                meta.transactionId === reference ||
                meta.paystackReference === reference ||
                tx.id === reference);
        });
        // If not found locally, try to verify with Paystack
        let paystackResponse = null;
        if (!transaction) {
            console.log(`🔎 verify-inline: local transaction not found for reference=${reference}, calling Paystack verify`);
            paystackResponse = await verifyPayment(reference);
            if (paystackResponse && paystackResponse.status && paystackResponse.data) {
                const pd = paystackResponse.data;
                transaction = await transactionModel.findOne(tx => {
                    const meta = tx.metadata || {};
                    return (meta.transactionId === pd.metadata?.transactionId ||
                        meta.reference === pd.reference ||
                        tx.id === pd.metadata?.transactionId);
                });
                console.log('🔎 verify-inline: lookup after Paystack verify result, transaction found=', !!transaction);
            }
        }
        if (!transaction) {
            console.warn(`⚠️ verify-inline: Transaction not found for reference=${reference}`);
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }
        // If already completed, return success with current balance
        if (transaction.status === 'completed') {
            const agent = await userModel.findById(transaction.userId);
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
        // If we haven't already called Paystack above, do so
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
        console.log('✅ Paystack verify returned (verify-inline):', {
            reference: paymentData.reference,
            status: paymentData.status,
            id: paymentData.id,
        });
        if (paymentData.status === 'success') {
            // Credit the agent's account
            const agent = await userModel.findById(transaction.userId);
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            const creditsToAdd = Number(transaction.credits || 0);
            const previousBalance = Number(agent.credits || 0);
            const newBalance = previousBalance + creditsToAdd;
            // Update user credits
            await userModel.update(transaction.userId, {
                credits: newBalance,
            });
            console.log(`💰 verify-inline: credited user ${transaction.userId} +${creditsToAdd} (before=${previousBalance} after=${newBalance})`);
            // Update transaction status
            await transactionModel.update(transaction.id, {
                status: 'completed',
                metadata: {
                    ...transaction.metadata,
                    paystackId: paymentData.id,
                    paystackReference: paymentData.reference,
                    paidAt: paymentData.paid_at,
                    channel: paymentData.channel,
                    applied: true,
                },
            });
            // Notify the agent
            await sendNotification({
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
        }
        else if (paymentData.status === 'failed') {
            await transactionModel.update(transaction.id, { status: 'failed' });
            return res.status(400).json({
                success: false,
                error: 'Payment failed',
                data: {
                    status: 'failed',
                },
            });
        }
        else {
            return res.json({
                success: false,
                message: 'Payment pending or abandoned',
                data: {
                    status: paymentData.status,
                },
            });
        }
    }
    catch (error) {
        console.error('Verify inline payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment',
        });
    }
});
// Callback endpoint - Paystack redirects here after payment
router.get('/callback', async (req, res) => {
    try {
        const { reference, trxref } = req.query;
        const paymentReference = (reference || trxref);
        if (!paymentReference) {
            return res.status(400).json({
                success: false,
                error: 'Payment reference is required',
            });
        }
        // Verify with Paystack first
        const paystackResponse = await verifyPayment(paymentReference);
        if (!paystackResponse.status || !paystackResponse.data) {
            return res.status(400).json({
                success: false,
                error: paystackResponse.message || 'Payment verification failed',
            });
        }
        const paymentData = paystackResponse.data;
        // Find the pending transaction
        const transaction = await transactionModel.findOne(tx => {
            const meta = tx.metadata || {};
            const paystackMeta = paymentData.metadata || {};
            return (meta.reference === paymentData.reference ||
                meta.transactionId === paystackMeta.transactionId ||
                tx.id === paystackMeta.transactionId);
        });
        if (!transaction) {
            console.warn(`⚠️ callback: Transaction not found for reference=${paymentData.reference}`);
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }
        // If already completed, return success
        if (transaction.status === 'completed') {
            const agent = await userModel.findById(transaction.userId);
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
        if (paymentData.status === 'success') {
            const agent = await userModel.findById(transaction.userId);
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            const creditsToAdd = transaction.credits || 0;
            const previousBalance = agent.credits || 0;
            const newBalance = previousBalance + creditsToAdd;
            await userModel.update(transaction.userId, {
                credits: newBalance,
            });
            console.log(`💰 Credits updated for user ${transaction.userId}: ${previousBalance} -> ${newBalance}`);
            await transactionModel.update(transaction.id, {
                status: 'completed',
                metadata: {
                    ...transaction.metadata,
                    paystackId: paymentData.id,
                    paystackReference: paymentData.reference,
                    paidAt: paymentData.paid_at,
                    channel: paymentData.channel,
                },
            });
            await sendNotification({
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
        }
        else if (paymentData.status === 'failed') {
            await transactionModel.update(transaction.id, { status: 'failed' });
            return res.status(400).json({
                success: false,
                error: 'Payment failed',
                data: {
                    status: 'failed',
                },
            });
        }
        else {
            return res.json({
                success: false,
                message: 'Payment pending or abandoned',
                data: {
                    status: paymentData.status,
                },
            });
        }
    }
    catch (error) {
        console.error('Payment callback error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment',
        });
    }
});
// Verify payment (authenticated)
router.get('/verify/:reference', authenticate, async (req, res) => {
    try {
        const { reference } = req.params;
        // Try to find transaction locally first
        let transaction = await transactionModel.findOne(tx => {
            const meta = tx.metadata || {};
            return ((meta.reference === reference || meta.transactionId === reference || tx.id === reference) &&
                tx.userId === req.userId);
        });
        let paystackResponse = null;
        let paymentData = null;
        if (!transaction) {
            console.log(`🔎 verify/:reference: local transaction not found for reference=${reference}, calling Paystack verify`);
            paystackResponse = await verifyPayment(reference);
            if (!paystackResponse || !paystackResponse.status || !paystackResponse.data) {
                return res.status(400).json({
                    success: false,
                    error: paystackResponse?.message || 'Payment verification failed',
                });
            }
            paymentData = paystackResponse.data;
            transaction = await transactionModel.findOne(tx => {
                const meta = tx.metadata || {};
                return ((meta.transactionId === paymentData.metadata?.transactionId || tx.id === paymentData.metadata?.transactionId) &&
                    tx.userId === req.userId);
            });
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    error: 'Transaction not found',
                });
            }
        }
        else {
            paystackResponse = await verifyPayment(reference);
            if (!paystackResponse || !paystackResponse.status || !paystackResponse.data) {
                return res.status(400).json({
                    success: false,
                    error: paystackResponse?.message || 'Payment verification failed',
                });
            }
            paymentData = paystackResponse.data;
        }
        if (transaction.status === 'completed') {
            const agent = await userModel.findById(req.userId);
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
        if (paymentData.status === 'success') {
            const agent = await userModel.findById(req.userId);
            const creditsToAdd = Number(transaction.credits || 0);
            const previousBalance = Number(agent.credits || 0);
            const newBalance = previousBalance + creditsToAdd;
            await userModel.update(req.userId, {
                credits: newBalance,
            });
            console.log(`💰 verify/:reference: credited user ${req.userId} +${creditsToAdd} (before=${previousBalance} after=${newBalance})`);
            await transactionModel.update(transaction.id, {
                status: 'completed',
                metadata: {
                    ...transaction.metadata,
                    paystackId: paymentData.id,
                    paidAt: paymentData.paid_at,
                    channel: paymentData.channel,
                    applied: true,
                },
            });
            await sendNotification({
                userId: req.userId,
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
        }
        else if (paymentData.status === 'failed') {
            await transactionModel.update(transaction.id, { status: 'failed' });
            res.status(400).json({
                success: false,
                error: 'Payment failed',
                data: {
                    status: 'failed',
                },
            });
        }
        else {
            res.json({
                success: false,
                message: 'Payment pending or abandoned',
                data: {
                    status: paymentData.status,
                },
            });
        }
    }
    catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment',
        });
    }
});
// Paystack webhook
router.post('/webhook', async (req, res) => {
    try {
        console.log('🔔 [WEBHOOK] Received webhook request');
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
        const rawBodyString = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
        const hash = crypto
            .createHmac('sha512', paystackSecret)
            .update(rawBodyString)
            .digest('hex');
        const signatureHeader = (req.headers['x-paystack-signature'] || '');
        if (!signatureHeader || hash !== signatureHeader) {
            console.warn('⚠️ [WEBHOOK] Signature verification FAILED');
            return res.status(401).json({
                success: false,
                error: 'Invalid signature',
            });
        }
        console.log('✅ [WEBHOOK] Signature verified');
        const event = Buffer.isBuffer(req.body) ? JSON.parse(rawBodyString) : req.body;
        if (event.event === 'charge.success') {
            const data = event.data;
            const reference = data.reference;
            console.log(`🔔 Webhook charge.success received: reference=${reference}`);
            const transaction = await transactionModel.findOne(tx => {
                const meta = tx.metadata || {};
                return (meta.reference === reference ||
                    meta.transactionId === reference ||
                    (data.metadata && (meta.transactionId === data.metadata.transactionId || tx.id === data.metadata.transactionId)));
            });
            if (!transaction) {
                console.warn(`⚠️ Webhook: no matching transaction found for reference=${reference}`);
            }
            else if (transaction.status !== 'pending') {
                console.log(`ℹ️ Webhook: transaction found but status=${transaction.status}`);
            }
            else {
                const userId = transaction.userId;
                const creditsToAdd = transaction.credits || 0;
                const agent = await userModel.findById(userId);
                if (agent) {
                    const previous = Number(agent.credits || 0);
                    await userModel.update(userId, {
                        credits: previous + creditsToAdd,
                    });
                    console.log(`💰 Webhook: credited user ${userId} +${creditsToAdd}`);
                    await transactionModel.update(transaction.id, {
                        status: 'completed',
                        metadata: {
                            ...transaction.metadata,
                            paystackId: data.id,
                            paystackReference: data.reference,
                            paidAt: data.paid_at,
                            channel: data.channel,
                            applied: true,
                        },
                    });
                    await sendNotification({
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
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});
// Check payment status
router.get('/status', async (req, res) => {
    try {
        const configured = isPaystackConfigured();
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
    }
    catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get payment status',
        });
    }
});
// Debug endpoint
router.get('/debug', async (req, res) => {
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
export default router;
//# sourceMappingURL=payment.routes.js.map