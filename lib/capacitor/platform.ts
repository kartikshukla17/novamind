/**
 * Capacitor Platform Detection and Utilities
 * Use these helpers to detect the platform and adjust behavior accordingly
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if app is running in Capacitor (native mobile)
 */
export function isCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running in web browser
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/**
 * Get current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Get the base URL for API calls
 * In Capacitor, always use absolute URLs
 */
export function getBaseURL(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  // Client-side
  if (isCapacitor()) {
    // In Capacitor, use the production URL or configured API URL
    return process.env.NEXT_PUBLIC_APP_URL || 'https://your-app-domain.com';
  }

  // In browser, can use relative URLs or current origin
  return window.location.origin;
}

/**
 * Convert a relative URL to absolute if needed
 */
export function toAbsoluteURL(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseURL = getBaseURL();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseURL}${cleanPath}`;
}

/**
 * Check if device has safe area insets (notch, etc.)
 */
export function hasSafeArea(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for iPhone X and newer (notch)
  const isIPhoneX = /iPhone/.test(navigator.userAgent) && window.screen.height >= 812;

  return isCapacitor() && (isIOS() || isIPhoneX);
}

/**
 * Get safe area padding for CSS
 */
export function getSafeAreaInsets() {
  if (!hasSafeArea()) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }

  return {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  };
}
