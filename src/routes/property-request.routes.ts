import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { propertyRequestModel } from '../models/PropertyRequest.js';
import { userModel } from '../models/User.js';
import { authenticate, optionalAuth, requireRole, AuthRequest } from '../middleware/auth.js';
import { PropertyType } from '../types/index.js';

const router = Router();

// Valid property types
const validPropertyTypes: PropertyType[] = ['apartment', 'house', 'duplex', 'penthouse', 'studio', 'land'];

// Get all property requests (with filters) - agents can see active requests
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { location, type, minBudget, maxBudget, bedrooms, status, page = 1, limit = 20 } = req.query;

    const filters: any = {};
    if (location) filters.location = location as string;
    if (type) filters.type = type as PropertyType;
    if (minBudget) filters.minBudget = Number(minBudget);
    if (maxBudget) filters.maxBudget = Number(maxBudget);
    if (bedrooms) filters.bedrooms = Number(bedrooms);
    if (status) filters.status = status as 'active' | 'fulfilled' | 'expired';
    
    // Default to only showing active requests for non-authenticated users
    if (!req.userId && !filters.status) {
      filters.status = 'active';
    }

    let requests = propertyRequestModel.search(filters);

    // Sort by newest first
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedRequests = requests.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: requests.length,
        totalPages: Math.ceil(requests.length / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get property requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property requests',
    });
  }
});

// Get my property requests (for seekers)
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requests = propertyRequestModel.findBySeeker(req.userId!);
    
    // Sort by newest first
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Get my property requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get your property requests',
    });
  }
});

// Get property request by ID
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const request = propertyRequestModel.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Property request not found',
      });
    }

    // Get seeker info (limited)
    const seeker = userModel.findById(request.seekerId);
    const seekerInfo = seeker ? {
      id: seeker.id,
      name: seeker.name,
    } : null;

    res.json({
      success: true,
      data: {
        ...request,
        seeker: seekerInfo,
      },
    });
  } catch (error) {
    console.error('Get property request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property request',
    });
  }
});

// Create property request (seekers only)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, location, minBudget, maxBudget, bedrooms, description } = req.body;

    // Validate required fields
    if (!type || !location || minBudget === undefined || maxBudget === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, location, minBudget, maxBudget',
      });
    }

    // Validate property type
    if (!validPropertyTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid property type. Must be one of: ${validPropertyTypes.join(', ')}`,
      });
    }

    // Validate budget
    if (Number(minBudget) < 0 || Number(maxBudget) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Budget values must be positive numbers',
      });
    }

    if (Number(minBudget) > Number(maxBudget)) {
      return res.status(400).json({
        success: false,
        error: 'Minimum budget cannot be greater than maximum budget',
      });
    }

    const user = userModel.findById(req.userId!);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date().toISOString();
    const newRequest = {
      id: uuidv4(),
      seekerId: req.userId!,
      type: type as PropertyType,
      location,
      minBudget: Number(minBudget),
      maxBudget: Number(maxBudget),
      bedrooms: bedrooms ? Number(bedrooms) : 0,
      description: description || '',
      status: 'active' as const,
      matches: 0,
      createdAt: now,
      updatedAt: now,
    };

    propertyRequestModel.create(newRequest);

    res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Property request posted successfully. Agents will be able to see your request.',
    });
  } catch (error) {
    console.error('Create property request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property request',
    });
  }
});

// Update property request
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const request = propertyRequestModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Property request not found',
      });
    }

    // Only allow request owner or admin to update
    if (request.seekerId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this property request',
      });
    }

    // Validate property type if provided
    if (updates.type && !validPropertyTypes.includes(updates.type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid property type. Must be one of: ${validPropertyTypes.join(', ')}`,
      });
    }

    // Validate budget if provided
    const newMinBudget = updates.minBudget !== undefined ? Number(updates.minBudget) : request.minBudget;
    const newMaxBudget = updates.maxBudget !== undefined ? Number(updates.maxBudget) : request.maxBudget;

    if (newMinBudget > newMaxBudget) {
      return res.status(400).json({
        success: false,
        error: 'Minimum budget cannot be greater than maximum budget',
      });
    }

    // Prevent updating protected fields
    delete updates.id;
    delete updates.seekerId;
    delete updates.createdAt;
    delete updates.matches;

    updates.updatedAt = new Date().toISOString();
    if (updates.minBudget !== undefined) updates.minBudget = Number(updates.minBudget);
    if (updates.maxBudget !== undefined) updates.maxBudget = Number(updates.maxBudget);
    if (updates.bedrooms !== undefined) updates.bedrooms = Number(updates.bedrooms);

    const updatedRequest = propertyRequestModel.update(id, updates);

    res.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error) {
    console.error('Update property request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property request',
    });
  }
});

// Delete property request
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = propertyRequestModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Property request not found',
      });
    }

    // Only allow request owner or admin to delete
    if (request.seekerId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this property request',
      });
    }

    propertyRequestModel.delete(id);

    res.json({
      success: true,
      message: 'Property request deleted successfully',
    });
  } catch (error) {
    console.error('Delete property request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property request',
    });
  }
});

// Mark request as fulfilled
router.patch('/:id/fulfill', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = propertyRequestModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Property request not found',
      });
    }

    // Only allow request owner or admin to mark as fulfilled
    if (request.seekerId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this property request',
      });
    }

    const updatedRequest = propertyRequestModel.update(id, {
      status: 'fulfilled',
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: updatedRequest,
      message: 'Property request marked as fulfilled',
    });
  } catch (error) {
    console.error('Fulfill property request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property request',
    });
  }
});

export default router;







