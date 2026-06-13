/**
 * Utilities for detecting and categorising well-known API error conditions.
 */

import type { AxiosError } from 'axios';

// ─── Connection Pool ──────────────────────────────────────────────────────────

/**
 * pgBouncer session-mode pool exhaustion.
 * Signature: "(EMAXCONNSESSION) max clients reached in session mode"
 */
export function isConnectionPoolError(error: unknown): boolean {
    const message = extractMessage(error);
    return message.includes('EMAXCONNSESSION') || message.includes('max clients reached');
}

/** User-visible replacement for the raw pgBouncer message. */
export const CONNECTION_POOL_MESSAGE =
    'The server is momentarily busy. Retrying automatically…';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMessage(error: unknown): string {
    if (!error || typeof error !== 'object') return '';
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return (
        axiosError.response?.data?.message ??
        axiosError.response?.data?.error ??
        (axiosError as { message?: string }).message ??
        ''
    );
}

/**
 * True for transient server errors that are safe to retry:
 * connection pool exhaustion, 503 Service Unavailable, 429 Too Many Requests.
 */
export function isRetryableError(error: unknown): boolean {
    if (isConnectionPoolError(error)) return true;
    const status = (error as AxiosError)?.response?.status;
    return status === 503 || status === 429;
}
