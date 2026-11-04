import React, { useState, useEffect } from 'react';
import { OttPlatform } from '../data/ottPlatforms';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { fetchLiveOttCatalog } from '../services/catalogService';
import { ArrowLeft, Play, Star, Plus, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

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

  const [contentFilter, setContentFilter] = useState<'all' | 'series' | 'movies'>('all');
  const [liveSeries, setLiveSeries] = useState<MediaItem[]>([]);
  const [liveMovies, setLiveMovies] = useState<MediaItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setPage(1);
    setContentFilter('all');
    setLiveSeries([]);
    setLiveMovies([]);
    setIsLoadingLive(true);

    fetchLiveOttCatalog(ott.providerId, ott.networkId, 1, ott.id)
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
      const more = await fetchLiveOttCatalog(ott.providerId, ott.networkId, nextPage, ott.id);
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
    <div
      className={`min-h-screen w-full bg-gradient-to-b ${ott.bgGradient} text-white pb-24 select-none`}
    >
      {/* OTT Platform Authentic Top Sub-Header (Net77 / NetMirror Style) */}
      <div className="bg-black/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-10 2xl:px-14 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            onClick={onExit}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 shadow-sm transition-transform active:scale-95"
            title="Return to All-in-One Home (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All OTT Home</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span
              className="text-lg sm:text-2xl font-black tracking-tight font-display"
              style={{ color: ott.accentColor }}
            >
              {ott.logoText}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Exclusive {ott.name} Catalog</span>
            </span>
          </div>
        </div>

        {/* Category Filter Tabs inside OTT Platform (All / Series / Movies) */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
          {(['all', 'series', 'movies'] as const).map((tab) => {
            const active = contentFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setContentFilter(tab)}
                data-tv-nav="true"
                className={`tv-focus px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  active ? 'shadow-sm' : 'text-white/70 hover:text-white'
                }`}
                style={
                  active
                    ? {
                        backgroundColor: ott.accentColor,
                        color: ott.id === 'appletv' || ott.id === 'zee5' ? '#000' : '#fff',
                      }
                    : undefined
                }
              >
                {tab === 'all'
                  ? `All ${ott.name}`
                  : tab === 'series'
                  ? `${ott.name} Series`
                  : `${ott.name} Movies`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Authentic Platform Hero Billboard */}
      <div className="relative w-full h-[360px] sm:h-[440px] md:h-[480px] lg:h-[540px] 2xl:h-[600px] overflow-hidden bg-black">
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
              style={{
                backgroundColor: ott.accentColor,
                color: ott.id === 'appletv' || ott.id === 'zee5' ? '#000' : '#fff',
              }}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Watch Now in 1080p HD</span>
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

      {/* Strictly Isolated Content Categories for this OTT Platform */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 space-y-8 mt-6">
        {ott.categories.map((cat, idx) => {
          const filteredItems = cat.items.filter((item) => {
            if (contentFilter === 'series') return item.type === 'tv' || item.type === 'series';
            if (contentFilter === 'movies') return item.type === 'movie';
            return true;
          });
          if (filteredItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2">
                  <span
                    className="w-1.5 h-5 rounded-full"
                    style={{ backgroundColor: ott.accentColor }}
                  />
                  <span>{cat.title}</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
                {filteredItems.map((item) => (
                  <MediaCard
                    key={`${ott.id}-${cat.title}-${item.id}`}
                    item={item}
                    onSelect={onPlay}
                    isWatchlisted={watchlist.includes(item.id)}
                    onToggleWatchlist={onToggleWatchlist}
                    isTvMode={isTvMode}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Live Auto-Synced Web Series & Originals Exclusively on this OTT Platform */}
        {(contentFilter === 'all' || contentFilter === 'series') && liveSeries.length > 0 && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display">
                More {ott.name} Originals & Series ({liveSeries.length}+)
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
              {liveSeries.map((item) => (
                <MediaCard
                  key={`live-s-${ott.id}-${item.id}`}
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

        {/* Live Auto-Synced Movies Exclusively on this OTT Platform */}
        {(contentFilter === 'all' || contentFilter === 'movies') && liveMovies.length > 0 && (
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
                  key={`live-m-${ott.id}-${item.id}`}
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
