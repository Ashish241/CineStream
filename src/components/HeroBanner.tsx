import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Star, ChevronRight, ChevronLeft } from 'lucide-react';
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
    <div className="relative w-full h-[380px] xs:h-[420px] sm:h-[480px] md:h-[520px] lg:h-[580px] xl:h-[620px] 2xl:h-[680px] overflow-hidden bg-slate-950">
      {/* Background Backdrop Image with Gradient Scrims */}
      <div className="absolute inset-0">
        <img
          src={current.backdrop || current.poster}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent max-w-4xl" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-slate-950/20 to-slate-950/90" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-[1600px] mx-auto h-full px-4 sm:px-6 lg:px-10 2xl:px-14 flex flex-col justify-end pb-7 sm:pb-12 lg:pb-16 z-10">
        <div className="max-w-2xl xl:max-w-3xl space-y-2.5 sm:space-y-4">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm text-slate-300 font-medium">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
              {current.type === 'movie' ? 'Featured Movie' : 'Featured Series'}
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
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight font-display text-balance line-clamp-2">
            {current.title}
          </h1>

          {/* Genres Line */}
          {current.genres && current.genres.length > 0 && (
            <div className="hidden xs:flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-400">
              {current.genres.slice(0, 4).map((g, idx) => (
                <React.Fragment key={g}>
                  {idx > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
                  <span>{g}</span>
                </React.Fragment>
              ))}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">1080p Full HD</span>
            </div>
          )}

          {/* Plot Overview */}
          <p className="text-xs sm:text-sm lg:text-base text-slate-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl">
            {current.overview ||
              'Watch instantly in crystal clear 1080p Full HD across Smart TV, Laptop, Tablet, and Mobile.'}
          </p>

          {/* Primary Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 pt-1 sm:pt-2">
            <button
              onClick={() => onPlay(current)}
              data-tv-nav="true"
              className="tv-focus flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-base shadow-lg shadow-amber-500/25 transition-transform active:scale-95 shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={() => onToggleWatchlist(current)}
              data-tv-nav="true"
              className="tv-focus flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-xs sm:text-sm transition-all shrink-0"
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

        {/* Carousel controls & indicator dots */}
        <div className="hidden sm:flex absolute right-4 sm:right-6 lg:right-10 2xl:right-14 bottom-10 sm:bottom-12 lg:bottom-16 items-center gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
            data-tv-nav="true"
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
            data-tv-nav="true"
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
