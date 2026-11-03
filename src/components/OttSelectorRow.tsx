import React from 'react';
import { OTT_PLATFORMS, OttPlatform } from '../data/ottPlatforms';
import { Sparkles, ArrowRight } from 'lucide-react';

interface OttSelectorRowProps {
  onSelectOtt: (ott: OttPlatform) => void;
  isTvMode?: boolean;
}

export const OttSelectorRow: React.FC<OttSelectorRowProps> = ({
  onSelectOtt,
  isTvMode = false,
}) => {
  const platforms = Object.values(OTT_PLATFORMS);

  return (
    <section className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3.5">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Select Your Streaming Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display mt-0.5">
            OTT Platforms Hub (Original UI & Catalog)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any OTT platform to switch to its authentic UI theme and exclusive shows.
          </p>
        </div>
      </div>

      {/* Grid of OTT Platforms */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {platforms.map((ott) => {
          let badgeBg = 'bg-zinc-900 border-zinc-800';
          let textColor = 'text-white';
          let hoverBorder = 'hover:border-zinc-500';

          if (ott.id === 'netflix') {
            badgeBg = 'bg-gradient-to-br from-neutral-950 to-red-950/40 border-red-900/40';
            textColor = 'text-red-500';
            hoverBorder = 'hover:border-red-500 hover:shadow-red-500/20';
          } else if (ott.id === 'prime') {
            badgeBg = 'bg-gradient-to-br from-slate-950 to-sky-950/40 border-sky-900/40';
            textColor = 'text-sky-400';
            hoverBorder = 'hover:border-sky-400 hover:shadow-sky-400/20';
          } else if (ott.id === 'jiohotstar') {
            badgeBg = 'bg-gradient-to-br from-slate-950 to-blue-950/50 border-blue-800/50';
            textColor = 'text-blue-400';
            hoverBorder = 'hover:border-blue-400 hover:shadow-blue-500/20';
          } else if (ott.id === 'sonyliv') {
            badgeBg = 'bg-gradient-to-br from-slate-950 to-purple-950/40 border-purple-900/40';
            textColor = 'text-purple-400';
            hoverBorder = 'hover:border-purple-400 hover:shadow-purple-400/20';
          } else if (ott.id === 'zee5') {
            badgeBg = 'bg-gradient-to-br from-slate-950 to-violet-950/50 border-violet-800/40';
            textColor = 'text-violet-300';
            hoverBorder = 'hover:border-violet-400 hover:shadow-violet-400/20';
          } else if (ott.id === 'appletv') {
            badgeBg = 'bg-gradient-to-br from-slate-950 to-zinc-900 border-zinc-800';
            textColor = 'text-slate-100';
            hoverBorder = 'hover:border-white hover:shadow-white/20';
          }

          return (
            <button
              key={ott.id}
              onClick={() => onSelectOtt(ott)}
              className={`tv-focus group relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border text-center transition-all duration-200 select-none shadow-lg ${badgeBg} ${hoverBorder} ${
                isTvMode ? 'hover:scale-105' : 'hover:-translate-y-0.5'
              }`}
            >
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight mb-2 font-display ${textColor}`}
              >
                {ott.logoText}
              </div>

              <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                {ott.name}
              </div>

              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {ott.tagline}
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
                <span>Enter Hub</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
