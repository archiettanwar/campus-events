import { z } from 'zod';

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be either approved or rejected' }),
  }),
});