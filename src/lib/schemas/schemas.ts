import z from "zod";

export const emailSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
});

export const registrationSchema = z.object({
  contactFirstName: z.string().min(1, "First name is required").max(100),
  contactLastName: z.string().min(1, "Last name is required").max(100),
  accountType: z.enum(["demo", "enterprise"] as const, {
    error: "Please select an account type",
  }),
  contactEmail: z.string(),
});

export const otpVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
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
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password must be less than 100 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character"
    ),
});

// department schema
export const createDepartmentSchema = z.object({
  departmentName: z.string().min(1, "Department name is required"),
  departmentCode: z.string().optional(),
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
  description: z.string().min(1, "Description is required"),
  id: z.string().optional().nullable(),
});

//role schema

export const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  permissionIds: z.array(z.string()).default([]),
});

export type RoleFormData = z.infer<typeof roleSchema>;

export const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  cardIssued: z.boolean(),
  jobTitle: z.string().min(1, "Job title is required"),
  departmentId: z.string().uuid("Invalid department ID"),
  roleId: z.string().min(1, "Role is required"),
  id: z.string().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;
