import express from 'express';
import LabSchedule from '../models/LabSchedule.js';
import LabResource from '../models/LabResource.js';
import { protect, requireLabAssistant } from '../middleware/auth.middleware.js';

const router = express.Router();

const hasTimeOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

// GET /api/schedules
router.get('/', async (req, res, next) => {
  try {
    const schedules = await LabSchedule.find()
      .populate('labRoom', 'name location totalQuantity')
      .populate('createdBy', 'name')
      .sort({ dayOfWeek: 1, specificDate: 1, startTime: 1 });

    res.json({ schedules });
  } catch (err) {
    next(err);
  }
});

// GET /api/schedules/live-status?date=YYYY-MM-DD&dayOfWeek=0-6&time=HH:mm
router.get('/live-status', async (req, res, next) => {
  try {
    const now = new Date();
    const date = req.query.date || now.toISOString().slice(0, 10);
    const dayOfWeek = req.query.dayOfWeek !== undefined ? Number(req.query.dayOfWeek) : now.getDay();
    const time = req.query.time || now.toTimeString().slice(0, 5);

    const [labs, allBlocks] = await Promise.all([
      LabResource.find({ resourceType: 'lab_room', isActive: true }).sort({ name: 1 }),
      LabSchedule.find({
        $or: [
          { isRecurring: true, dayOfWeek },
          { isRecurring: false, specificDate: date },
        ],
      }).sort({ startTime: 1 }),
    ]);

    const statusList = labs.map((lab) => {
      const todayBlocks = allBlocks.filter(
        (b) => b.labRoom.toString() === lab._id.toString()
      );

      const currentActivity =
        todayBlocks.find((b) => time >= b.startTime && time < b.endTime) || null;
      const nextActivity =
        todayBlocks.find((b) => b.startTime > time) || null;

      return {
        lab,
        isFree: !currentActivity,
        currentActivity,
        nextActivity,
        todayBlocks,
      };
    });

    res.json({ date, dayOfWeek, time, labs: statusList });
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules (Lab Assistant)
router.post('/', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const { labRoom, title, activityType, isRecurring, dayOfWeek, specificDate, startTime, endTime } = req.body;

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const existingBlocks = await LabSchedule.find({
      labRoom,
      ...(isRecurring ? { isRecurring: true, dayOfWeek: Number(dayOfWeek) } : { isRecurring: false, specificDate }),
    });

    const conflict = existingBlocks.find((b) => hasTimeOverlap(startTime, endTime, b.startTime, b.endTime));
    if (conflict) {
      return res.status(409).json({
        message: `Time conflict with "${conflict.title}" (${conflict.startTime} - ${conflict.endTime})`,
      });
    }

    const block = await LabSchedule.create({
      labRoom,
      title,
      activityType,
      isRecurring: Boolean(isRecurring),
      dayOfWeek: isRecurring ? Number(dayOfWeek) : undefined,
      specificDate: !isRecurring ? specificDate : undefined,
      startTime,
      endTime,
      createdBy: req.user._id,
    });

    const populated = await block.populate([
      { path: 'labRoom', select: 'name location totalQuantity' },
      { path: 'createdBy', select: 'name' },
    ]);

    req.app.get('io')?.emit('schedule:updated', populated);
    res.status(201).json({ schedule: populated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedules/:id (Lab Assistant)
router.delete('/:id', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const deleted = await LabSchedule.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Schedule block not found' });

    req.app.get('io')?.emit('schedule:updated', { deletedId: req.params.id });
    res.json({ message: 'Schedule block removed' });
  } catch (err) {
    next(err);
  }
});

export default router;