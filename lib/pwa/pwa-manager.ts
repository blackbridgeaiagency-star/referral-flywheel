// lib/pwa/pwa-manager.ts
import { useState, useEffect } from 'react';

/**
 * PWA installation state
 */
export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  deferredPrompt: any;
}

/**
 * Push notification state
 */
export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
}

/**
 * PWA Manager Hook
 */
export function usePWA() {
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isStandalone: false,
    deferredPrompt: null,
  });

  const [pushState, setPushState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    subscription: null,
  });

  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if running as standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Check if already installed
    const isInstalled = localStorage.getItem('pwa-installed') === 'true';

    setInstallState(prev => ({
      ...prev,
      isStandalone,
      isIOS,
      isInstalled: isInstalled || isStandalone,
    }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e,
      }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true');
      setInstallState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check push notification support
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));

      // Get existing subscription
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setPushState(prev => ({
            ...prev,
            subscription,
          }));
        });
      });
    }

    // Network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Install PWA
   */
  const installPWA = async () => {
    if (!installState.deferredPrompt) {
      if (installState.isIOS) {
        // Show iOS install instructions
        alert('To install this app on iOS:\n1. Tap the share button\n2. Select "Add to Home Screen"');
      }
      return false;
    }

    try {
      installState.deferredPrompt.prompt();
      const { outcome } = await installState.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installed');
        return true;
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    }

    return false;
  };

  /**
   * Request push notification permission
   */
  const requestPushPermission = async () => {
    if (!pushState.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushState(prev => ({
        ...prev,
        permission,
      }));

      if (permission === 'granted') {
        // Subscribe to push notifications
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
          ),
        });

        setPushState(prev => ({
          ...prev,
          subscription,
        }));

        // Send subscription to server
        await saveSubscription(subscription);
        return true;
      }
    } catch (error) {
      console.error('Failed to request push permission:', error);
    }

    return false;
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribePush = async () => {
    if (!pushState.subscription) return false;

    try {
      await pushState.subscription.unsubscribe();
      await removeSubscription(pushState.subscription);

      setPushState(prev => ({
        ...prev,
        subscription: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  };

  /**
   * Update app to latest version
   */
  const updateApp = () => {
    if (updateAvailable) {
      window.location.reload();
    }
  };

  return {
    installState,
    pushState,
    isOnline,
    updateAvailable,
    installPWA,
    requestPushPermission,
    unsubscribePush,
    updateApp,
  };
}

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered:', registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

/**
 * Send push notification
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        notification: {
          title,
          body,
          data,
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

/**
 * Save subscription to server
 */
async function saveSubscription(subscription: PushSubscription) {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error('Failed to save subscription:', error);
  }
}

/**
 * Remove subscription from server
 */
async function removeSubscription(subscription: PushSubscription) {
  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error('Failed to remove subscription:', error);
  }
}

/**
 * Convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if app needs update
 */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return true;
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }

  return false;
}

/**
 * Get device info for analytics
 */
export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  // Detect OS
  let os = 'Unknown';
  if (/Win/i.test(platform)) os = 'Windows';
  else if (/Mac/i.test(platform)) os = 'macOS';
  else if (/Linux/i.test(platform)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';

  // Detect browser
  let browser = 'Unknown';
  if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) browser = 'Chrome';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Edge/i.test(userAgent)) browser = 'Edge';

  return {
    isMobile,
    isTablet,
    isDesktop,
    os,
    browser,
    platform,
    userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}