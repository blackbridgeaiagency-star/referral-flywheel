// components/pwa/InstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { X, Download, Smartphone, Bell, Wifi, Share2 } from 'lucide-react';
import { usePWA } from '../../lib/pwa/pwa-manager';

export default function InstallPrompt() {
  const {
    installState,
    pushState,
    isOnline,
    updateAvailable,
    installPWA,
    requestPushPermission,
    updateApp,
  } = usePWA();

  const [showPrompt, setShowPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Show install prompt after user has engaged with the app
    const hasInteracted = localStorage.getItem('user-interacted') === 'true';
    const promptDismissed = localStorage.getItem('install-prompt-dismissed');

    if (
      hasInteracted &&
      !promptDismissed &&
      installState.isInstallable &&
      !installState.isInstalled
    ) {
      setTimeout(() => setShowPrompt(true), 5000); // Show after 5 seconds
    }

    // Show notification prompt if installed but notifications not enabled
    if (
      installState.isInstalled &&
      pushState.isSupported &&
      pushState.permission === 'default'
    ) {
      setTimeout(() => setShowNotificationPrompt(true), 10000); // Show after 10 seconds
    }
  }, [installState, pushState]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShowPrompt(false);
      // Show notification prompt after install
      setTimeout(() => setShowNotificationPrompt(true), 3000);
    }
  };

  const handleEnableNotifications = async () => {
    const success = await requestPushPermission();
    if (success) {
      setShowNotificationPrompt(false);
    }
  };

  const dismissInstallPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  const dismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-lg flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>You're offline - working in offline mode</span>
        </div>
      </div>
    );
  }

  // Update available indicator
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5" />
            <div>
              <p className="font-medium">Update Available</p>
              <p className="text-sm opacity-90">A new version is ready</p>
            </div>
            <button
              onClick={updateApp}
              className="ml-4 px-3 py-1 bg-green-500/30 hover:bg-green-500/40 rounded transition"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Install prompt for iOS
  if (installState.isIOS && !installState.isStandalone && showPrompt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-md w-full p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Share2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Install Referral Flywheel</h3>
                <p className="text-sm text-gray-400">Add to your home screen</p>
              </div>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-3">To install this app on iOS:</p>
              <ol className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">1.</span>
                  <span className="text-gray-300 text-sm">
                    Tap the <Share2 className="inline w-4 h-4" /> share button in Safari
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">2.</span>
                  <span className="text-gray-300 text-sm">
                    Scroll down and tap "Add to Home Screen"
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span className="text-gray-300 text-sm">
                    Tap "Add" in the top right corner
                  </span>
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-800 rounded-lg p-3">
                <Smartphone className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Works offline</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <Bell className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Push alerts</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <Download className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Fast loading</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Install prompt for other browsers
  if (showPrompt && installState.isInstallable && !installState.isInstalled) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Download className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Install Referral Flywheel</h3>
              <p className="text-gray-400 text-sm mb-3">
                Install our app for the best experience with offline access and push notifications
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Install App
                </button>
                <button
                  onClick={dismissInstallPrompt}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Notification permission prompt
  if (showNotificationPrompt && pushState.isSupported && pushState.permission === 'default') {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Bell className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Enable Notifications</h3>
              <p className="text-gray-400 text-sm mb-3">
                Get instant alerts when you earn commissions or receive referrals
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Enable Notifications
                </button>
                <button
                  onClick={dismissNotificationPrompt}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissNotificationPrompt}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}