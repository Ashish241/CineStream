import React from 'react';
import { X, Tv, Monitor, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Maximize, RefreshCw, Layers } from 'lucide-react';

interface TvGuideModalProps {
  onClose: () => void;
}

export const TvGuideModal: React.FC<TvGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-left">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white font-display">
              Smart TV Remote & Browser Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="tv-focus p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TV Remote Key Map */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              TV Remote Control Keys
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="flex gap-1 text-amber-400 bg-slate-900 p-1 rounded border border-slate-700">
                  <ArrowUp className="w-3.5 h-3.5" />
                  <ArrowDown className="w-3.5 h-3.5" />
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-white">D-Pad Arrow Keys</div>
                  <div className="text-[11px] text-slate-400">Navigate cards & buttons</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 font-mono font-bold">
                  OK / Enter
                </div>
                <div>
                  <div className="font-semibold text-white">Select / Play</div>
                  <div className="text-[11px] text-slate-400">Launch stream or open item</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 font-mono font-bold">
                  Back / Esc
                </div>
                <div>
                  <div className="font-semibold text-white">Exit / Back</div>
                  <div className="text-[11px] text-slate-400">Return to browse catalog</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-700 font-mono font-bold">
                  F Key
                </div>
                <div>
                  <div className="font-semibold text-white">Fullscreen</div>
                  <div className="text-[11px] text-slate-400">Expand player to full TV</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-700 font-mono font-bold">
                  S Key
                </div>
                <div>
                  <div className="font-semibold text-white">Next Server</div>
                  <div className="text-[11px] text-slate-400">Fix server error instantly</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-700 font-mono font-bold">
                  Q Key
                </div>
                <div>
                  <div className="font-semibold text-white">Quality Selector</div>
                  <div className="text-[11px] text-slate-400">1080p / 720p / 360p toggle</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 font-mono font-bold">
                  N / P
                </div>
                <div>
                  <div className="font-semibold text-white">Next / Prev Ep</div>
                  <div className="text-[11px] text-slate-400">Skip to next episode</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 font-mono font-bold">
                  V / Mic
                </div>
                <div>
                  <div className="font-semibold text-white">Voice Search</div>
                  <div className="text-[11px] text-slate-400">Speak movie or show title</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vercel Deployment Guide */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>How to Use on Your Smart TV via Vercel</span>
            </h3>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Deploy this repository to <strong>Vercel</strong> (or connect your GitHub repo with 1 click).</li>
              <li>Open your <strong>Smart TV Browser</strong> (Samsung TV, LG WebOS, Android TV, Fire TV, etc.).</li>
              <li>Navigate to your Vercel URL (e.g. <code className="text-amber-400 font-mono">https://your-stream.vercel.app</code>).</li>
              <li>Bookmark the page or add it to your TV Home Screen for instant 1-click access anytime!</li>
            </ol>
          </div>

          <div className="text-center pt-1">
            <button
              onClick={onClose}
              className="tv-focus px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Got it, Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
