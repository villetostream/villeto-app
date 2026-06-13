import { z } from 'zod';
import { logger } from '@/lib/logger';

// Cookie expiration: 3 days in milliseconds
const COOKIE_EXPIRATION_MS = 3 * 24 * 60 * 60 * 1000;

// Generic cookie data schema for validation
const CookieDataSchema = z.unknown();

export interface CookieOptions {
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Sets a cookie with proper encoding and expiration
 */
export function setCookie(name: string, value: unknown, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  try {
    // Validate the data structure
    CookieDataSchema.parse(value);

    const encodedValue = encodeURIComponent(JSON.stringify(value));
    const expires = options.expires || new Date(Date.now() + COOKIE_EXPIRATION_MS);

    let cookieString = `${name}=${encodedValue}; expires=${expires.toUTCString()}; path=${options.path || '/'}`;

    if (options.domain) cookieString += `; domain=${options.domain}`;
    if (options.secure) cookieString += '; secure';
    if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;

    document.cookie = cookieString;
  } catch (error) {
    logger.error('Failed to set cookie:', error);
  }
}

/**
 * Gets a cookie value with proper decoding and validation
 */
export function getCookie<T = unknown>(name: string): T | null {
  if (typeof document === 'undefined') return null;
  try {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const encodedValue = c.substring(nameEQ.length, c.length);
        const decodedValue = decodeURIComponent(encodedValue);
        const parsedValue = JSON.parse(decodedValue);

        // Validate the parsed data
        CookieDataSchema.parse(parsedValue);

        return parsedValue as T;
      }
    }
    return null;
  } catch (error) {
    logger.error('Failed to get cookie:', error);
    // If parsing fails, remove the corrupted cookie
    removeCookie(name);
    return null;
  }
}

/**
 * Removes a cookie
 */
export function removeCookie(name: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(0); // Set to past date to expire immediately
  let cookieString = `${name}=; expires=${expires.toUTCString()}; path=${options.path || '/'}`;

  if (options.domain) cookieString += `; domain=${options.domain}`;

  document.cookie = cookieString;
}

/**
 * Checks if a cookie exists and is not expired
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Clears all onboarding-related cookies
 */
export function clearOnboardingCookies(): void {
  const onboardingCookies = [
    'onboarding_business',
    'onboarding_leadership',
    'onboarding_financial',
    'onboarding_products',
    'onboarding_step',
    "onboarding_id",
    "contactEmail",
    "preOnboarding"
  ];

  onboardingCookies.forEach(cookieName => {
    removeCookie(cookieName);
  });
}