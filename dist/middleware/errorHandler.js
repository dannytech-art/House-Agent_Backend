export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export const errorHandler = (err, _req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    console.error('Error:', err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
        });
    }
    // Default server error
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
};
//# sourceMappingURL=errorHandler.js.map