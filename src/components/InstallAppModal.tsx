import React, { useState } from 'react';
import {
  X,
  Download,
  Tv,
  Smartphone,
  Monitor,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTvMode: boolean;
  onEnableTvMode: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  isTvMode,
  onEnableTvMode,
}) => {
  const { isInstalled, installApp, downloadLauncherPackage } = usePWAInstall();

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tv' | 'mobile'>('tv');

  if (!isOpen) return null;

  const appOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-oti3wuvopqhdn4mihxourq-338770488864.asia-southeast1.run.app';
  const tvDirectUrl = `${appOrigin}/?tv=1`;
  const apkDirectUrl = `${appOrigin}/CineStream-TV.apk`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    apkDirectUrl
  )}`;

  const handleDownloadApk = (mode: 'tv' | 'mobile') => {
    if (mode === 'tv' && !isTvMode) {
      onEnableTvMode();
    }
    downloadLauncherPackage(mode);
    setStatusMsg(
      mode === 'tv'
        ? '✓ CineStream-TV.apk (1.2 MB Official Android TV APK) डाउनलोड शुरू हो गया है! इसे Airtel Xstream Box या Android TV में Install करें — यह बिना ब्राउज़र के सीधा खुलेगा।'
        : '✓ CineStream.apk (1.2 MB Official Android APK) डाउनलोड शुरू हो गया है! इसे ओपन करके अपने फोन में Install कर लें।'
    );
  };

  const handleDirectInstallClick = async (mode: 'tv' | 'mobile') => {
    if (mode === 'tv' && !isTvMode) {
      onEnableTvMode();
    }
    const res = await installApp();
    if (res === 'accepted') {
      setStatusMsg('✓ CineStream App आपके डिवाइस के Home Screen पर Install हो गया है!');
    } else {
      handleDownloadApk(mode);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(apkDirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Download Official TV and Mobile APK"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-left my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25 shrink-0">
              <Download className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Direct Signed Android TV & Mobile APK</span>
              </span>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white font-display">
                Download CineStream TV APK (No Browser Needed)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            data-tv-nav="true"
            className="tv-focus p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Device Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2.5 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveTab('tv')}
              data-tv-nav="true"
              className={`tv-focus flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeTab === 'tv'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Airtel Xstream / Android TV APK</span>
            </button>

            <button
              onClick={() => setActiveTab('mobile')}
              data-tv-nav="true"
              className={`tv-focus flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeTab === 'mobile'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android Phone APK & Home Screen</span>
            </button>
          </div>

          {statusMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {activeTab === 'tv' ? (
            <div className="space-y-4">
              {/* Primary 1-Click Direct APK Download Box for TV */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-white">
                        CineStream-TV.apk (Official Standalone TV App)
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        1.2 MB · Signed APK
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      नीचे दिए गए बटन से सीधे <strong>असली Android TV APK (`CineStream-TV.apk`)</strong> डाउनलोड करें। यह बिना किसी ब्राउज़र बार के सीधे Netflix और Prime Video की तरह आपके Airtel Xstream Box के Home Page से चलता है:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="/CineStream-TV.apk"
                    download="CineStream-TV.apk"
                    onClick={() => handleDownloadApk('tv')}
                    data-tv-nav="true"
                    className="tv-focus flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25 text-center"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Direct TV APK (1.2 MB)</span>
                  </a>

                  <button
                    onClick={() => {
                      if (!isTvMode) onEnableTvMode();
                      if (typeof document !== 'undefined' && !document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => {});
                      }
                      onClose();
                    }}
                    data-tv-nav="true"
                    className="tv-focus flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25"
                  >
                    <Monitor className="w-4 h-4 stroke-[2.5]" />
                    <span>Launch Full-Screen TV App Mode Now</span>
                  </button>
                </div>
              </div>

              {/* Step by step installation on Airtel Xstream Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="text-xs sm:text-sm font-extrabold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Airtel Xstream Box में CineStream-TV.apk कैसे Install करें:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2">
                    <div className="text-xs font-extrabold text-white">
                      स्टेप 1: APK डाउनलोड या ट्रांसफर करें
                    </div>
                    <ol className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed list-decimal list-inside">
                      <li>
                        ऊपर <strong>"Download Direct TV APK (1.2 MB)"</strong> दबाकर <code className="text-amber-300">CineStream-TV.apk</code> डाउनलोड करें।
                      </li>
                      <li>
                        अगर फोन में डाउनलोड किया है, तो Play Store के <strong>"Send Files to TV"</strong> ऐप या Pendrive से इसे Airtel Xstream Box में भेजें।
                      </li>
                      <li>
                        अगर TV के <strong>Downloader / TV Bro</strong> में खोला है, तो सीधे डाउनलोड करके <strong>Install</strong> दबाएं।
                      </li>
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-extrabold text-white">
                        स्टेप 2: QR स्कैन या डायरेक्ट APK लिंक
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        अपने TV के Downloader ऐप में नीचे दिया गया डायरेक्ट APK लिंक डालें या फोन से QR स्कैन करके सीधे APK पाएं:
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      <img
                        src={qrUrl}
                        alt="Direct TV APK QR"
                        className="w-16 h-16 rounded-lg bg-white p-1 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="text-[10px] text-amber-300 truncate font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {apkDirectUrl}
                        </div>
                        <button
                          onClick={handleCopyLink}
                          data-tv-nav="true"
                          className="tv-focus w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-700"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'APK Link Copied!' : 'Copy Direct APK Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mobile / Laptop APK & Home Screen Install */
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Android Phone के लिए Direct APK या Home Screen App Install करें
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="/CineStream.apk"
                    download="CineStream.apk"
                    onClick={() => handleDownloadApk('mobile')}
                    data-tv-nav="true"
                    className="tv-focus flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 text-center"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Android APK (CineStream.apk)</span>
                  </a>

                  <button
                    onClick={() => handleDirectInstallClick('mobile')}
                    data-tv-nav="true"
                    className="tv-focus flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>{isInstalled ? 'Installed on Home Screen ✓' : 'Instant Add to Home Screen'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Direct TV URL: <code className="text-amber-300 font-mono">{tvDirectUrl}</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
