import multer from 'multer';
// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();
// File filter to accept only images and videos
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPG, PNG, WebP, GIF, MP4, WebM`));
    }
};
// Create multer upload middleware
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 10, // Max 10 files at once
    },
});
// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB per file.',
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files. Maximum is 10 files at once.',
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`,
        });
    }
    if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }
    next(err);
};
export default upload;
//# sourceMappingURL=upload.js.map