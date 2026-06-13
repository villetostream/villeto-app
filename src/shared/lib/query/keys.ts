/**
 * Feature-scoped query key registry.
 *
 * Rules:
 *  1. Keys are arrays — enables React Query's hierarchical cache invalidation.
 *  2. First element is always the feature name — `queryClient.invalidateQueries({ queryKey: ['people'] })`
 *     invalidates ALL people data at once.
 *  3. Factory functions (for keyed-by-id) return `as const` tuples for type safety.
 *
 * Previously: a flat string dictionary in src/lib/constants/api-query-key.ts
 */

export const QUERY_KEYS = {
    auth: {
        permissions: ['auth', 'permissions'] as const,
        me:          ['auth', 'me'] as const,
    },

    people: {
        users:          (filters?: Record<string, unknown>) =>
                            filters ? (['people', 'users', filters] as const) : (['people', 'users'] as const),
        invitedUsers:   ['people', 'users', 'invited'] as const,
        directoryUsers: ['people', 'users', 'directory'] as const,
        uninvitedUsers: ['people', 'users', 'uninvited'] as const,
        user:           (id: string) => ['people', 'users', id] as const,
        departments:    ['people', 'departments'] as const,
        department:     (id: string) => ['people', 'departments', id] as const,
        roles:          ['people', 'roles'] as const,
        role:           (id: string) => ['people', 'roles', id] as const,
    },

    expenses: {
        reports:     ['expenses', 'reports'] as const,
        report:      (id: string | number) => ['expenses', 'reports', id] as const,
        categories:  ['expenses', 'categories'] as const,
        policies:    ['expenses', 'policies'] as const,
        policy:      (id: string) => ['expenses', 'policies', id] as const,
    },

    procurement: {
        purchaseRequests: ['procurement', 'purchase-requests'] as const,
        purchaseRequest:  (id: string) => ['procurement', 'purchase-requests', id] as const,
        categories:       ['procurement', 'categories'] as const,
    },

    onboarding: {
        details: ['onboarding', 'details'] as const,
    },
} as const;
