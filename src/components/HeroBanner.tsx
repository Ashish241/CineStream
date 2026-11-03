import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Star, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import { MediaItem } from '../types';

interface HeroBannerProps {
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onPlay,
  watchlist,
  onToggleWatchlist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items || items.length === 0) return null;
  const current = items[currentIndex];
  const inWatchlist = watchlist.includes(current.id);

  return (
    <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[620px] overflow-hidden bg-slate-950">
      {/* Background Backdrop Image with Gradient Scrims */}
      <div className="absolute inset-0">
        <img
          src={current.backdrop || current.poster}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Anti-slop measured dark scrims for legible typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent max-w-4xl" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-slate-950/30 to-slate-950/90" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Metadata Bar (Zero-pill discipline, unboxed text with · separators) */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-medium">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">
              {current.type === 'movie' ? 'Featured Movie' : 'Top Web Series'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{current.rating || '8.5'} IMDb</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{current.year}</span>
            {current.duration && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{current.duration}</span>
              </>
            )}
            {current.totalSeasons && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{current.totalSeasons} Seasons</span>
              </>
            )}
          </div>

          {/* Primary Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight font-display text-balance">
            {current.title}
          </h1>

          {/* Genres Line */}
          {current.genres && current.genres.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {current.genres.slice(0, 4).map((g, idx) => (
                <React.Fragment key={g}>
                  {idx > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
                  <span>{g}</span>
                </React.Fragment>
              ))}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">1080p Ultra HD</span>
            </div>
          )}

          {/* Plot Overview */}
          <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed max-w-xl">
            {current.overview ||
              'Stream now in crystal clear 1080p HD with seamless playback and high speed streaming servers.'}
          </p>

          {/* Primary Action Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => onPlay(current)}
              className="tv-focus flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-base shadow-lg shadow-amber-500/25 transition-transform active:scale-95 shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={() => onToggleWatchlist(current)}
              className="tv-focus flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-xs sm:text-sm transition-all shrink-0"
            >
              {inWatchlist ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to List</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carousel controls & indicator dots (responsive placement) */}
        <div className="hidden sm:flex absolute right-4 sm:right-8 bottom-12 sm:bottom-16 items-center gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
            className="tv-focus p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Previous featured"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 transition-all rounded-full ${
                  i === currentIndex ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
            className="tv-focus p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Next featured"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
