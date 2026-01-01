import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
export declare const upload: multer.Multer;
export declare const handleUploadError: (err: Error, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export default upload;
//# sourceMappingURL=upload.d.ts.map