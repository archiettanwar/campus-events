import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { Notification } from '../models/Notification.js';

export async function listEvents(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { date: { $gt: new Date() } };

    const [items, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      items,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventObj = event.toObject();
    eventObj.seatsLeft = Math.max(0, event.capacity - event.seatsTaken);

    return res.json({ event: eventObj });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const event = await Event.create({
      ...req.body,
      createdBy: req.user.id,
    });

    return res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const existing = await Event.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.body.capacity !== undefined && req.body.capacity < existing.seatsTaken) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: {
          capacity: `Capacity cannot be less than current seats taken (${existing.seatsTaken})`,
        },
      });
    }

    const nextDate = req.body.date || existing.date;
    const nextDeadline = req.body.registrationDeadline || existing.registrationDeadline;
    if (nextDeadline >= nextDate) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: {
          registrationDeadline: 'Registration deadline must be before the event date',
        },
      });
    }

    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Promise.all([
      Registration.deleteMany({ event: event._id }),
      Notification.deleteMany({ event: event._id }),
    ]);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}