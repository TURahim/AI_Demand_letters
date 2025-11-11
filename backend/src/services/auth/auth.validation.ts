import { z } from 'zod';

// Registration schema
export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    firmId: z.string().uuid('Invalid firm ID').optional(),
    firmName: z
      .string()
      .min(1, 'Firm name is required')
      .max(120, 'Firm name must be less than 120 characters')
      .optional(),
    role: z.enum(['ADMIN', 'PARTNER', 'ASSOCIATE', 'PARALEGAL']).optional(),
  })
  .refine(
    (data) => data.firmId || data.firmName,
    'Firm ID or firm name is required'
  );

export type RegisterInput = z.infer<typeof registerSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Refresh token schema
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return schema.parse(data);
  };
}

