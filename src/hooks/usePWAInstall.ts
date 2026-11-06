import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroidTV, setIsAndroidTV] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS and Android TV / Airtel Xstream Box
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isTVDevice =
      /android tv|smarttv|googletv|crkey|aftb|aftm|aftt|xstream|airtel|bravia|philips|mibox|shield|tv/i.test(
        ua
      );

    setIsIOS(isIOSDevice);
    setIsAndroidTV(isTVDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'fallback'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return 'accepted';
        }
        return 'dismissed';
      } catch {
        return 'fallback';
      }
    }
    return 'fallback';
  }, [deferredPrompt]);

  /**
   * Directly downloads the real signed Android TV & Mobile APK package (CineStream-TV.apk / CineStream.apk)
   * that runs standalone in full-screen without any browser chrome on Airtel Xstream Box, Smart TV, or Android Phone.
   */
  const downloadLauncherPackage = useCallback((target: 'tv' | 'mobile') => {
    const apkHref = target === 'tv' ? '/CineStream-TV.apk' : '/CineStream.apk';
    const fileName = target === 'tv' ? 'CineStream-TV.apk' : 'CineStream.apk';

    const a = document.createElement('a');
    a.href = apkHref;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isAndroidTV,
    installApp,
    downloadLauncherPackage,
  };
}
