import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Search, X, Volume2, Globe, Sparkles, AlertCircle } from 'lucide-react';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSubmit: (query: string) => void;
  isTvMode?: boolean;
}

const SAMPLE_QUERIES = [
  'Panchayat Season 4',
  'Mirzapur',
  'Ali Baba aur 40 Bhoot',
  'Chumbak',
  'Pushpa 2 The Rule',
  'Gram Chikitsalay',
  'KGF Chapter 2',
  'Stranger Things',
];

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onSearchSubmit,
  isTvMode = false,
}) => {
  const [selectedLang, setSelectedLang] = useState<'hi-IN' | 'en-IN' | 'en-US'>('hi-IN');
  const [manualInput, setManualInput] = useState('');

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    setLang,
  } = useVoiceSearch({
    defaultLang: selectedLang,
    onSearchResult: (finalText) => {
      if (finalText.trim()) {
        setTimeout(() => {
          onSearchSubmit(finalText.trim());
          onClose();
        }, 600);
      }
    },
  });

  // Switch recognition language when selectedLang changes
  useEffect(() => {
    setLang(selectedLang);
  }, [selectedLang, setLang]);

  // Auto-start listening when modal opens
  useEffect(() => {
    if (isOpen) {
      setManualInput('');
      const timer = setTimeout(() => {
        startListening();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopListening();
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentDisplay = transcript || interimTranscript;

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (manualInput.trim()) {
      onSearchSubmit(manualInput.trim());
      onClose();
    }
  };

  const handlePillClick = (q: string) => {
    onSearchSubmit(q);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          data-tv-nav="true"
          className="tv-focus absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Close Voice Search (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            Smart TV Voice Search
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md">
          Speak movie or show title into your TV remote or microphone.
        </p>

        {/* Language selector toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <button
            onClick={() => {
              setSelectedLang('hi-IN');
              if (isListening) startListening();
            }}
            data-tv-nav="true"
            className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'hi-IN'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇮🇳 हिन्दी / Hinglish
          </button>
          <button
            onClick={() => {
              setSelectedLang('en-IN');
              if (isListening) startListening();
            }}
            data-tv-nav="true"
            className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'en-IN'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            English (India)
          </button>
          <button
            onClick={() => {
              setSelectedLang('en-US');
              if (isListening) startListening();
            }}
            data-tv-nav="true"
            className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'en-US'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            English (US)
          </button>
        </div>

        {/* Big Animated Mic Centerpiece */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Pulsing rings when listening */}
          {isListening && (
            <>
              <div className="absolute w-36 h-36 rounded-full bg-amber-500/20 animate-ping duration-1000" />
              <div className="absolute w-28 h-28 rounded-full bg-amber-500/30 animate-pulse duration-700" />
            </>
          )}

          <button
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            data-tv-nav="true"
            className={`tv-focus relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
              isListening
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 scale-105 shadow-amber-500/40 ring-4 ring-amber-400/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
            title={isListening ? 'Tap to stop listening' : 'Tap to start speaking'}
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-bounce stroke-[2.2]" />
            ) : (
              <MicOff className="w-10 h-10 text-slate-400" />
            )}
            <span className="text-[10px] font-bold uppercase mt-1 tracking-wider">
              {isListening ? 'Listening' : 'Tap Mic'}
            </span>
          </button>
        </div>

        {/* Audio Wave Bars Simulation when listening */}
        {isListening && (
          <div className="flex items-center gap-1.5 h-6 my-2">
            {[40, 70, 95, 60, 85, 100, 75, 45, 90, 65, 80, 50].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-amber-400 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${(i % 4) * 120}ms`,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>
        )}

        {/* Live Transcript Box */}
        <div className="w-full min-h-[64px] bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 my-3 flex flex-col items-center justify-center">
          {currentDisplay ? (
            <div className="space-y-1">
              <span className="text-lg sm:text-2xl font-bold text-amber-300">
                "{currentDisplay}"
              </span>
              <p className="text-[11px] text-emerald-400 font-medium">
                Searching automatically...
              </p>
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Listening... Speak movie or series title</span>
            </div>
          ) : (
            <div className="text-slate-500 text-xs sm:text-sm">
              Press microphone button above to search by voice
            </div>
          )}
        </div>

        {/* Error message if microphone is blocked or not supported */}
        {error && (
          <div className="w-full mb-3 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {!isSupported && (
          <div className="w-full mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            Browser speech recognition is unavailable in this environment. You can use the quick suggestions or direct input below.
          </div>
        )}

        {/* Manual Input Fallback */}
        <form onSubmit={handleManualSubmit} className="w-full flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Or type title manually..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              data-tv-nav="true"
              className="tv-focus w-full bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2.5 focus:border-amber-500 focus:bg-slate-900 placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            data-tv-nav="true"
            className="tv-focus px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm hover:bg-amber-400 transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* Quick Voice Suggestions */}
        <div className="w-full text-left">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Popular Searches
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((query) => (
              <button
                key={query}
                onClick={() => handlePillClick(query)}
                data-tv-nav="true"
                className="tv-focus px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
