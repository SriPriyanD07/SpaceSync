import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  role: z.enum(['member', 'admin']).optional().default('member'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const resourceTypeEnum = z.enum([
  'meeting_room',
  'conference_room',
  'training_room',
  'projector',
  'workstation',
  'lab_equipment',
  'study_space',
]);

export const resourceStatusEnum = z.enum(['active', 'maintenance', 'inactive']);

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  type: resourceTypeEnum,
  location: z.string().min(2, 'Location must be at least 2 characters').max(150),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  description: z.string().optional().default(''),
  status: resourceStatusEnum.optional().default('active'),
});

export const updateResourceSchema = createResourceSchema.partial();

export const createBookingSchema = z.object({
  resource_id: z.string().uuid('Invalid resource ID format'),
  start_time: z.string().datetime({ message: 'Invalid start time format (ISO 8601 expected)' }),
  end_time: z.string().datetime({ message: 'Invalid end time format (ISO 8601 expected)' }),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters').max(500),
}).refine((data) => {
  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
});
