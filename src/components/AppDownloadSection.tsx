import React, { useState } from 'react';
import {
  Tv,
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Monitor,
  Wifi,
  Mic,
  Gamepad2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AppDownloadSectionProps {
  isTvMode: boolean;
  onEnableTvMode: () => void;
  compact?: boolean;
}

export const AppDownloadSection: React.FC<AppDownloadSectionProps> = ({
  isTvMode,
  onEnableTvMode,
  compact = false,
}) => {
  const {
    isInstalled,
    isIOS,
    isAndroidTV,
    installApp,
    downloadLauncherPackage,
  } = usePWAInstall();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cinestream.vercel.app';
  const tvDirectUrl = `${appUrl}/?tv=1`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    tvDirectUrl
  )}`;

  const handleCopyTvUrl = () => {
    try {
      navigator.clipboard.writeText(tvDirectUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleInstallTvApp = async () => {
    if (!isTvMode) {
      onEnableTvMode();
    }
    const result = await installApp();
    if (result === 'accepted') {
      setDownloadStatus('CineStream TV App installed successfully on your device!');
    } else {
      downloadLauncherPackage('tv');
      setDownloadStatus(
        'Downloaded CineStream Airtel Xstream TV App Launcher! Open it to launch full-screen TV Mode anytime.'
      );
    }
    setTimeout(() => setDownloadStatus(null), 6000);
  };

  const handleInstallMobileApp = async () => {
    const result = await installApp();
    if (result === 'accepted') {
      setDownloadStatus('CineStream Mobile App installed to your Home Screen!');
    } else if (isIOS) {
      setDownloadStatus(
        'On iPhone/iPad: Tap the Safari Share button below and select "Add to Home Screen" to install.'
      );
    } else {
      downloadLauncherPackage('mobile');
      setDownloadStatus(
        'Mobile App Launcher downloaded! You can also tap your browser menu (⋮) -> "Install App" or "Add to Home screen".'
      );
    }
    setTimeout(() => setDownloadStatus(null), 6000);
  };

  return (
    <section
      aria-label="Download TV and Mobile App"
      className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 ${compact ? 'py-6' : 'py-8'} space-y-6`}
    >
      {/* Hero Banner Header for App Downloads */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/30 border border-amber-500/30 p-5 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Official TV & Mobile Apps · Airtel Xstream Box Certified</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              Install CineStream on Airtel Xstream Box, Smart TV & Phone
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience 1080p Full HD movies, web series, live OTT hubs, and Indian TV serials on your{' '}
              <strong className="text-amber-300">Airtel Xstream Box</strong>, Android TV, Fire TV Stick, or Smartphone with full D-Pad Remote & Hindi/English Voice Search support.
            </p>

            {isAndroidTV && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Smart TV / Set-Top Box Detected — Airtel Xstream Remote Mode Ready!</span>
              </div>
            )}
          </div>

          {/* QR Code for Instant TV Pairing / Opening */}
          <div className="flex items-center gap-4 bg-slate-950/90 border border-slate-800 p-4 rounded-2xl shrink-0 self-start lg:self-center">
            <img
              src={qrCodeImageUrl}
              alt="Scan QR to open on TV or Mobile"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white p-1.5 shrink-0"
            />
            <div className="space-y-1.5 max-w-[200px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Scan for Instant App
              </span>
              <p className="text-xs text-slate-300 leading-snug">
                Scan with your phone camera or open this link on your Airtel Xstream Box browser:
              </p>
              <button
                onClick={handleCopyTvUrl}
                data-tv-nav="true"
                className="tv-focus flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono border border-slate-700 w-full justify-center"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied TV URL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="truncate">Copy TV Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Feedback Toast */}
        {downloadStatus && (
          <div className="mt-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{downloadStatus}</span>
          </div>
        )}

        {/* Download Cards Grid: 1. Airtel Xstream / Smart TV App, 2. Mobile App (Android/iOS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          {/* Card 1: Airtel Xstream Box & Android Smart TV App */}
          <div className="rounded-2xl bg-slate-950/90 border border-amber-500/30 p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Tv className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      For Set-Top Box & Smart TV
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                      Airtel Xstream Box & Android TV App
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold shrink-0">
                  v2.6 TV Ready
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Specially engineered for <strong>Airtel Xstream Box</strong>, Jio Set-Top Box, Sony Bravia, LG, Samsung & Mi TV. Supports Airtel Remote D-Pad arrows, OK/Enter button, Back button, Channel Up/Down episode switching, and Voice Remote mic.
              </p>

              {/* TV Feature Checkmarks */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Airtel Remote D-Pad Nav</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Hindi & English Voice Search</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Full-Screen 1080p Theater</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Zero Ad-Popups on TV</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleInstallTvApp}
                  data-tv-nav="true"
                  className="tv-focus flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isInstalled ? 'Launch TV App Mode' : 'Download / Install Airtel Xstream TV App'}
                  </span>
                </button>

                <button
                  onClick={() => downloadLauncherPackage('tv')}
                  data-tv-nav="true"
                  className="tv-focus flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
                  title="Download standalone TV App Launcher file for Airtel Xstream Box"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>TV Launcher File</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (!isTvMode) onEnableTvMode();
                  setDownloadStatus('Airtel Xstream Box TV Mode is now ACTIVE! Use arrow keys / remote D-Pad.');
                  setTimeout(() => setDownloadStatus(null), 4000);
                }}
                data-tv-nav="true"
                className={`tv-focus w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  isTvMode
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <Tv className="w-4 h-4 text-amber-400" />
                <span>
                  {isTvMode
                    ? '✓ Airtel Xstream TV Mode Active on This Screen'
                    : 'Enable Airtel Xstream Box TV Mode Right Now'}
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Mobile App (Android APK/PWA & iPhone iOS) */}
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      For Android & iPhone / iPad
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                      CineStream Mobile App (Android & iOS)
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold shrink-0">
                  Lightweight & Fast
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Install the native-like Mobile App directly to your phone's home screen with <strong>zero storage bloat</strong>. Includes bottom thumb-navigation bar, instant episode switcher, auto-updating OTT catalog, and full-screen mobile landscape video player.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1-Tap Home Screen Icon</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full-Screen Touch Player</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Auto-Updates New Releases</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Works on Android & iOS</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleInstallMobileApp}
                  data-tv-nav="true"
                  className="tv-focus flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isInstalled ? 'Mobile App Installed ✓' : 'Install Mobile App (Android / iOS)'}
                  </span>
                </button>

                <button
                  onClick={() => downloadLauncherPackage('mobile')}
                  data-tv-nav="true"
                  className="tv-focus flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mobile Launcher</span>
                </button>
              </div>

              {isIOS ? (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 text-center">
                  <strong>iPhone / iPad Install:</strong> Tap Safari's <strong>Share</strong> icon at the bottom, then tap <strong>"Add to Home Screen"</strong>.
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-center">
                  Tap <strong>"Install Mobile App"</strong> above or open Chrome menu <strong>(⋮) → "Install app"</strong> to add CineStream to your phone app drawer.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Airtel Xstream Home Screen Icon & Native Android TV APK Setup */}
        <div className="mt-6 rounded-2xl bg-slate-950/90 border border-amber-500/40 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                <Wifi className="w-4 h-4" />
                <span>Airtel Xstream Home Page पे Netflix / Prime जैसा App Icon कैसे लाएं:</span>
              </div>
              <p className="text-xs text-slate-300">
                अपने Airtel Xstream Box की मुख्य होम स्क्रीन (Apps Row) पर <strong>CineStream TV</strong> का आइकॉन लगाने के लिए नीचे दिए गए किसी भी तरीके का उपयोग करें:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(tvDirectUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                data-tv-nav="true"
                className="tv-focus inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Build Native Android TV .APK</span>
              </a>

              <button
                onClick={() => {
                  if (!isTvMode) onEnableTvMode();
                  if (typeof document !== 'undefined' && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                  setDownloadStatus(
                    'Netflix / Prime Style Full-Screen TV App Mode Activated! Use Left Arrow for TV Sidebar.'
                  );
                }}
                data-tv-nav="true"
                className="tv-focus inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Launch Full-Screen Netflix/Prime TV UI</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-900/95 border border-amber-500/25 space-y-1.5">
              <div className="text-amber-400 font-extrabold flex items-center justify-between">
                <span>Method 1: JioPages / TV Bro (सबसे आसान)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                  1-Minute
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Airtel Xstream Box में <strong>JioPages</strong> या <strong>TV Bro</strong> खोलें → <code className="text-amber-300 font-mono">{tvDirectUrl}</code> खोलें → ऊपर <strong>"Add to Home Screen / Install App"</strong> दबाएं। आइकॉन सीधे TV होम स्क्रीन पर आ जाएगा!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/95 border border-amber-500/25 space-y-1.5">
              <div className="text-amber-400 font-extrabold flex items-center justify-between">
                <span>Method 2: Native .APK File (Apps Row Icon)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  Netflix Style
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                ऊपर <strong>"Build Native Android TV .APK"</strong> बटन पर क्लिक करके 1 क्लिक में <strong>CineStream.apk</strong> डाउनलोड करें (Android TV Leanback Banner सहित) और Pendrive / <em>Send Files to TV</em> ऐप से Airtel Box में Install कर लें।
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/95 border border-amber-500/25 space-y-1.5">
              <div className="text-amber-400 font-extrabold flex items-center justify-between">
                <span>Method 3: Airtel Remote Button Shortcut</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                  1-Button Launch
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Airtel Box के Play Store से <strong>tvQuickActions</strong> या <strong>Button Mapper</strong> डालें और रिमोट के किसी भी बटन या Home Tile पर <code className="text-amber-300 font-mono">{tvDirectUrl}</code> सेट करें — 1 बटन दबाते ही फुल-स्क्रीन OTT ऐप खुलेगा!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

