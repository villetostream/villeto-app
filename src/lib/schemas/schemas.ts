import z from "zod";
import {
  emailSchema as sharedEmailSchema,
  loginPasswordSchema,
  passwordSchema,
  firstNameSchema,
  lastNameSchema,
  formatZodErrors,
} from "@/lib/validation/common";

export { formatZodErrors };

// Kept as the original { email } object shape for backward
// compatibility with existing callers, but the inner string now
// goes through the shared, trimmed/lowercased email rule instead
// of redefining it locally.
export const emailSchema = z.object({
  email: sharedEmailSchema,
});

export const registrationSchema = z.object({
  // Previously z.string().min(1)/.max(100) only — accepted untrimmed
  // input and any character, including pure whitespace once trimmed.
  // Reusing the shared name schema also rejects digits/symbols in a
  // person's name, which the old schema silently allowed.
  contactFirstName: firstNameSchema,
  contactLastName: lastNameSchema,
  accountType: z.enum(["demo", "enterprise"] as const, {
    error: "Please select an account type",
  }),
  // Previously bare z.string() with no email format check at all —
  // any string, including an empty one, passed validation.
  contactEmail: sharedEmailSchema,
});

export const otpVerificationSchema = z.object({
  email: sharedEmailSchema,
  // Previously no .trim() — mobile autofill from SMS frequently
  // appends a trailing space to pasted codes, which silently failed
  // the .min(6)/.max(6) length check with no indication why.
  otp: z
    .string()
    .trim()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// Custom HTTP URL validator with optional protocol but required valid domain
const stripProtocol = (url: string) => {
  return url.replace(/^(https?:\/\/)?(www\.)?/, "");
};

export const customHttpUrlSchema = z
  .string()
  .optional()
  .refine((url) => {
    if (!url) return true; // Optional field, empty is valid

    // Basic length check
    if (url.length < 3) return false;

    // Reject if only protocol is provided
    if (url === "https://" || url === "http://") return false;

    try {
      // Add a protocol if missing to validate the URL
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      const parsedUrl = new URL(fullUrl);

      const hostname = parsedUrl.hostname;

      // Domain validation regex
      const domainRegex =
        /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

      // Remove www. if present for validation
      const domainToValidate = hostname.replace(/^www\./, "");

      // Validate the domain format
      if (!domainRegex.test(domainToValidate)) {
        return false;
      }

      // Additional check: domain should have at least one dot (except if it's localhost)
      if (!hostname.includes(".") && hostname !== "localhost") {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }, "Please enter a valid URL (e.g., example.com, www.example.com)")
  .transform((url) => {
    if (!url) return url;
    return stripProtocol(url);
  });

// Updated onboarding business schema using the custom validator
export const onboardingBusinessSchema = z.object({
  business_name: z
    .string()
    .min(1, "Company name is required")
    .min(2, "Must be at least 2 characters")
    .max(100)
    .optional(),
  contactPhone: z
    .string()
    .min(1, "Contact number is required")
    .min(12, "Contact number must be at least 12 characters"),
  countryOfRegistration: z.string().min(1, "Please select a country"),
  websiteUrl: customHttpUrlSchema,
  businessLogo: z.union([z.instanceof(File), z.string()]).optional(),
});

// Alternative version with more strict domain validation
export const strictCustomHttpUrlSchema = z
  .string()
  .optional()
  .refine((url) => {
    if (!url) return true;

    if (url === "https://" || url === "http://") return false;

    try {
      let hostname: string;

      try {
        const parsedWithProtocol = new URL(url);
        hostname = parsedWithProtocol.hostname;
      } catch {
        const parsedWithHttps = new URL(`https://${url}`);
        hostname = parsedWithHttps.hostname;
      }

      // Remove www. for validation
      const cleanHostname = hostname.replace(/^www\./, "");

      // Must have at least one dot and valid TLD
      if (!cleanHostname.includes(".") || cleanHostname.endsWith(".")) {
        return false;
      }

      // Check each part of the domain
      const parts = cleanHostname.split(".");
      if (parts.length < 2) return false;

      // Validate each part
      for (const part of parts) {
        if (part.length < 1 || part.length > 63) return false;
        if (!/^[a-zA-Z0-9-]+$/.test(part)) return false;
        if (part.startsWith("-") || part.endsWith("-")) return false;
      }

      // Last part (TLD) should be at least 2 characters
      const tld = parts[parts.length - 1];
      if (tld.length < 2) return false;

      return true;
    } catch {
      return false;
    }
  }, "Please enter a valid domain (e.g., example.com, sub.example.co.uk)")
  .transform((url) => {
    if (!url) return url;

    try {
      new URL(url);
      return url;
    } catch {
      return `https://${url}`;
    }
  });

// Shared name + email fields (no role)
const baseNameEmailSchema = z.object({
  firstName: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    ),
  lastName: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    ),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// Officers need a role; beneficial owners do not (they receive ORGANIZATION_OWNER via admin invite)
const baseSchema = baseNameEmailSchema.extend({
  role: z
    .string()
    .min(1, "Role is required")
    .min(2, "Role must be at least 2 characters")
    .max(50, "Role must be less than 50 characters"),
});

// Beneficial owner schema — no role field
const beneficialOwnerSchema = baseNameEmailSchema.extend({
  ownershipPercentage: z
    .number()
    .min(0, "Ownership cannot be negative")
    .max(25, "Ownership cannot exceed 25%"),
});

// Officer schema — includes role
const officerSchema = baseSchema.extend({
  ownershipPercentage: z
    .union([
      z
        .number()
        .min(0, "Ownership cannot be negative")
        .max(100, "Ownership cannot exceed 100%"),
      z.undefined(),
    ])
    .optional(),
});

// Function to get the appropriate schema
export const getFormSchema = (
  mode: "beneficial" | "officer",
  isOwner?: boolean
) => {
  const isBeneficialOwner = mode === "beneficial" || isOwner;
  return isBeneficialOwner ? beneficialOwnerSchema : officerSchema;
};

// Type inference
export type BeneficialOwnerFormData = z.infer<typeof beneficialOwnerSchema>;
export type OfficerFormData = z.infer<typeof officerSchema>;
export type LeadershipFormData = BeneficialOwnerFormData | OfficerFormData;

export const loginSchema = z.object({
  // Previously bare z.email() — accepted untrimmed input, and the
  // bug below mattered more here: login should never reject a
  // correctly-typed password just because it doesn't meet *current*
  // strength rules. A user's password was valid when they set it;
  // re-validating strength on every login would lock out anyone
  // whose account predates a policy change.
  email: sharedEmailSchema,
  password: loginPasswordSchema,
});

// Use this — not loginSchema — for any flow that is actually setting
// or changing a password (registration, reset, change-password).
export const newPasswordSchema = passwordSchema;

// department schema
export const createDepartmentSchema = z.object({
  // Previously z.string().min(1) — a value of "   " (spaces only)
  // passes .min(1) since length counts characters, not trimmed
  // length. .trim() first means a whitespace-only submission
  // correctly fails validation instead of saving a blank-looking
  // department name.
  departmentName: z.string().trim().min(1, "Department name is required"),
  departmentCode: z.string().trim().optional(),
  departmentManager: z.string().optional(),
  reportsTo: z.string().optional(),
  status: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (val === "false") return false;
      return true; // default to true for any other string
    })
    .default(true),
  description: z.string().trim().min(1, "Description is required"),
  id: z.string().optional().nullable(),
});

//role schema

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  description: z.string().trim().optional(),
  isActive: z.boolean(),
  permissionIds: z.array(z.string()).default([]),
});

export type RoleFormData = z.infer<typeof roleSchema>;

export const userSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: sharedEmailSchema,
  phone: z.string().trim().optional(),
  location: z.string().trim().min(1, "Location is required"),
  cardIssued: z.boolean(),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  // Previously z.string().uuid(...) with no .optional() — this made
  // it impossible to invite a user before a department exists for
  // them, even though the product flow (invite -> assign department
  // later) explicitly supports that. An empty string from an
  // unselected dropdown would also fail the .uuid() check with a
  // confusing "Invalid department ID" message instead of "required".
  departmentId: z.string().uuid("Invalid department ID").optional(),
  roleId: z.string().min(1, "Role is required"),
  id: z.string().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;
