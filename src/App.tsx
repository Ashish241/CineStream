/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Episode, MediaItem, StreamServer, WatchHistoryItem } from './types';
import {
  STREAM_SERVERS,
  DEFAULT_SERVER,
  IMDB_TO_TMDB_MAP,
  resolveTmdbIdAsync,
} from './data/servers';
import {
  HERO_FEATURED_ITEMS,
  NEW_2026_RELEASES,
  ALL_TIME_CLASSICS,
  TRENDING_SERIES,
  TRENDING_MOVIES,
  BOLLYWOOD_SPECIALS,
  ANIME_COLLECTION,
  TV_SERIALS_COLLECTION,
} from './data/curatedCatalog';
import { OttPlatform } from './data/ottPlatforms';
import {
  searchCatalog,
  fetchMediaDetails,
  fetchLiveHomeFeeds,
  fetchDiscoverCatalog,
} from './services/catalogService';
import { useTvMode, useTvHotkeys, useTvSpatialNavigation } from './hooks/useTvNavigation';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { OttSelectorRow } from './components/OttSelectorRow';
import { OttHubView } from './components/OttHubView';
import { CatalogSection } from './components/CatalogSection';
import { MediaCard } from './components/MediaCard';
import { PlayerView } from './components/PlayerView';
import { DirectIdModal } from './components/DirectIdModal';
import { TvGuideModal } from './components/TvGuideModal';
import { VoiceSearchModal } from './components/VoiceSearchModal';
import { AppDownloadSection } from './components/AppDownloadSection';
import {
  Clock,
  Bookmark,
  Tv,
  Play,
  RotateCcw,
  Loader2,
  X,
  Home,
  Film,
  Mic,
  Download,
  Plus,
  Sparkles,
  Radio,
} from 'lucide-react';

export default function App() {
  const { isTvMode, setIsTvMode, toggleTvMode } = useTvMode();

  // Activate 2D spatial grid navigation for Smart TV / Airtel Xstream Box D-pad traversal
  useTvSpatialNavigation(true);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Active OTT Hub state (Netflix, Prime, JioHotstar, SonyLIV, ZEE5, Apple TV+)
  const [selectedOtt, setSelectedOtt] = useState<OttPlatform | null>(null);

  // Active Player state
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [currentSeason, setCurrentSeason] = useState<number>(1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(1);
  const [episodesMap, setEpisodesMap] = useState<Record<number, Episode[]>>({});
  const [currentServer, setCurrentServer] = useState<StreamServer>(DEFAULT_SERVER);

  // Modals state
  const [showDirectModal, setShowDirectModal] = useState<boolean>(false);
  const [showTvGuide, setShowTvGuide] = useState<boolean>(false);
  const [showVoiceSearch, setShowVoiceSearch] = useState<boolean>(false);

  // Live Auto-Sync Feeds State (Automatically pulls new OTT releases from TMDB)
  const [liveFeeds, setLiveFeeds] = useState<{
    trendingToday: MediaItem[];
    newIndianReleases: MediaItem[];
    liveMovies: MediaItem[];
    liveSeries: MediaItem[];
    liveSerials: MediaItem[];
    liveAnime: MediaItem[];
  }>({
    trendingToday: [],
    newIndianReleases: [],
    liveMovies: [],
    liveSeries: [],
    liveSerials: [],
    liveAnime: [],
  });

  // Infinite "Load More" pagination state for category tabs
  const [discoverItems, setDiscoverItems] = useState<MediaItem[]>([]);
  const [discoverPage, setDiscoverPage] = useState<number>(1);
  const [discoverFilter, setDiscoverFilter] = useState<'popular' | 'newest' | 'classic'>('popular');
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Fetch Live Auto-Updating Home Feeds on startup
  useEffect(() => {
    let cancelled = false;
    fetchLiveHomeFeeds().then((feeds) => {
      if (!cancelled) {
        setLiveFeeds(feeds);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load initial discover catalog when switching to Movies, Series, Serials, Bollywood, or Anime tab
  useEffect(() => {
    if (
      currentTab !== 'movies' &&
      currentTab !== 'series' &&
      currentTab !== 'serials' &&
      currentTab !== 'bollywood' &&
      currentTab !== 'anime'
    ) {
      return;
    }

    let cancelled = false;
    setDiscoverPage(1);
    setIsLoadingMore(true);

    fetchDiscoverCatalog(
      currentTab as 'movies' | 'series' | 'bollywood' | 'serials' | 'anime',
      1,
      discoverFilter
    )
      .then((items) => {
        if (!cancelled) {
          setDiscoverItems(items);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMore(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTab, discoverFilter]);

  const handleLoadMoreCategory = async () => {
    if (isLoadingMore) return;
    if (
      currentTab !== 'movies' &&
      currentTab !== 'series' &&
      currentTab !== 'serials' &&
      currentTab !== 'bollywood' &&
      currentTab !== 'anime'
    ) {
      return;
    }

    const nextPage = discoverPage + 1;
    setIsLoadingMore(true);
    try {
      const more = await fetchDiscoverCatalog(
        currentTab as 'movies' | 'series' | 'bollywood' | 'serials' | 'anime',
        nextPage,
        discoverFilter
      );
      setDiscoverItems((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        more.forEach((m) => map.set(m.id, m));
        return Array.from(map.values());
      });
      setDiscoverPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Watchlist & History stored in localStorage for Smart TV resume
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cinestream_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('cinestream_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleWatchlist = (item: MediaItem) => {
    setWatchlist((prev) => {
      let next: string[];
      if (prev.includes(item.id)) {
        next = prev.filter((id) => id !== item.id);
      } else {
        next = [item.id, ...prev];
      }
      try {
        localStorage.setItem('cinestream_watchlist', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const recordWatchHistory = (
    media: MediaItem,
    season = 1,
    episode = 1,
    serverId = DEFAULT_SERVER.id
  ) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.media.id !== media.id);
      const next: WatchHistoryItem[] = [
        { media, season, episode, serverId, watchedAt: Date.now() },
        ...filtered,
      ].slice(0, 12);
      try {
        localStorage.setItem('cinestream_history', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleRemoveWatchHistoryItem = (mediaId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setWatchHistory((prev) => {
      const next = prev.filter((h) => h.media.id !== mediaId);
      try {
        localStorage.setItem('cinestream_history', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchCatalog(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Launch stream handler
  const handlePlayMedia = async (media: MediaItem, season = 1, episode = 1) => {
    const enrichedMedia: MediaItem = { ...media };
    if (!enrichedMedia.tmdbId && IMDB_TO_TMDB_MAP[enrichedMedia.id]) {
      enrichedMedia.tmdbId = IMDB_TO_TMDB_MAP[enrichedMedia.id];
    }
    if (!enrichedMedia.tmdbId) {
      const resolved = await resolveTmdbIdAsync(enrichedMedia.imdbId || enrichedMedia.id);
      if (resolved && /^\d+$/.test(resolved)) {
        enrichedMedia.tmdbId = resolved;
      }
    }
    setActiveMedia(enrichedMedia);
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    recordWatchHistory(enrichedMedia, season, episode, currentServer.id);

    if (media.type === 'tv' || media.type === 'series' || media.isSerial) {
      try {
        const details = await fetchMediaDetails(media.type, media.imdbId || media.id);
        if (details.episodes && Object.keys(details.episodes).length > 0) {
          setEpisodesMap(details.episodes);
        }
      } catch (err) {
        console.warn('Could not fetch episodes list, fallback to manual numbering', err);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayDirect = (params: {
    type: 'movie' | 'tv';
    id: string;
    season: number;
    episode: number;
    server: StreamServer;
    title?: string;
  }) => {
    const item: MediaItem = {
      id: params.id,
      imdbId: params.id.startsWith('tt') ? params.id : undefined,
      tmdbId: !params.id.startsWith('tt') ? params.id : undefined,
      title: params.title || `Stream (${params.id})`,
      type: params.type,
      poster: '',
      year: 'HD',
    };
    setCurrentServer(params.server);
    handlePlayMedia(item, params.season, params.episode);
  };

  // Smart TV / Airtel Xstream Remote hotkeys handler
  useTvHotkeys({
    onBack: () => {
      if (showVoiceSearch) setShowVoiceSearch(false);
      else if (showDirectModal) setShowDirectModal(false);
      else if (showTvGuide) setShowTvGuide(false);
      else if (activeMedia) setActiveMedia(null);
      else if (selectedOtt) setSelectedOtt(null);
    },
    onVoiceSearch: () => {
      setShowVoiceSearch(true);
    },
    onNextServer: () => {
      if (activeMedia) {
        const idx = STREAM_SERVERS.findIndex((s) => s.id === currentServer.id);
        const next = STREAM_SERVERS[(idx + 1) % STREAM_SERVERS.length];
        setCurrentServer(next);
      }
    },
    onNextEpisode: () => {
      if (activeMedia && (activeMedia.type === 'tv' || activeMedia.type === 'series')) {
        setCurrentEpisode((prev) => prev + 1);
      }
    },
    onPrevEpisode: () => {
      if (activeMedia && (activeMedia.type === 'tv' || activeMedia.type === 'series')) {
        setCurrentEpisode((prev) => Math.max(1, prev - 1));
      }
    },
  });

  // Merge curated and live items for fast lookup
  const allCurated = useMemo(() => {
    const map = new Map<string, MediaItem>();
    [
      ...HERO_FEATURED_ITEMS,
      ...NEW_2026_RELEASES,
      ...TV_SERIALS_COLLECTION,
      ...ALL_TIME_CLASSICS,
      ...TRENDING_SERIES,
      ...TRENDING_MOVIES,
      ...BOLLYWOOD_SPECIALS,
      ...ANIME_COLLECTION,
      ...liveFeeds.trendingToday,
      ...liveFeeds.newIndianReleases,
      ...liveFeeds.liveMovies,
      ...liveFeeds.liveSeries,
      ...liveFeeds.liveSerials,
      ...liveFeeds.liveAnime,
    ].forEach((m) => map.set(m.id, m));
    return map;
  }, [liveFeeds]);

  const watchlistedItems = useMemo(() => {
    return watchlist.map(
      (id) =>
        allCurated.get(id) ||
        ({ id, title: `Title ${id}`, type: 'movie' as const, poster: '' } as MediaItem)
    );
  }, [watchlist, allCurated]);

  // Combined rows with deduplication
  const mergeUnique = (primary: MediaItem[], secondary: MediaItem[]) => {
    const map = new Map<string, MediaItem>();
    primary.forEach((i) => map.set(i.id, i));
    secondary.forEach((i) => {
      if (!map.has(i.id)) map.set(i.id, i);
    });
    return Array.from(map.values());
  };

  const combinedSerials = useMemo(
    () => mergeUnique(TV_SERIALS_COLLECTION, liveFeeds.liveSerials),
    [liveFeeds.liveSerials]
  );

  const combinedMovies = useMemo(
    () =>
      mergeUnique(
        [
          ...TRENDING_MOVIES,
          ...ALL_TIME_CLASSICS.filter((m) => m.type === 'movie'),
          ...BOLLYWOOD_SPECIALS.filter((m) => m.type === 'movie'),
        ],
        mergeUnique(liveFeeds.liveMovies, discoverItems)
      ),
    [liveFeeds.liveMovies, discoverItems]
  );

  const combinedSeries = useMemo(
    () =>
      mergeUnique(
        [
          ...NEW_2026_RELEASES.filter((m) => m.type === 'tv'),
          ...TRENDING_SERIES,
          ...ALL_TIME_CLASSICS.filter((m) => m.type === 'tv'),
          ...BOLLYWOOD_SPECIALS.filter((m) => m.type === 'tv'),
        ],
        mergeUnique(liveFeeds.liveSeries, discoverItems)
      ),
    [liveFeeds.liveSeries, discoverItems]
  );

  const combinedBollywood = useMemo(
    () => mergeUnique(BOLLYWOOD_SPECIALS, mergeUnique(liveFeeds.newIndianReleases, discoverItems)),
    [liveFeeds.newIndianReleases, discoverItems]
  );

  const combinedAnime = useMemo(
    () => mergeUnique(ANIME_COLLECTION, mergeUnique(liveFeeds.liveAnime, discoverItems)),
    [liveFeeds.liveAnime, discoverItems]
  );

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden ${
        isTvMode ? 'text-base lg:text-lg' : 'text-sm'
      }`}
    >
      {/* Top Navigation Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSearchQuery('');
          setActiveMedia(null);
          setSelectedOtt(null);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenDirectModal={() => setShowDirectModal(true)}
        onOpenTvGuide={() => setShowTvGuide(true)}
        onOpenVoiceSearch={() => setShowVoiceSearch(true)}
        isTvMode={isTvMode}
        onToggleTvMode={toggleTvMode}
        watchlistCount={watchlist.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-24 md:pb-16">
        {/* Active Player View */}
        {activeMedia ? (
          <PlayerView
            media={activeMedia}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
            episodesMap={episodesMap}
            currentServer={currentServer}
            onSelectServer={setCurrentServer}
            onEpisodeChange={(s, e) => {
              setCurrentSeason(s);
              setCurrentEpisode(e);
              recordWatchHistory(activeMedia, s, e, currentServer.id);
            }}
            onBack={() => setActiveMedia(null)}
            isTvMode={isTvMode}
          />
        ) : selectedOtt ? (
          /* Dedicated Authentic OTT Platform UI with Live Auto-Sync */
          <OttHubView
            ott={selectedOtt}
            onExit={() => setSelectedOtt(null)}
            onPlay={(item) => handlePlayMedia(item)}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            isTvMode={isTvMode}
          />
        ) : (
          <>
            {/* If user is actively searching */}
            {searchQuery.trim() ? (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-white font-display flex items-center gap-2">
                    {isSearching ? (
                      <>
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                        <span>Searching for "{searchQuery}"...</span>
                      </>
                    ) : (
                      <span>Search Results ({searchResults.length})</span>
                    )}
                  </h2>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-amber-400 hover:underline shrink-0"
                  >
                    Clear Search
                  </button>
                </div>

                {searchResults.length === 0 && !isSearching ? (
                  <div className="py-16 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
                    <p className="text-slate-400 text-sm">
                      No titles found matching "{searchQuery}".
                    </p>
                    <button
                      onClick={() => setShowDirectModal(true)}
                      className="tv-focus px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Paste Custom IMDb / TMDB ID Directly
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {searchResults.map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onSelect={(media) => handlePlayMedia(media)}
                        isWatchlisted={watchlist.includes(item.id)}
                        onToggleWatchlist={handleToggleWatchlist}
                        isTvMode={isTvMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Regular Browse Experience */
              <div>
                {/* Hero Featured Showcase on Home */}
                {currentTab === 'all' && (
                  <>
                    <HeroBanner
                      items={HERO_FEATURED_ITEMS}
                      onPlay={(item) => handlePlayMedia(item)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                    />

                    {/* Dedicated OTT Platforms Hub Selector (Netflix, Prime, JioHotstar, SonyLIV, ZEE5, Apple TV+) */}
                    <OttSelectorRow
                      onSelectOtt={(ott) => setSelectedOtt(ott)}
                      isTvMode={isTvMode}
                    />
                  </>
                )}

                {/* Continue Watching Row (from watch history) */}
                {watchHistory.length > 0 && currentTab === 'all' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base sm:text-xl font-bold text-white font-display flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Continue Watching</span>
                      </h2>
                      <button
                        onClick={() => {
                          setWatchHistory([]);
                          localStorage.removeItem('cinestream_history');
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-300"
                      >
                        Clear History
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {watchHistory.slice(0, 4).map((hist) => {
                        const isTV =
                          hist.media.type === 'tv' ||
                          hist.media.type === 'series' ||
                          hist.media.isSerial;
                        return (
                          <div
                            key={hist.media.id}
                            tabIndex={0}
                            role="button"
                            data-tv-nav="true"
                            onClick={() => handlePlayMedia(hist.media, hist.season, hist.episode)}
                            className="tv-focus relative flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer group transition-all"
                          >
                            <div className="relative w-14 h-18 sm:w-16 sm:h-20 rounded-lg overflow-hidden bg-slate-950 shrink-0">
                              {hist.media.poster ? (
                                <img
                                  src={hist.media.poster}
                                  alt={hist.media.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">
                                  🎬
                                </div>
                              )}
                              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-5 h-5 fill-amber-400 text-amber-400" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                                {hist.media.title}
                              </h3>
                              <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                                {isTV ? `Season ${hist.season} · Ep ${hist.episode}` : 'Movie'}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium mt-1">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Tap to Resume</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              tabIndex={0}
                              onClick={(e) => handleRemoveWatchHistoryItem(hist.media.id, e)}
                              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/40 transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                              title={`Remove ${hist.media.title} from history`}
                              aria-label={`Remove ${hist.media.title} from history`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab: Download TV & Mobile App */}
                {currentTab === 'download' && (
                  <AppDownloadSection
                    isTvMode={isTvMode}
                    onEnableTvMode={() => setIsTvMode(true)}
                  />
                )}

                {/* Tab: Watchlist */}
                {currentTab === 'watchlist' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-amber-400" />
                      <span>My Watchlist ({watchlistedItems.length})</span>
                    </h2>

                    {watchlistedItems.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
                        Your watchlist is empty. Tap "+ Add to List" on any movie, web series, or TV serial to save it here.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                        {watchlistedItems.map((item) => (
                          <MediaCard
                            key={item.id}
                            item={item}
                            onSelect={(media) => handlePlayMedia(media)}
                            isWatchlisted={true}
                            onToggleWatchlist={handleToggleWatchlist}
                            isTvMode={isTvMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: All / Home */}
                {currentTab === 'all' && (
                  <div className="max-w-7xl mx-auto space-y-1 sm:space-y-2">
                    {/* Brand New 2026 & Latest OTT Releases Row */}
                    <CatalogSection
                      title="Fresh 2026 & Latest OTT Releases"
                      subtitle="Pushpa 2, Kalki 2898 AD, Bhool Bhulaiyaa 3, Panchayat, Mirzapur, Ali Baba Aur 40 Bhoot & more"
                      items={mergeUnique(NEW_2026_RELEASES, liveFeeds.newIndianReleases)}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* Live Auto-Synced Trending Today Row */}
                    {liveFeeds.trendingToday.length > 0 && (
                      <CatalogSection
                        title="Live Trending Today Across All OTTs (Auto-Updated)"
                        subtitle="Automatically synced daily with newly released global & Indian OTT titles"
                        items={liveFeeds.trendingToday}
                        onSelect={(media) => handlePlayMedia(media)}
                        watchlist={watchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isTvMode={isTvMode}
                      />
                    )}

                    {/* Popular Indian TV Serials & Daily Shows Row */}
                    <CatalogSection
                      title="Popular Indian TV Serials & Daily Shows"
                      subtitle="Taarak Mehta Ka Ooltah Chashmah, Ali Baba Aur 40 Bhoot, CID, Anupamaa, Baalveer & more (Direct Serial HD)"
                      items={combinedSerials}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* Trending Web Series */}
                    <CatalogSection
                      title="Trending Web Series (All OTT Platforms)"
                      subtitle="Top binge-worthy shows from Netflix, Prime Video, JioHotstar, SonyLIV & ZEE5"
                      items={mergeUnique(TRENDING_SERIES, liveFeeds.liveSeries)}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* Blockbuster Movies */}
                    <CatalogSection
                      title="Blockbuster Movies (New & Superhit)"
                      subtitle="Highest grossing and critical favorites in 1080p Ultra HD"
                      items={mergeUnique(TRENDING_MOVIES, liveFeeds.liveMovies)}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* Hindi & Bollywood Specials */}
                    <CatalogSection
                      title="Hindi & Bollywood Specials"
                      subtitle="Stree 2, Animal, Jawan, 12th Fail, Chumbak, Dangal, 3 Idiots & Dual Audio hits"
                      items={mergeUnique(BOLLYWOOD_SPECIALS, liveFeeds.newIndianReleases)}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* All-Time Classics Section */}
                    <CatalogSection
                      title="All-Time Classics & Legendary Cinema"
                      subtitle="Sholay, DDLJ, Gangs of Wasseypur, Lagaan, Inception, Interstellar, The Dark Knight & Breaking Bad"
                      items={ALL_TIME_CLASSICS}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* Top Anime Series */}
                    <CatalogSection
                      title="Top Anime Series (Sub & Dub)"
                      subtitle="Solo Leveling, Demon Slayer, Jujutsu Kaisen, One Piece, Naruto, Attack on Titan & Dragon Ball"
                      items={mergeUnique(ANIME_COLLECTION, liveFeeds.liveAnime)}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* Dedicated App Download Section on Home Page (Airtel Xstream Box & Mobile App) */}
                    <AppDownloadSection
                      isTvMode={isTvMode}
                      onEnableTvMode={() => setIsTvMode(true)}
                      compact={true}
                    />
                  </div>
                )}

                {/* Category Tabs with Filter Bar & Infinite "Load More" */}
                {(currentTab === 'movies' ||
                  currentTab === 'series' ||
                  currentTab === 'serials' ||
                  currentTab === 'bollywood' ||
                  currentTab === 'anime') && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
                          {currentTab === 'serials' && (
                            <Radio className="w-5 h-5 text-emerald-400" />
                          )}
                          <span>
                            {currentTab === 'movies' && 'All New & Classic Movies'}
                            {currentTab === 'series' && 'All OTT Web Series'}
                            {currentTab === 'serials' && 'Indian TV Serials & Daily Shows'}
                            {currentTab === 'bollywood' && 'Hindi & Bollywood Catalog'}
                            {currentTab === 'anime' && 'Complete Anime Collection'}
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          {currentTab === 'serials'
                            ? 'Powered by Direct TV Serial HD Engine — plays TMKOC, CID, Ali Baba Aur 40 Bhoot, Anupamaa & all daily serials without errors.'
                            : 'Auto-synced with live OTT releases. Browse popular, newest, or all-time classic titles.'}
                        </p>
                      </div>

                      {/* Filter Switcher (Popular / Newest / Classics) */}
                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                        {(['popular', 'newest', 'classic'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setDiscoverFilter(f)}
                            data-tv-nav="true"
                            className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                              discoverFilter === f
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {f === 'popular'
                              ? 'Trending'
                              : f === 'newest'
                              ? 'Newest Releases'
                              : 'Classics / Top Rated'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grid of Items */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {(currentTab === 'movies'
                        ? combinedMovies
                        : currentTab === 'series'
                        ? combinedSeries
                        : currentTab === 'serials'
                        ? mergeUnique(combinedSerials, discoverItems)
                        : currentTab === 'bollywood'
                        ? combinedBollywood
                        : combinedAnime
                      ).map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          onSelect={(media) => handlePlayMedia(media)}
                          isWatchlisted={watchlist.includes(item.id)}
                          onToggleWatchlist={handleToggleWatchlist}
                          isTvMode={isTvMode}
                        />
                      ))}
                    </div>

                    {/* Load More Button for Endless Catalog Discovery */}
                    <div className="pt-4 flex justify-center">
                      <button
                        onClick={handleLoadMoreCategory}
                        disabled={isLoadingMore}
                        data-tv-nav="true"
                        className="tv-focus flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm border border-amber-500/30 shadow-lg transition-all"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading More Titles...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Load More Live Titles (Page {discoverPage + 1})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly dock for Phone & Tablet screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl"
      >
        <button
          onClick={() => {
            setCurrentTab('all');
            setSearchQuery('');
            setActiveMedia(null);
            setSelectedOtt(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'all' && !searchQuery ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('movies');
            setSearchQuery('');
            setActiveMedia(null);
            setSelectedOtt(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'movies' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Movies</span>
        </button>

        {/* Center Prominent Voice Search Action */}
        <button
          onClick={() => setShowVoiceSearch(true)}
          className="relative -top-2.5 flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
          title="Voice Search (Hindi or English)"
        >
          <Mic className="w-5 h-5 stroke-[2.2]" />
        </button>

        <button
          onClick={() => {
            setCurrentTab('serials');
            setSearchQuery('');
            setActiveMedia(null);
            setSelectedOtt(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'serials' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Serials</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('download');
            setSearchQuery('');
            setActiveMedia(null);
            setSelectedOtt(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'download' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Get App</span>
        </button>
      </nav>

      {/* Floating Smart TV Remote Guide & App Download Shortcut (Desktop/TV) */}
      <aside
        aria-label="Smart TV shortcuts"
        className="hidden md:flex fixed bottom-4 right-4 z-30 items-center gap-2"
      >
        <button
          onClick={() => {
            setCurrentTab('download');
            setActiveMedia(null);
            setSelectedOtt(null);
          }}
          data-tv-nav="true"
          className="tv-focus flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 shadow-xl backdrop-blur-md text-xs font-bold"
          title="Install TV App (Airtel Xstream Box) & Mobile App"
        >
          <Download className="w-4 h-4" />
          <span>Download TV / Mobile App</span>
        </button>

        <button
          onClick={() => setShowTvGuide(true)}
          data-tv-nav="true"
          className="tv-focus flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700 shadow-xl backdrop-blur-md text-xs font-semibold"
          title="TV Remote Shortcuts Guide"
        >
          <Tv className="w-4 h-4" />
          <span>TV Remote Keys</span>
        </button>
      </aside>

      {/* Direct IMDb / TMDB Modal */}
      {showDirectModal && (
        <DirectIdModal
          onPlayDirect={handlePlayDirect}
          onClose={() => setShowDirectModal(false)}
        />
      )}

      {/* TV Guide Modal */}
      {showTvGuide && <TvGuideModal onClose={() => setShowTvGuide(false)} />}

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={showVoiceSearch}
        onClose={() => setShowVoiceSearch(false)}
        onSearchSubmit={(q) => {
          setSearchQuery(q);
          setCurrentTab('all');
          setActiveMedia(null);
          setSelectedOtt(null);
        }}
        isTvMode={isTvMode}
      />
    </div>
  );
}
