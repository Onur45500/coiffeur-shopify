import {z} from 'zod';

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const customerFormSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phone: z
    .string()
    .min(10, 'Téléphone invalide')
    .regex(/^[\d\s+()-]+$/, 'Téléphone invalide'),
  notes: z.string().max(500).optional(),
  smsConsent: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
});

export const createBookingSchema = z.object({
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  notes: z.string().max(500).optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const staffFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  bio: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const salonSettingsSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  bufferBeforeMinutes: z.coerce.number().min(0).max(120),
  bufferAfterMinutes: z.coerce.number().min(0).max(120),
  minNoticeHours: z.coerce.number().min(0).max(72),
  maxBookingDaysAhead: z.coerce.number().min(1).max(365),
  depositPercent: z.coerce.number().min(0).max(100),
  slotIntervalMinutes: z.coerce.number().min(5).max(60),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type CreateBookingData = z.infer<typeof createBookingSchema>;
