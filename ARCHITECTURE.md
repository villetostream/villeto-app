# Villeto App — Clean Architecture

## Problem with the original structure

The codebase was organised by **technical layer** rather than by **domain feature**:

```
src/
├── components/   # all UI — primitives alongside complex feature pages
├── queries/      # all API calls — auth next to procurement
├── stores/       # all Zustand state — 7 unrelated stores in one folder
├── hooks/        # all custom hooks
└── lib/          # catch-all: constants, schemas, types, utils, query config
```

Consequences:
- Adding or changing one feature requires edits across 5+ directories
- `interface Response { ... }` was copy-pasted into every single query file
- Types lived wherever they were first needed (`User` in `auth-stores.ts`, `AppUser` in `queries/departments/`)
- The auth permission system was split between `stores/auth-stores.ts` and `core/permissions/`
- No enforced boundary between "shared cross-feature code" and "feature-specific code"

---

## New structure — Feature-Sliced Design (FSD) for Next.js

```
src/
├── app/                          # Next.js App Router — routing only (thin layer)
│   ├── (dashboard)/
│   │   ├── expenses/
│   │   ├── people/
│   │   ├── procurement/
│   │   └── ...
│   ├── auth/
│   ├── pre-onboarding/
│   ├── layout.tsx
│   └── page.tsx
│
├── features/                     # Self-contained domain modules
│   │
│   ├── auth/                     # Everything the auth domain owns
│   │   ├── components/           # LoginForm, ForgotPasswordForm, InvitationFlow
│   │   ├── queries/
│   │   │   ├── login.ts          # useLogin
│   │   │   ├── check.ts          # useAuthCheck (/users/me)
│   │   │   ├── logout.ts         # useLogout
│   │   │   ├── permissions.ts    # useAuthPermissions
│   │   │   └── index.ts          # barrel export
│   │   ├── store/
│   │   │   └── index.ts          # useAuthStore, useCan, useUserRole
│   │   ├── schemas/
│   │   │   └── index.ts          # loginSchema, passwordResetSchema
│   │   └── types.ts              # User, CompanyPermission, AuthState
│   │
│   ├── people/                   # Users + departments + roles (same domain)
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── index.ts          # useInviteBeneficialOwners, department hooks
│   │   ├── queries/
│   │   │   ├── users.ts          # useGetAllUsersApi, useGetInvitedUsersApi, etc.
│   │   │   ├── departments.ts    # useGetAllDepartments, useCreateDepartment, etc.
│   │   │   ├── roles.ts          # useGetAllRoles, useGetRoleDetail, etc.
│   │   │   └── index.ts
│   │   └── types.ts              # AppUser, Department, Role, Meta
│   │
│   ├── expenses/
│   │   ├── components/
│   │   ├── queries/
│   │   │   ├── reports.ts
│   │   │   ├── categories.ts
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   └── types.ts
│   │
│   ├── onboarding/
│   │   ├── components/
│   │   ├── queries/
│   │   ├── store/                # useOnboardingStore (moved from stores/)
│   │   ├── schemas/
│   │   └── types.ts
│   │
│   ├── procurement/
│   │   ├── components/
│   │   ├── queries/
│   │   │   ├── purchase-requests.ts
│   │   │   ├── purchase-orders.ts
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   └── types.ts
│   │
│   ├── vendors/
│   ├── policies/
│   ├── settings/
│   └── notifications/
│
├── shared/                       # Code used by 2+ features — strict boundary
│   │
│   ├── components/
│   │   ├── ui/                   # Shadcn/Radix primitives (unchanged)
│   │   ├── data-table/           # Generic reusable DataTable + useDataTable
│   │   ├── form-fields/          # FormFieldInput, FormFieldSelect, etc.
│   │   ├── permissions/          # <PermissionGuard resource action />
│   │   └── common/               # PageLoader, tour guides, chat portal
│   │
│   ├── hooks/
│   │   ├── useAxios.ts           # Axios instance with auth + error interceptors
│   │   ├── useModal.ts
│   │   └── use-mobile.ts
│   │
│   ├── stores/                   # Global cross-feature state only
│   │   ├── useDateFilterStore.ts
│   │   ├── useHeaderActionStore.ts
│   │   ├── useChatStore.ts
│   │   └── useTourStore.ts
│   │
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── QueryClientProvider.tsx
│   │
│   ├── lib/
│   │   ├── query/
│   │   │   ├── client.ts         # createQueryClient() with defaults
│   │   │   └── keys.ts           # Typed query key registry (feature-scoped)
│   │   ├── utils/                # cn(), formatCurrency, exportCSV, countries
│   │   └── constants/            # Non-feature app-wide constants
│   │
│   └── types/
│       ├── api.ts                # ApiResponse<T>, Meta, ApiError (single source of truth)
│       └── common.ts             # Shared utility types
│
└── core/                         # Infrastructure with no UI, no feature concept
    └── permissions/
        ├── buildPermissionSets.ts   # Pure function — builds O(1) lookup Sets
        └── types.ts                 # CompanyPermission interface
```

---

## Layer rules (enforced by convention, enforced by ESLint import/no-restricted-paths)

| Layer | Can import from | Cannot import from |
|---|---|---|
| `app/` | `features/`, `shared/`, `core/` | — |
| `features/X/` | `shared/`, `core/` | other `features/Y/` |
| `shared/` | `core/` | `features/` |
| `core/` | nothing internal | everywhere |

Features **never import from each other**. If two features need a common type, it moves to `shared/types/`.

---

## Key improvements

### 1. Single shared `ApiResponse<T>` type

**Before** — every query file redeclared the same interface:
```ts
// queries/users/get-all-users.ts
interface Response {
    data: AppUser[]
    meta: Meta;
    error: { error: string; message?: string; success: boolean; };
    message: string;
    status: number;
    statusCode: number;
    statusText: string;
}
```

**After** — one canonical type in `shared/types/api.ts`:
```ts
export interface ApiResponse<T> {
    data: T;
    meta?: Meta;
    message: string;
    status: number;
    statusCode: number;
    statusText: string;
    error?: ApiError;
}
```

### 2. Features own their types

**Before:**
- `User` lived in `stores/auth-stores.ts`
- `AppUser` lived in `queries/departments/get-all-departments.ts`
- `Department` lived in `queries/departments/get-all-departments.ts`
- `Role` lived in `queries/role/get-all-roles.ts`
- `Meta` was copy-pasted into at least 3 query files

**After:**
- `User`, `CompanyPermission` → `features/auth/types.ts`
- `AppUser`, `Department`, `Role`, `Meta` → `features/people/types.ts`
- `ApiResponse<T>`, `ApiError`, `Meta` → `shared/types/api.ts`

### 3. Permission infrastructure extracted to `core/`

`buildPermissionSets()` is a pure function with no React dependency. It belongs in `core/permissions/`, not embedded in the Zustand store definition.

### 4. Feature-scoped query keys

**Before:**
```ts
// lib/constants/api-query-key.ts — flat global object
export const QUERY_KEYS = {
    DEPARTMENTS: "all-departments",
    ROLES: "roles",
    USERS: "users",
    ...
}
```

**After:**
```ts
// shared/lib/query/keys.ts — namespaced by feature
export const QUERY_KEYS = {
    auth:       { permissions: ['auth', 'permissions'] as const },
    people: {
        users:        (filters?: UserFilters) => ['people', 'users', filters] as const,
        departments:  ['people', 'departments'] as const,
        roles:        ['people', 'roles'] as const,
    },
    expenses:   { reports: ['expenses', 'reports'] as const },
    procurement: { purchaseRequests: ['procurement', 'purchase-requests'] as const },
} as const;
```

Array-form keys enable React Query's hierarchical invalidation:
```ts
// Invalidate all people data
queryClient.invalidateQueries({ queryKey: ['people'] });
```

---

## Migration path (incremental — no big bang)

1. Create `shared/types/api.ts` — replace inline `Response` interfaces one file at a time
2. Create `features/auth/` — move auth store + queries + schemas
3. Create `features/people/` — move users/departments/roles queries + types
4. Work outward feature by feature
5. Update `tsconfig.json` path aliases after all files are moved
6. Delete empty original directories

At each step the app remains functional — old and new paths coexist via tsconfig aliases.
