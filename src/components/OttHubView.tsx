import React from 'react';
import { OttPlatform } from '../data/ottPlatforms';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { ArrowLeft, Play, Star, Plus, Check } from 'lucide-react';

interface OttHubViewProps {
  ott: OttPlatform;
  onExit: () => void;
  onPlay: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  isTvMode?: boolean;
}

export const OttHubView: React.FC<OttHubViewProps> = ({
  ott,
  onExit,
  onPlay,
  watchlist,
  onToggleWatchlist,
  isTvMode = false,
}) => {
  const hero = ott.heroItem;
  const isWatchlisted = watchlist.includes(hero.id);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${ott.bgGradient} text-white pb-20 select-none`}>
      {/* OTT Platform Authentic Top Navigation */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Prominent Exit Button back to CineStream */}
          <button
            onClick={onExit}
            className="tv-focus flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 shadow-lg transition-transform active:scale-95"
            title="Exit to CineStream Hub (Esc / Back button)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit {ott.name}</span>
          </button>

          {/* Authentic Brand Wordmark */}
          <div className="flex items-center gap-2.5">
            <span
              className="text-2xl sm:text-3xl font-black tracking-tight font-display"
              style={{ color: ott.accentColor }}
            >
              {ott.logoText}
            </span>
            <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">
              Original Hub
            </span>
          </div>
        </div>

        <div className="text-xs text-white/60 hidden md:block">
          Press <strong>Esc</strong> or click <strong>Exit</strong> to return to main portal
        </div>
      </header>

      {/* Authentic Platform Hero Billboard */}
      <div className="relative w-full h-[460px] sm:h-[520px] lg:h-[560px] overflow-hidden bg-black">
        <img
          src={hero.backdrop || hero.poster}
          alt={hero.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        />

        {/* Ambient Gradient Scrims matching OTT Brand */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent max-w-3xl" />

        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-8 flex flex-col justify-end pb-12 z-10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
            <span className={`px-2 py-0.5 rounded text-[11px] ${ott.badgeStyle}`}>
              {ott.name} Original
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{hero.rating || '8.5'} IMDb</span>
            </span>
            <span>·</span>
            <span>{hero.year}</span>
            {hero.totalSeasons && (
              <>
                <span>·</span>
                <span>{hero.totalSeasons} Seasons</span>
              </>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white font-display max-w-2xl text-balance">
            {hero.title}
          </h1>

          <p className="text-sm sm:text-base text-white/80 max-w-xl line-clamp-3 leading-relaxed">
            {hero.overview}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onPlay(hero)}
              className="tv-focus flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-xl transition-transform active:scale-95"
              style={{ backgroundColor: ott.accentColor, color: '#000' }}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Watch on {ott.name}</span>
            </button>

            <button
              onClick={() => onToggleWatchlist(hero)}
              className="tv-focus flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20"
            >
              {isWatchlisted ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>My List</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Categories for this OTT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8 mt-6">
        {ott.categories.map((cat, idx) => (
          <div key={idx} className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              {cat.title}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {cat.items.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onSelect={onPlay}
                  isWatchlisted={watchlist.includes(item.id)}
                  onToggleWatchlist={onToggleWatchlist}
                  isTvMode={isTvMode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
