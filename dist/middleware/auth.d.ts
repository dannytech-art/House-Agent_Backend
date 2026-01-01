import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}
export interface JwtPayload {
    userId: string;
    role: string;
    iat: number;
    exp: number;
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireRole: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map