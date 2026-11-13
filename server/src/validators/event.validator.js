import { z } from 'zod';

const baseEventFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  date: z.coerce
    .date({ invalid_type_error: 'Invalid event date' })
    .refine((d) => d > new Date(), 'Event date must be in the future'),
  registrationDeadline: z.coerce.date({
    invalid_type_error: 'Invalid registration deadline',
  }),
  capacity: z
    .number({ invalid_type_error: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(1000, 'Capacity cannot exceed 1000'),
};

export const createEventSchema = z
  .object(baseEventFields)
  .superRefine((data, ctx) => {
    if (data.registrationDeadline >= data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registrationDeadline'],
        message: 'Registration deadline must be before the event date',
      });
    }
  });

export const updateEventSchema = z
  .object(baseEventFields)
  .partial()
  .superRefine((data, ctx) => {
    if (data.date && data.registrationDeadline && data.registrationDeadline >= data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registrationDeadline'],
        message: 'Registration deadline must be before the event date',
      });
    }
  });