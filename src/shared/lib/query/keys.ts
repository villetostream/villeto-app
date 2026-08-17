/**
 * Unified, feature-scoped query key registry.
 *
 * This is the **single source of truth** for all React Query cache keys
 * across the entire application.
 *
 * Rules:
 *  1. Keys are arrays — enables React Query's hierarchical cache invalidation.
 *  2. First element is always the feature name — e.g.
 *     `queryClient.invalidateQueries({ queryKey: ['people'] })`
 *     invalidates ALL people data at once.
 *  3. Factory functions (for keyed-by-id) return `as const` tuples for type safety.
 *
 * How to invalidate manually after a mutation:
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
 * This bypasses staleTime and triggers an immediate background refetch.
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
        user:           (id: string | number) => ['people', 'users', id] as const,
        departments:    ['people', 'departments'] as const,
        department:     (id: string | number) => ['people', 'departments', id] as const,
        roles:          ['people', 'roles'] as const,
        role:           (id: string | number) => ['people', 'roles', id] as const,
        roleCapabilities:     (mod: string) => ['people', 'roles', 'capabilities', mod] as const,
        roleCapabilitiesAll:  (mods: readonly string[]) => ['people', 'roles', 'capabilities', 'all', mods] as const,
    },

    expenses: {
        reports:        (scope: string) => ['expenses', 'reports', scope] as const,
        drafts:         ['expenses', 'drafts'] as const,
        report:         (id: string) => ['expenses', 'reports', id] as const,
        companyReports: ['expenses', 'company-reports'] as const,
        companyReport:  (id: string) => ['expenses', 'company-reports', id] as const,
        categories:     ['expenses', 'categories'] as const,
        category:       (id: string) => ['expenses', 'categories', id] as const,
        policies:       ['expenses', 'policies'] as const,
        policy:         (id: string) => ['expenses', 'policies', id] as const,
        policyDrafts:   ['expenses', 'policy-drafts'] as const,
        policyDraft:    (id: string) => ['expenses', 'policy-drafts', id] as const,
    },

    procurement: {
        purchaseRequests:  ['procurement', 'purchase-requests'] as const,
        purchaseRequest:   (id: string) => ['procurement', 'purchase-requests', id] as const,
        purchaseOrders:    ['procurement', 'purchase-orders'] as const,
        purchaseOrder:     (id: string) => ['procurement', 'purchase-orders', id] as const,
        categories:        ['procurement', 'categories'] as const,
        policies:          ['procurement', 'policies'] as const,
        policy:            (id: string) => ['procurement', 'policies', id] as const,
        invoices:          ['procurement', 'invoices'] as const,
    },

    vendors: {
        all:       (filters?: Record<string, unknown>) =>
                       filters ? (['vendors', filters] as const) : (['vendors'] as const),
        detail:    (id: string) => ['vendors', id] as const,
        approved:  ['vendors', { approvalStatus: 'approved' }] as const,
    },

    onboarding: {
        details:   (id?: string) => id ? ['onboarding', 'details', id] as const : ['onboarding', 'details'] as const,
    },

    legalEntities: ['legal-entities'] as const,
    currencies:    ['reference-currencies'] as const,

    billPay: {
        all:            ['bill-pay'] as const,
        requests:       (leId?: string) => ['bill-pay', 'requests', leId] as const,
        payments:       (leId?: string) => ['bill-pay', 'payments', leId] as const,
        funding:        (leId?: string) => ['bill-pay', 'funding', leId] as const,
        beneficiaries:  (leId?: string) => ['bill-pay', 'beneficiaries', leId] as const,
        bank:           (leId?: string) => ['bill-pay', 'bank', leId] as const,
    },

    accounting: {
        all:           ['accounting'] as const,
        accounts:      (leId?: string) => ['accounting', 'accounts', leId] as const,
        periods:       (leId?: string) => ['accounting', 'periods', leId] as const,
        journals:      (leId?: string) => ['accounting', 'journals', leId] as const,
        obligations:   (leId?: string) => ['accounting', 'obligations', leId] as const,
        trialBalance:  (leId?: string) => ['accounting', 'trial-balance', leId] as const,
    },

    policyGovernance: {
        all:              ['policy-governance', 'approval-settings'] as const,
        byTarget:         (target: string) => ['policy-governance', 'approval-settings', target] as const,
        eligibleRoles:    (target: string) => ['policy-governance', 'eligible-roles', target] as const,
    },
} as const;

