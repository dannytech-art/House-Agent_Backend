export interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    format?: string;
    width?: number;
    height?: number;
    error?: string;
}
/**
 * Upload a file buffer to Cloudinary
 */
export declare const uploadToCloudinary: (buffer: Buffer, options?: {
    folder?: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    publicId?: string;
}) => Promise<UploadResult>;
/**
 * Upload multiple files to Cloudinary
 */
export declare const uploadMultipleToCloudinary: (files: Express.Multer.File[], folder?: string) => Promise<UploadResult[]>;
/**
 * Delete a file from Cloudinary
 */
export declare const deleteFromCloudinary: (publicId: string) => Promise<boolean>;
/**
 * Get Cloudinary configuration status
 */
export declare const getCloudinaryStatus: () => {
    configured: boolean;
    cloudName: string;
};
declare const _default: {
    uploadToCloudinary: (buffer: Buffer, options?: {
        folder?: string;
        resourceType?: "image" | "video" | "raw" | "auto";
        publicId?: string;
    }) => Promise<UploadResult>;
    uploadMultipleToCloudinary: (files: Express.Multer.File[], folder?: string) => Promise<UploadResult[]>;
    deleteFromCloudinary: (publicId: string) => Promise<boolean>;
    getCloudinaryStatus: () => {
        configured: boolean;
        cloudName: string;
    };
};
export default _default;
//# sourceMappingURL=upload.service.d.ts.map