/**
 * Compatibility export while callers move to the auth feature boundary.
 * There is intentionally only one Zustand authorization store.
 */
export {
    useAuthStore,
    useCan,
    useCanPermission,
    useCapabilityScopes,
    useUserRole,
} from '@/stores/auth-stores';
export type {
    AuthorizationCapabilityGrant,
    AuthorizationSnapshot,
    CapabilityScopeType,
    User,
} from '@/stores/auth-stores';
