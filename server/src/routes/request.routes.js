import express from 'express';
import CheckoutRequest from '../models/CheckoutRequest.js';
import LabResource from '../models/LabResource.js';
import LabSchedule from '../models/LabSchedule.js';
import { protect, requireLabAssistant } from '../middleware/auth.middleware.js';

const router = express.Router();

const hasTimeOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

const findScheduleConflict = async (labRoomId, requestedDate, startTime, endTime) => {
  const dayOfWeek = new Date(`${requestedDate}T00:00:00`).getDay();
  const blocks = await LabSchedule.find({
    labRoom: labRoomId,
    $or: [
      { isRecurring: true, dayOfWeek },
      { isRecurring: false, specificDate: requestedDate },
    ],
  });
  return blocks.find((b) => hasTimeOverlap(startTime, endTime, b.startTime, b.endTime)) || null;
};

// GET /api/requests/my (Student)
router.get('/my', protect, async (req, res, next) => {
  try {
    const requests = await CheckoutRequest.find({ student: req.user._id })
      .populate('resource', 'name resourceType category location')
      .populate('processedBy', 'name labAssigned')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// GET /api/requests (Lab Assistant Shared Queue)
router.get('/', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const requests = await CheckoutRequest.find()
      .populate('student', 'name email department rollNumber')
      .populate('resource', 'name resourceType category location availableQuantity totalQuantity')
      .populate('processedBy', 'name labAssigned')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// POST /api/requests (Student submits Equipment, Individual PC, or Council Meeting request)
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      resourceId,
      bookingCategory,
      councilName,
      purpose,
      requestedDate,
      startTime,
      endTime,
      quantity,
    } = req.body;

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const resource = await LabResource.findById(resourceId);
    if (!resource || !resource.isActive) {
      return res.status(404).json({ message: 'Requested lab resource not found' });
    }

    const reqQty = Number(quantity) || 1;

    if (resource.resourceType === 'equipment' && resource.availableQuantity < reqQty) {
      return res.status(400).json({
        message: `Only ${resource.availableQuantity} unit(s) available in stock`,
      });
    }

    // Check timetable conflicts when booking a lab room (Individual PC or Council Meeting)
    if (resource.resourceType === 'lab_room') {
      const conflict = await findScheduleConflict(resource._id, requestedDate, startTime, endTime);
      if (conflict) {
        return res.status(409).json({
          message: `Lab is occupied during this slot by "${conflict.title}" (${conflict.activityType}: ${conflict.startTime} - ${conflict.endTime})`,
        });
      }
    }

    const request = await CheckoutRequest.create({
      student: req.user._id,
      resource: resource._id,
      bookingCategory,
      councilName: bookingCategory === 'council_meeting' ? councilName : '',
      purpose,
      requestedDate,
      startTime,
      endTime,
      quantity: reqQty,
    });

    const populated = await request.populate([
      { path: 'student', select: 'name email department rollNumber' },
      { path: 'resource', select: 'name resourceType category location availableQuantity totalQuantity' },
    ]);

    req.app.get('io')?.emit('request:created', populated);
    res.status(201).json({ request: populated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/requests/:id/status (Lab Assistant approves, rejects, or marks returned)
router.patch('/:id/status', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const { status, assistantNote } = req.body;
    const allowed = ['approved', 'rejected', 'returned', 'overdue'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const request = await CheckoutRequest.findById(req.params.id).populate('resource');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const prevStatus = request.status;
    const resource = request.resource;
    const io = req.app.get('io');

    // 1. Approving a pending request
    if (status === 'approved' && prevStatus !== 'approved') {
      if (resource.resourceType === 'equipment') {
        if (resource.availableQuantity < request.quantity) {
          return res.status(400).json({ message: 'Insufficient stock left to approve this request' });
        }
        resource.availableQuantity -= request.quantity;
        await resource.save();
        io?.emit('resource:updated', resource);
      }

      // Automatically block the lab timetable when a Council Meeting is approved
      if (resource.resourceType === 'lab_room' && request.bookingCategory === 'council_meeting') {
        const conflict = await findScheduleConflict(
          resource._id,
          request.requestedDate,
          request.startTime,
          request.endTime
        );
        if (conflict) {
          return res.status(409).json({
            message: `Cannot approve: slot now conflicts with "${conflict.title}" (${conflict.startTime}-${conflict.endTime})`,
          });
        }

        const meetingTitle = request.councilName
          ? `${request.councilName} — ${request.purpose}`
          : `Council Meeting: ${request.purpose}`;

        const scheduleBlock = await LabSchedule.create({
          labRoom: resource._id,
          title: meetingTitle,
          activityType: 'Council Meeting',
          isRecurring: false,
          specificDate: request.requestedDate,
          startTime: request.startTime,
          endTime: request.endTime,
          createdBy: req.user._id,
        });
        io?.emit('schedule:updated', scheduleBlock);
      }
    }

    // 2. Marking an approved equipment checkout as Returned -> restore stock
    if (status === 'returned' && prevStatus === 'approved') {
      request.returnedAt = new Date();
      if (resource.resourceType === 'equipment') {
        resource.availableQuantity = Math.min(
          resource.totalQuantity,
          resource.availableQuantity + request.quantity
        );
        await resource.save();
        io?.emit('resource:updated', resource);
      }
    }

    request.status = status;
    if (assistantNote !== undefined) request.assistantNote = assistantNote;
    request.processedBy = req.user._id;
    await request.save();

    const populated = await CheckoutRequest.findById(request._id)
      .populate('student', 'name email department rollNumber')
      .populate('resource', 'name resourceType category location availableQuantity totalQuantity')
      .populate('processedBy', 'name labAssigned');

    io?.emit('request:statusChanged', populated);
    res.json({ request: populated });
  } catch (err) {
    next(err);
  }
});

export default router;