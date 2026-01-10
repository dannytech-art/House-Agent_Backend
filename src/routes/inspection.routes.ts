import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { inspectionModel } from '../models/Inspection.js';
import { interestModel } from '../models/Interest.js';
import { propertyModel } from '../models/Property.js';
import { userModel } from '../models/User.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { sendNotification } from '../services/notification.service.js';

const router = Router();

// Schedule an inspection (Seeker)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { interestId, scheduledDate, scheduledTime, notes } = req.body;

    if (!interestId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Interest ID, scheduled date, and time are required',
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduledDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduledTime)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time format. Use HH:MM (24-hour)',
      });
    }

    // Check if date is in the future
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Inspection date must be in the future',
      });
    }

    const interest = interestModel.findById(interestId);
    if (!interest) {
      return res.status(404).json({
        success: false,
        error: 'Interest not found',
      });
    }

    // Verify user is the seeker who expressed interest
    if (interest.seekerId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to schedule inspection for this interest',
      });
    }

    // Check if inspection already exists
    const existingInspection = inspectionModel.findByInterest(interestId);
    if (existingInspection) {
      return res.status(400).json({
        success: false,
        error: 'Inspection already scheduled for this interest. Use PUT to reschedule.',
        data: existingInspection,
      });
    }

    const property = propertyModel.findById(interest.propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    const seeker = userModel.findById(req.userId!);
    if (!seeker) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date().toISOString();
    const newInspection = {
      id: uuidv4(),
      interestId,
      propertyId: interest.propertyId,
      seekerId: req.userId!,
      seekerName: seeker.name,
      seekerPhone: seeker.phone,
      agentId: property.agentId,
      scheduledDate,
      scheduledTime,
      status: 'pending' as const,
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    inspectionModel.create(newInspection);

    // Update interest status
    interestModel.update(interestId, {
      status: 'viewing-scheduled',
      updatedAt: now,
    });

    // Notify the agent
    sendNotification({
      userId: property.agentId,
      title: 'Inspection Scheduled! 📅',
      message: `${seeker.name} has scheduled an inspection for "${property.title}" on ${scheduledDate} at ${scheduledTime}`,
      type: 'info',
      metadata: {
        inspectionId: newInspection.id,
        propertyId: property.id,
        scheduledDate,
        scheduledTime,
      },
    });

    res.status(201).json({
      success: true,
      data: newInspection,
      message: 'Inspection scheduled successfully! The agent has been notified.',
    });
  } catch (error) {
    console.error('Schedule inspection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule inspection',
    });
  }
});

// Get my inspections (as seeker)
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inspections = inspectionModel.findBySeeker(req.userId!);

    // Enrich with property info
    const enrichedInspections = inspections.map(inspection => {
      const property = propertyModel.findById(inspection.propertyId);
      return {
        ...inspection,
        property: property ? {
          id: property.id,
          title: property.title,
          location: property.location,
          price: property.price,
          images: property.images,
        } : null,
      };
    });

    res.json({
      success: true,
      data: enrichedInspections,
    });
  } catch (error) {
    console.error('Get my inspections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inspections',
    });
  }
});

// Get inspections for agent
router.get('/agent', authenticate, requireRole('agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, upcoming } = req.query;

    let inspections;
    if (upcoming === 'true') {
      inspections = inspectionModel.findUpcoming(req.userId!);
    } else {
      inspections = inspectionModel.findByAgent(req.userId!);
    }

    if (status) {
      inspections = inspections.filter(i => i.status === status);
    }

    // Enrich with property and seeker info
    const enrichedInspections = inspections.map(inspection => {
      const property = propertyModel.findById(inspection.propertyId);
      const seeker = userModel.findById(inspection.seekerId);
      return {
        ...inspection,
        property: property ? {
          id: property.id,
          title: property.title,
          location: property.location,
          price: property.price,
          images: property.images,
        } : null,
        seeker: seeker ? {
          id: seeker.id,
          name: seeker.name,
          phone: seeker.phone,
          avatar: seeker.avatar,
        } : null,
      };
    });

    res.json({
      success: true,
      data: enrichedInspections,
    });
  } catch (error) {
    console.error('Get agent inspections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inspections',
    });
  }
});

// Get inspections for a specific property (Agent)
router.get('/property/:propertyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;

    const property = propertyModel.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Only property owner or admin can view
    if (property.agentId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view inspections for this property',
      });
    }

    const inspections = inspectionModel.findByProperty(propertyId);

    // Enrich with seeker info
    const enrichedInspections = inspections.map(inspection => {
      const seeker = userModel.findById(inspection.seekerId);
      return {
        ...inspection,
        seeker: seeker ? {
          id: seeker.id,
          name: seeker.name,
          phone: seeker.phone,
          avatar: seeker.avatar,
        } : null,
      };
    });

    res.json({
      success: true,
      data: enrichedInspections,
    });
  } catch (error) {
    console.error('Get property inspections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inspections',
    });
  }
});

// Update inspection (Reschedule or update status)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, status, notes, agentNotes } = req.body;

    const inspection = inspectionModel.findById(id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: 'Inspection not found',
      });
    }

    const property = propertyModel.findById(inspection.propertyId);
    const isAgent = property && property.agentId === req.userId;
    const isSeeker = inspection.seekerId === req.userId;

    if (!isAgent && !isSeeker && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this inspection',
      });
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Seeker can reschedule
    if (isSeeker && scheduledDate && scheduledTime) {
      updates.scheduledDate = scheduledDate;
      updates.scheduledTime = scheduledTime;
      updates.status = 'rescheduled';
      if (notes) updates.notes = notes;

      // Notify agent about reschedule
      sendNotification({
        userId: inspection.agentId,
        title: 'Inspection Rescheduled 📅',
        message: `${inspection.seekerName} has rescheduled the inspection to ${scheduledDate} at ${scheduledTime}`,
        type: 'info',
        metadata: {
          inspectionId: id,
          propertyId: inspection.propertyId,
        },
      });
    }

    // Agent can update status and add notes
    if (isAgent) {
      if (status) {
        updates.status = status;

        // Notify seeker about status change
        let notifMessage = '';
        if (status === 'confirmed') {
          notifMessage = `Your inspection for "${property?.title}" has been confirmed!`;
        } else if (status === 'cancelled') {
          notifMessage = `Your inspection for "${property?.title}" has been cancelled by the agent.`;
        } else if (status === 'completed') {
          notifMessage = `Your inspection for "${property?.title}" has been marked as completed.`;
        }

        if (notifMessage) {
          sendNotification({
            userId: inspection.seekerId,
            title: `Inspection ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: notifMessage,
            type: status === 'confirmed' ? 'success' : 'info',
            metadata: {
              inspectionId: id,
              propertyId: inspection.propertyId,
            },
          });
        }
      }
      if (agentNotes) updates.agentNotes = agentNotes;
    }

    const updatedInspection = inspectionModel.update(id, updates);

    res.json({
      success: true,
      data: updatedInspection,
    });
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inspection',
    });
  }
});

// Cancel inspection
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const inspection = inspectionModel.findById(id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: 'Inspection not found',
      });
    }

    const property = propertyModel.findById(inspection.propertyId);
    const isAgent = property && property.agentId === req.userId;
    const isSeeker = inspection.seekerId === req.userId;

    if (!isAgent && !isSeeker && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this inspection',
      });
    }

    // Update status to cancelled instead of deleting
    inspectionModel.update(id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });

    // Update interest status back to contacted
    interestModel.update(inspection.interestId, {
      status: 'contacted',
      updatedAt: new Date().toISOString(),
    });

    // Notify the other party
    const notifyUserId = isSeeker ? inspection.agentId : inspection.seekerId;
    const cancelledBy = isSeeker ? inspection.seekerName : 'The agent';
    
    sendNotification({
      userId: notifyUserId,
      title: 'Inspection Cancelled',
      message: `${cancelledBy} has cancelled the inspection for "${property?.title}"`,
      type: 'warning',
      metadata: {
        inspectionId: id,
        propertyId: inspection.propertyId,
      },
    });

    res.json({
      success: true,
      message: 'Inspection cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel inspection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel inspection',
    });
  }
});

export default router;







