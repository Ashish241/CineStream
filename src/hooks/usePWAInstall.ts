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
   * Generates and downloads a standalone launcher file for Airtel Xstream Box, Smart TV, or Mobile
   * that opens the production portal in full-screen TV/App mode with zero configuration.
   */
  const downloadLauncherPackage = useCallback((target: 'tv' | 'mobile') => {
    const appOrigin = window.location.origin;
    const launchUrl = target === 'tv' ? `${appOrigin}/?tv=1` : appOrigin;
    const fileName =
      target === 'tv'
        ? 'CineStream-Airtel-Xstream-TV-App.html'
        : 'CineStream-Mobile-App-Launcher.html';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#020617" />
  <title>CineStream ${target === 'tv' ? 'Smart TV & Airtel Xstream App' : 'Mobile App'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .loader { text-align: center; padding: 24px; max-width: 480px; }
    .logo { width: 72px; height: 72px; border-radius: 20px; background: linear-gradient(135deg, #f59e0b, #fbbf24); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; color: #020617; font-weight: 900; box-shadow: 0 12px 32px rgba(245, 158, 11, 0.35); }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    p { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .btn { display: inline-block; background: #f59e0b; color: #020617; font-weight: 800; padding: 14px 28px; border-radius: 14px; text-decoration: none; font-size: 15px; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3); }
    .btn:focus, .btn:hover { outline: 4px solid #fde68a; transform: scale(1.04); }
  </style>
  <script>
    window.onload = function() {
      try {
        localStorage.setItem('cinestream_tv_mode', '${target === 'tv' ? 'true' : 'false'}');
      } catch(e) {}
      setTimeout(function() {
        window.location.replace("${launchUrl}");
      }, 600);
    };
  </script>
</head>
<body>
  <div class="loader">
    <div class="logo">▶</div>
    <h1>CineStream ${target === 'tv' ? 'Smart TV & Airtel Xstream' : 'Mobile HD'}</h1>
    <p>Launching 1080p Full HD Streaming App (${target === 'tv' ? 'Airtel Xstream Box & Android TV Mode' : 'Mobile Standalone Mode'})...</p>
    <a class="btn" href="${launchUrl}" autofocus>Launch CineStream Now</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
