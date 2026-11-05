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
  ExternalLink,
  Sparkles,
  Star,
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
  const { isInstallable, isInstalled, isIOS, installApp, downloadLauncherPackage } =
    usePWAInstall();

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tv' | 'mobile'>('tv');

  if (!isOpen) return null;

  const appOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-oti3wuvopqhdn4mihxourq-338770488864.asia-southeast1.run.app';
  const tvDirectUrl = `${appOrigin}/?tv=1`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    tvDirectUrl
  )}`;

  const handleDirectInstallClick = async (mode: 'tv' | 'mobile') => {
    if (mode === 'tv' && !isTvMode) {
      onEnableTvMode();
    }
    const res = await installApp();
    if (res === 'accepted') {
      setStatusMsg('✓ CineStream App आपके डिवाइस के Home Screen पर Install हो गया है!');
    } else {
      downloadLauncherPackage(mode);
      setStatusMsg(
        mode === 'tv'
          ? '✓ CineStream TV App Launcher डाउनलोड हो गया है! साथ ही नीचे दिए गए स्टेप्स से इसे TV Home Screen पर पिन करें।'
          : '✓ CineStream Mobile App Launcher डाउनलोड हो गया है! या अपने ब्राउज़र के (⋮) मेनू में जाकर "Add to Home screen" दबाएं।'
      );
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(tvDirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install App and Add to Home Screen"
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
                <span>Official App Installer</span>
              </span>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white font-display">
                Install App / Add to Home Screen
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
              <span>Airtel Xstream / Smart TV</span>
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
              <span>Mobile / Laptop (Android & iOS)</span>
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
              {/* Primary 1-Click Action Box for TV */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      1-Click TV App Install & Full-Screen Mode
                    </h3>
                    <p className="text-xs text-slate-300">
                      नीचे दिए गए पीले बटन पर क्लिक करें — यह तुरंत <strong>Install App / Add to Home Screen</strong> डायलॉग खोलेगा और TV को Netflix/Prime स्टाइल Full-Screen Mode में सेट कर देगा:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDirectInstallClick('tv')}
                    data-tv-nav="true"
                    className="tv-focus flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {isInstalled
                        ? 'App Installed ✓ (Launch TV Mode)'
                        : 'Install App / Add to Home Screen'}
                    </span>
                  </button>

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
                    <span>Open Full-Screen Netflix/Prime TV UI</span>
                  </button>
                </div>
              </div>

              {/* Important explanation why Android TV Browsers don't show Chrome's "Add to Home screen" & how to get the APK / Shortcut */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="text-xs sm:text-sm font-extrabold text-amber-400">
                  महत्वपूर्ण: Airtel Xstream Box में "Add to Home Screen" कहाँ मिलता है?
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Android TV और Airtel Xstream Box के ब्राउज़र (जैसे <strong>TV Bro</strong> या <strong>JioPages</strong>) में मोबाइल क्रोम जैसा <em>"Add to Home Screen"</em> बटन नहीं होता क्योंकि Android TV का लॉन्चर सिर्फ <strong>.APK ऐप्स</strong> को ही मुख्य होम पेज (Netflix/Prime के बगल में) दिखाने की अनुमति देता है। इसके लिए नीचे दिए गए <strong>2 सबसे आसान तरीके</strong> अपनाएं:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Way 1: APK for Main Airtel Home Page */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>तरीका 1: असली Android TV .APK बनाएं (Airtel Home Page के लिए)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        अगर आप चाहते हैं कि <strong>Airtel Xstream के मुख्य Home Page पर Netflix और Prime के बगल में CineStream का आइकॉन</strong> आए, तो नीचे क्लिक करके 1 मिनट में इसकी <strong>.APK फाइल</strong> डाउनलोड करें और TV में Install कर लें:
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`https://www.webintoapp.com/store/create?url=${encodeURIComponent(
                          tvDirectUrl
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-tv-nav="true"
                        className="tv-focus w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs text-center flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Create Free Android TV .APK (WebIntoApp)</span>
                      </a>
                      <a
                        href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
                          tvDirectUrl
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-tv-nav="true"
                        className="tv-focus w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] text-center flex items-center justify-center gap-1.5 border border-slate-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Alternative: Generate .APK via PWABuilder</span>
                      </a>
                    </div>
                  </div>

                  {/* Way 2: Pin inside TV Bro / JioPages Start Screen */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                        <span>तरीका 2: TV Bro / JioPages में 1-Click Pin करें (बिना APK के)</span>
                      </div>
                      <ul className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed list-disc list-inside">
                        <li>
                          <strong>TV Bro ऐप में:</strong> रिमोट का <strong>Back</strong> या <strong>Menu</strong> बटन दबाएं → ऊपर <strong>★ (Star / Bookmark)</strong> आइकॉन पर OK दबाएं। अब TV Bro खोलते ही सबसे पहले CineStream का बड़ा आइकॉन दिखेगा!
                        </li>
                        <li>
                          <strong>JioPages TV ऐप में:</strong> ऊपर एड्रेस बार के पास <strong>+ (Plus / Add to Quick Access)</strong> पर OK दबाएं — यह JioPages की होम स्क्रीन पर जुड़ जाएगा!
                        </li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={qrUrl}
                        alt="TV URL QR"
                        className="w-14 h-14 rounded-lg bg-white p-1 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-[10px] text-slate-400 truncate font-mono">
                          {tvDirectUrl}
                        </div>
                        <button
                          onClick={handleCopyLink}
                          data-tv-nav="true"
                          className="tv-focus w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-700"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Link Copied!' : 'Copy TV Direct Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mobile / Laptop Install Instructions */
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  अपने फोन या लैपटॉप के Home Screen पर जोड़ें (Add to Home Screen)
                </h3>

                <button
                  onClick={() => handleDirectInstallClick('mobile')}
                  data-tv-nav="true"
                  className="tv-focus w-full flex items-center justify-center gap-2 py-4 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    {isInstallable
                      ? '1-Click Install App to Home Screen Now'
                      : 'Install App / Download Mobile Launcher'}
                  </span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="font-extrabold text-emerald-400">
                      Android Phone (Chrome Browser):
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
                      <li>
                        ऊपर कोने में <strong>3 डॉट्स (⋮)</strong> मेनू पर टैप करें।
                      </li>
                      <li>
                        मेनू में <strong>"Add to Home screen"</strong> या <strong>"Install app"</strong> पर टैप करें।
                      </li>
                      <li>
                        <strong>Install</strong> दबाएं — आइकॉन आपके फोन के बाकी ऐप्स के साथ आ जाएगा!
                      </li>
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="font-extrabold text-amber-400">
                      {isIOS ? 'iPhone / iPad (Safari):' : 'New Tab में खोलकर Install करें:'}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      अगर आप अभी प्रिव्यू विंडो के अंदर देख रहे हैं, तो पहले नीचे क्लिक करके ऐप को फुल टैब में खोलें, फिर ब्राउज़र में तुरंत <strong>"Install App / Add to Home Screen"</strong> का ऑप्शन आ जाएगा:
                    </p>
                    <a
                      href={tvDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] border border-slate-700 mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Full App in New Tab to Install</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
