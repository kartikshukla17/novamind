/**
 * Capacitor Initialization
 * Sets up native plugins and event listeners
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Initialize Capacitor plugins and native features
 * Call this in your root layout or _app file
 */
export async function initializeCapacitor() {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Configure Status Bar
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });

      // On Android, set status bar color
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#000000' });
      }
    }

    // Hide splash screen after app is ready
    if (Capacitor.isPluginAvailable('SplashScreen')) {
      await SplashScreen.hide();
    }

    // Listen for app state changes
    if (Capacitor.isPluginAvailable('App')) {
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active:', isActive);

        // You can add logic here for when app comes to foreground/background
        // For example: refresh data, pause/resume operations, etc.
      });

      // Listen for deep links
      App.addListener('appUrlOpen', (data) => {
        console.log('App opened with URL:', data.url);

        // Handle deep links here
        // Example: novamind://boards/123
        const url = new URL(data.url);
        const path = url.pathname;

        // Navigate to the path using your router
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      });

      // Handle back button on Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
    }

    console.log('✅ Capacitor initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Capacitor:', error);
  }
}

/**
 * Check if a specific plugin is available
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Show the splash screen (useful for loading states)
 */
export async function showSplash() {
  if (Capacitor.isPluginAvailable('SplashScreen')) {
    await SplashScreen.show({
      showDuration: 2000,
      autoHide: true,
    });
  }
}

/**
 * Hide the splash screen
 */
export async function hideSplash() {
  if (Capacitor.isPluginAvailable('SplashScreen')) {
    await SplashScreen.hide();
  }
}

/**
 * Update status bar style based on theme
 */
export async function updateStatusBarStyle(theme: 'light' | 'dark') {
  if (!Capacitor.isPluginAvailable('StatusBar')) {
    return;
  }

  const style = theme === 'dark' ? Style.Dark : Style.Light;
  await StatusBar.setStyle({ style });

  // On Android, also update the background color
  if (Capacitor.getPlatform() === 'android') {
    const color = theme === 'dark' ? '#000000' : '#ffffff';
    await StatusBar.setBackgroundColor({ color });
  }
}
