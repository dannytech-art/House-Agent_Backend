import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Ensure dotenv is loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Configure Cloudinary - uses environment variables
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
const configureCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
};
// Initialize on first use
let isConfigured = false;
const ensureConfigured = () => {
    if (!isConfigured) {
        configureCloudinary();
        isConfigured = true;
        console.log('Cloudinary configured with cloud:', process.env.CLOUDINARY_CLOUD_NAME);
    }
};
/**
 * Upload a file buffer to Cloudinary
 */
export const uploadToCloudinary = (buffer, options = {}) => {
    ensureConfigured();
    return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: options.folder || 'vilanow/properties',
            resource_type: options.resourceType || 'auto',
            public_id: options.publicId,
            transformation: options.resourceType === 'image' ? [
                { quality: 'auto:good', fetch_format: 'auto' }
            ] : undefined,
        }, (error, result) => {
            if (error) {
                resolve({
                    success: false,
                    error: error.message || 'Upload failed',
                });
            }
            else if (result) {
                resolve({
                    success: true,
                    url: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    width: result.width,
                    height: result.height,
                });
            }
            else {
                resolve({
                    success: false,
                    error: 'Unknown upload error',
                });
            }
        });
        uploadStream.end(buffer);
    });
};
/**
 * Upload multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (files, folder = 'vilanow/properties') => {
    const uploadPromises = files.map((file) => {
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        return uploadToCloudinary(file.buffer, { folder, resourceType });
    });
    return Promise.all(uploadPromises);
};
/**
 * Delete a file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId) => {
    ensureConfigured();
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    }
    catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
};
/**
 * Get Cloudinary configuration status
 */
export const getCloudinaryStatus = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
    const isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET);
    return {
        configured: isConfigured,
        cloudName,
    };
};
export default {
    uploadToCloudinary,
    uploadMultipleToCloudinary,
    deleteFromCloudinary,
    getCloudinaryStatus,
};
//# sourceMappingURL=upload.service.js.map