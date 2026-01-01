import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
    }
};
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Insufficient permissions.',
            });
        }
        next();
    };
};
export const optionalAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret);
            req.userId = decoded.userId;
            req.userRole = decoded.role;
        }
    }
    catch {
        // Token invalid, continue without auth
    }
    next();
};
//# sourceMappingURL=auth.js.map