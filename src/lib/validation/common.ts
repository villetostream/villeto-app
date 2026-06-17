import { z } from "zod";

/**
 * Shared validation primitives.
 * ───────────────────────────────────────────────────────────
 * Villeto's schemas.ts previously redefined email/password rules
 * inline per-schema (e.g. loginSchema's password regex chain vs.
 * registrationSchema having none at all). Centralising them here
 * means a future password-policy change happens in one place
 * instead of N places, and prevents the two schemas from silently
 * drifting apart the way they already had.
 */

// Trimmed + lowercased: prevents "Foo@Bar.com " (trailing space from
// copy-paste, mixed case) from passing validation but then failing
// an exact-match lookup or duplicate-account check on the backend.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(100, "Password must be less than 100 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

// Login intentionally does NOT re-validate password strength — a user
// with a pre-existing weak/legacy password must still be able to log
// in. Only require that something was typed.
export const loginPasswordSchema = z.string().min(1, "Password is required");

export const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be less than 100 characters`)
    .regex(/^[a-zA-Z\s'-]+$/, `${label} can only contain letters, spaces, hyphens, and apostrophes`);

export const firstNameSchema = nameSchema("First name");
export const lastNameSchema = nameSchema("Last name");

// E.164-ish: + followed by 7-15 digits. Intentionally permissive on
// formatting (no enforced spacing) since input is normalised before
// submission, but does reject obviously-malformed input like letters
// or a bare "0".
export const phoneNumberSchema = z
  .string()
  .trim()
  .min(7, "Please enter a valid phone number")
  .regex(/^\+?[0-9\s-]{7,20}$/, "Please enter a valid phone number");

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && !formatted[path]) {
      formatted[path] = issue.message;
    }
  }
  return formatted;
}
