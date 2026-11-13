import { Event } from '../models/LabResource.js';
import { Registration } from '../models/CheckoutRequest.js';
import { User } from '../models/User.js';
import { getIO } from '../sockets/io.js';
import { notify } from '../utils/notify.js';

export async function registerForEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    if (event.seatsTaken >= event.capacity) {
      return res.status(409).json({ message: 'Event is full' });
    }

    const registration = await Registration.create({
      user: req.user.id,
      event: event._id,
    });

    try {
      const populated = await registration.populate([
        { path: 'user', select: 'name email' },
        { path: 'event', select: 'title' },
      ]);
      getIO().to('admins').emit('registration:new', { registration: populated });
    } catch (err) {
      console.error('Socket emit error:', err.message);
    }

    return res.status(201).json({ registration });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already registered for this event' });
    }
    next(error);
  }
}

export async function getMyRegistrations(req, res, next) {
  try {
    const registrations = await Registration.find({ user: req.user.id })
      .populate('event', 'title date registrationDeadline')
      .sort({ createdAt: -1 });

    return res.json({ registrations });
  } catch (error) {
    next(error);
  }
}

export async function getEventRegistrations(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registrations = await Registration.find({ event: req.params.id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ registrations });
  } catch (error) {
    next(error);
  }
}

export async function updateRegistrationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === 'approved') {
      // 1. Atomically transition from pending -> approved
      const registration = await Registration.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { status: 'approved' },
        { new: true }
      );

      if (!registration) {
        return res.status(409).json({ message: 'Registration is not pending' });
      }

      // 2. Atomically increment seatsTaken only if seatsTaken < capacity
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: registration.event,
          $expr: { $lt: ['$seatsTaken', '$capacity'] },
        },
        { $inc: { seatsTaken: 1 } },
        { new: true }
      );

      // 3. If event filled up concurrently, revert registration to pending
      if (!updatedEvent) {
        await Registration.findByIdAndUpdate(id, { status: 'pending' });
        return res.status(409).json({ message: 'Event is full' });
      }

      const populatedReg = await registration.populate('event', 'title date registrationDeadline');

      await notify({
        userId: registration.user,
        eventId: updatedEvent._id,
        message: `Your registration for "${updatedEvent.title}" has been approved!`,
        type: 'registration_approved',
        socketEvent: 'registration:updated',
        socketPayload: { registration: populatedReg },
      });

      try {
        getIO().emit('event:updated', { event: updatedEvent });

        // Almost-full alert sent once when seats reach >= 90%
        if (
          updatedEvent.seatsTaken / updatedEvent.capacity >= 0.9 &&
          !updatedEvent.almostFullNotified
        ) {
          updatedEvent.almostFullNotified = true;
          await updatedEvent.save();

          getIO().to('admins').emit('event:almostFull', { event: updatedEvent });

          const admins = await User.find({ role: 'admin' }).select('_id');
          await Promise.all(
            admins.map((admin) =>
              notify({
                userId: admin._id,
                eventId: updatedEvent._id,
                message: `"${updatedEvent.title}" is almost full (${updatedEvent.seatsTaken}/${updatedEvent.capacity} seats taken).`,
                type: 'event_almost_full',
              })
            )
          );
        }
      } catch (err) {
        console.error('Socket emit error:', err.message);
      }

      return res.json({ registration: populatedReg, event: updatedEvent });
    }

    // Handling status === 'rejected'
    const existing = await Registration.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (existing.status === 'rejected') {
      return res.status(409).json({ message: 'Registration is already rejected' });
    }

    if (existing.status === 'pending') {
      const registration = await Registration.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { status: 'rejected' },
        { new: true }
      );

      if (!registration) {
        return res.status(409).json({ message: 'Registration status changed concurrently' });
      }

      const populatedReg = await registration.populate('event', 'title date registrationDeadline');

      await notify({
        userId: registration.user,
        eventId: registration.event._id,
        message: `Your registration for "${populatedReg.event?.title || 'an event'}" was rejected.`,
        type: 'registration_rejected',
        socketEvent: 'registration:updated',
        socketPayload: { registration: populatedReg },
      });

      return res.json({ registration: populatedReg });
    }

    // Rejecting an already approved registration -> decrement seatsTaken by 1
    const registration = await Registration.findOneAndUpdate(
      { _id: id, status: 'approved' },
      { status: 'rejected' },
      { new: true }
    );

    if (!registration) {
      return res.status(409).json({ message: 'Registration status changed concurrently' });
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: registration.event, seatsTaken: { $gt: 0 } },
      { $inc: { seatsTaken: -1 } },
      { new: true }
    );

    const populatedReg = await registration.populate('event', 'title date registrationDeadline');

    await notify({
      userId: registration.user,
      eventId: registration.event._id,
      message: `Your registration for "${populatedReg.event?.title || 'an event'}" was rejected.`,
      type: 'registration_rejected',
      socketEvent: 'registration:updated',
      socketPayload: { registration: populatedReg },
    });

    if (updatedEvent) {
      try {
        getIO().emit('event:updated', { event: updatedEvent });
      } catch (err) {
        console.error('Socket emit error:', err.message);
      }
    }

    return res.json({ registration: populatedReg, event: updatedEvent });
  } catch (error) {
    next(error);
  }
}