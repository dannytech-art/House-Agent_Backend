import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import propertyRoutes from './routes/property.routes.js';
import interestRoutes from './routes/interest.routes.js';
import chatRoutes from './routes/chat.routes.js';
import creditRoutes from './routes/credit.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import groupRoutes from './routes/group.routes.js';
import adminRoutes from './routes/admin.routes.js';
import territoryRoutes from './routes/territory.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import ciuRoutes from './routes/ciu.routes.js';
import propertyRequestRoutes from './routes/property-request.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import inspectionRoutes from './routes/inspection.routes.js';
const app = express();
// Universal CORS - Allow all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
}));
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Request logging
app.use(requestLogger);
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.env,
    });
});
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ciu', ciuRoutes);
app.use('/api/property-requests', propertyRequestRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/inspections', inspectionRoutes);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});
// Global error handler
app.use(errorHandler);
// Start server
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`🚀 Vilanow API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${config.env}`);
    console.log(`🌐 CORS: Universal (all origins allowed)`);
    console.log(`📝 API Base URL: http://localhost:${PORT}/api`);
});
export default app;
//# sourceMappingURL=index.js.map