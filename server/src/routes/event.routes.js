import { Router } from 'express';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller.js';
import {
  registerForEvent,
  getEventRegistrations,
} from '../controllers/registration.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { createEventSchema, updateEventSchema } from '../validators/event.validator.js';

const router = Router();

// Public routes
router.get('/', listEvents);
router.get('/:id', getEvent);

// Admin event management
router.post('/', requireAuth, requireRole('admin'), validate(createEventSchema), createEvent);
router.patch('/:id', requireAuth, requireRole('admin'), validate(updateEventSchema), updateEvent);
router.delete('/:id', requireAuth, requireRole('admin'), deleteEvent);

// Event registration routes
router.post('/:id/register', requireAuth, registerForEvent);
router.get('/:id/registrations', requireAuth, requireRole('admin'), getEventRegistrations);

export default router;