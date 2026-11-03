import React, { useState } from 'react';
import { Episode } from '../types';
import { Play, Check, X, Calendar } from 'lucide-react';

interface EpisodePickerProps {
  title: string;
  currentSeason: number;
  currentEpisode: number;
  episodesMap: Record<number, Episode[]>;
  onSelectEpisode: (season: number, episode: number) => void;
  onClose: () => void;
}

export const EpisodePicker: React.FC<EpisodePickerProps> = ({
  title,
  currentSeason,
  currentEpisode,
  episodesMap,
  onSelectEpisode,
  onClose,
}) => {
  const seasons = Object.keys(episodesMap)
    .map(Number)
    .sort((a, b) => a - b);

  const initialSeason = seasons.includes(currentSeason) ? currentSeason : seasons[0] || 1;
  const [selectedSeason, setSelectedSeason] = useState<number>(initialSeason);

  const episodes = episodesMap[selectedSeason] || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              {title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select Season and Episode to stream
            </p>
          </div>
          <button
            onClick={onClose}
            className="tv-focus p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Season Selector Tabs */}
        {seasons.length > 1 && (
          <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {seasons.map((s) => {
              const active = s === selectedSeason;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSeason(s)}
                  className={`tv-focus px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-850 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  Season {s}
                </button>
              );
            })}
          </div>
        )}

        {/* Episodes Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {episodes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No episode details found for Season {selectedSeason}. You can stream by episode number directly.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {episodes.map((ep) => {
                const isPlaying =
                  currentSeason === selectedSeason && currentEpisode === ep.episode;

                return (
                  <button
                    key={`${selectedSeason}-${ep.episode}`}
                    onClick={() => {
                      onSelectEpisode(selectedSeason, ep.episode);
                      onClose();
                    }}
                    className={`tv-focus group flex flex-col p-3 rounded-xl border text-left transition-all ${
                      isPlaying
                        ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-slate-950/70 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    {/* Thumbnail / Header */}
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 mb-2.5">
                      {ep.thumbnail ? (
                        <img
                          src={ep.thumbnail}
                          alt={ep.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-850 text-slate-500 font-mono text-xs">
                          S{selectedSeason} E{ep.episode}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                          <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
                        </div>
                      </div>

                      {isPlaying && (
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950">
                          Now Playing
                        </div>
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-white group-hover:text-amber-400 line-clamp-1">
                        Episode {ep.episode}: {ep.title}
                      </div>
                      {isPlaying && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>

                    {ep.overview && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {ep.overview}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
