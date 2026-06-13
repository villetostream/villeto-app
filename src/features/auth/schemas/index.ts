/**
 * Auth domain validation schemas.
 * Previously in src/lib/schemas/schemas.ts alongside unrelated schemas.
 */

import { z } from 'zod';

export const loginSchema = z.object({
    email: z.email(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password must be less than 100 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

export const emailSchema = z.object({
    email: z
        .string()
        .email('Please enter a valid email address')
        .min(1, 'Email is required'),
});

export const passwordResetInitiateSchema = emailSchema;

export const passwordResetCompleteSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[a-z]/, 'Must contain a lowercase letter')
            .regex(/[A-Z]/, 'Must contain an uppercase letter')
            .regex(/[0-9]/, 'Must contain a number')
            .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export type LoginFormData = z.infer<typeof loginSchema>;
export type PasswordResetCompleteData = z.infer<typeof passwordResetCompleteSchema>;
