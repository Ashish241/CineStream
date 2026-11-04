import React, { useState, useEffect } from 'react';
import { OttPlatform } from '../data/ottPlatforms';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { fetchLiveOttCatalog } from '../services/catalogService';
import { ArrowLeft, Play, Star, Plus, Check, Loader2, Sparkles } from 'lucide-react';

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

  const [liveSeries, setLiveSeries] = useState<MediaItem[]>([]);
  const [liveMovies, setLiveMovies] = useState<MediaItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setPage(1);
    setIsLoadingLive(true);
    fetchLiveOttCatalog(ott.providerId, ott.networkId, 1)
      .then((res) => {
        if (cancelled) return;
        setLiveSeries(res.series);
        setLiveMovies(res.movies);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ott.id, ott.providerId, ott.networkId]);

  const handleLoadMore = async () => {
    if (isLoadingLive) return;
    const nextPage = page + 1;
    setIsLoadingLive(true);
    try {
      const more = await fetchLiveOttCatalog(ott.providerId, ott.networkId, nextPage);
      setLiveSeries((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        more.series.forEach((s) => map.set(s.id, s));
        return Array.from(map.values());
      });
      setLiveMovies((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        more.movies.forEach((m) => map.set(m.id, m));
        return Array.from(map.values());
      });
      setPage(nextPage);
    } finally {
      setIsLoadingLive(false);
    }
  };

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${ott.bgGradient} text-white pb-24 select-none`}>
      {/* OTT Platform Authentic Top Navigation */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-10 2xl:px-14 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={onExit}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 shadow-lg transition-transform active:scale-95"
            title="Exit to CineStream Hub (Esc / Back button)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit {ott.name}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span
              className="text-xl sm:text-3xl font-black tracking-tight font-display"
              style={{ color: ott.accentColor }}
            >
              {ott.logoText}
            </span>
            <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">
              Official Hub
            </span>
          </div>
        </div>

        <div className="text-xs text-white/60 hidden md:block">
          Press <strong>Esc</strong> or click <strong>Exit</strong> to return to main portal
        </div>
      </header>

      {/* Authentic Platform Hero Billboard */}
      <div className="relative w-full h-[380px] sm:h-[460px] md:h-[500px] lg:h-[560px] 2xl:h-[620px] overflow-hidden bg-black">
        <img
          src={hero.backdrop || hero.poster}
          alt={hero.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent max-w-3xl" />

        <div className="relative max-w-[1600px] mx-auto h-full px-4 sm:px-6 lg:px-10 2xl:px-14 flex flex-col justify-end pb-8 sm:pb-12 z-10 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
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

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-display max-w-2xl text-balance">
            {hero.title}
          </h1>

          <p className="text-xs sm:text-base text-white/80 max-w-xl line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {hero.overview}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onPlay(hero)}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-base shadow-xl transition-transform active:scale-95"
              style={{ backgroundColor: ott.accentColor, color: '#000' }}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={() => onToggleWatchlist(hero)}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20"
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 space-y-8 mt-6">
        {ott.categories.map((cat, idx) => (
          <div key={idx} className="space-y-3.5">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display">
              {cat.title}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
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

        {/* Live Auto-Synced Web Series & Shows on this OTT Platform */}
        {liveSeries.length > 0 && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display">
                More {ott.name} Web Series & Shows ({liveSeries.length}+)
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
              {liveSeries.map((item) => (
                <MediaCard
                  key={`live-s-${item.id}`}
                  item={item}
                  onSelect={onPlay}
                  isWatchlisted={watchlist.includes(item.id)}
                  onToggleWatchlist={onToggleWatchlist}
                  isTvMode={isTvMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live Auto-Synced Movies on this OTT Platform */}
        {liveMovies.length > 0 && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display">
                More {ott.name} Movies & Blockbusters ({liveMovies.length}+)
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
              {liveMovies.map((item) => (
                <MediaCard
                  key={`live-m-${item.id}`}
                  item={item}
                  onSelect={onPlay}
                  isWatchlisted={watchlist.includes(item.id)}
                  onToggleWatchlist={onToggleWatchlist}
                  isTvMode={isTvMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Load More Live Titles Button */}
        <div className="pt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingLive}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 shadow-lg transition-all"
          >
            {isLoadingLive ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading More {ott.name} Titles...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Load More {ott.name} Movies & Series</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
