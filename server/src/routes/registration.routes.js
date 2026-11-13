import { Router } from 'express';
import {
  getMyRegistrations,
  updateRegistrationStatus,
} from '../controllers/registration.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { updateRegistrationStatusSchema } from '../validators/registration.validator.js';

const router = Router();

router.get('/mine', requireAuth, getMyRegistrations);
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(updateRegistrationStatusSchema),
  updateRegistrationStatus
);

export default router;