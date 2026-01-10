import { Router, Response } from 'express';
import { upload, handleUploadError } from '../middleware/upload.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  getCloudinaryStatus,
} from '../services/upload.service.js';

const router = Router();

// Get upload service status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = getCloudinaryStatus();
    res.json({
      success: true,
      data: {
        ...status,
        maxFileSize: '10MB',
        allowedFormats: ['JPG', 'PNG', 'WebP', 'GIF', 'MP4', 'WebM'],
      },
    });
  } catch (error) {
    console.error('Get upload status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload status',
    });
  }
});

// Upload single file
router.post(
  '/single',
  authenticate,
  upload.single('file'),
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      const folder = req.body.folder || 'vilanow/properties';
      const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

      const result = await uploadToCloudinary(req.file.buffer, {
        folder,
        resourceType,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Upload failed',
        });
      }

      res.json({
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          width: result.width,
          height: result.height,
          type: resourceType,
        },
      });
    } catch (error) {
      console.error('Single upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
      });
    }
  }
);

// Upload multiple files (for property images/videos)
router.post(
  '/multiple',
  authenticate,
  upload.array('files', 10),
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
        });
      }

      const folder = req.body.folder || 'vilanow/properties';
      const results = await uploadMultipleToCloudinary(files, folder);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      res.json({
        success: true,
        data: {
          uploaded: successful.map((r) => ({
            url: r.url,
            publicId: r.publicId,
            format: r.format,
            width: r.width,
            height: r.height,
          })),
          failed: failed.map((r) => r.error),
          summary: {
            total: files.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
      });
    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload files',
      });
    }
  }
);

// Delete uploaded file
router.delete('/:publicId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.params;

    // Decode the publicId (it may contain slashes)
    const decodedPublicId = decodeURIComponent(publicId);

    const deleted = await deleteFromCloudinary(decodedPublicId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'File not found or could not be deleted',
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

// Upload property media (convenience endpoint)
router.post(
  '/property-media',
  authenticate,
  upload.array('files', 10),
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
        });
      }

      const { propertyId } = req.body;
      const folder = propertyId
        ? `vilanow/properties/${propertyId}`
        : 'vilanow/properties';

      const results = await uploadMultipleToCloudinary(files, folder);

      const images: string[] = [];
      const videos: string[] = [];

      results.forEach((result, index) => {
        if (result.success && result.url) {
          const file = files[index];
          if (file.mimetype.startsWith('video/')) {
            videos.push(result.url);
          } else {
            images.push(result.url);
          }
        }
      });

      res.json({
        success: true,
        data: {
          images,
          videos,
          total: images.length + videos.length,
        },
      });
    } catch (error) {
      console.error('Property media upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload property media',
      });
    }
  }
);

export default router;









