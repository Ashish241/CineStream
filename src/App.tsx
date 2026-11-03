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
} from './data/curatedCatalog';
import { OTT_PLATFORMS, OttPlatform } from './data/ottPlatforms';
import { searchCatalog, fetchMediaDetails } from './services/catalogService';
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
import {
  Clock,
  Bookmark,
  Tv,
  Play,
  RotateCcw,
  Loader2,
} from 'lucide-react';

export default function App() {
  const { isTvMode, toggleTvMode } = useTvMode();

  // Activate 2D spatial grid navigation for Smart TV D-pad traversal
  useTvSpatialNavigation(true);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Active OTT Hub state (Netflix, Prime, Hotstar, SonyLIV, JioCinema, Apple TV+)
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

  // Save watchlist
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

  // Add to watch history
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
      ].slice(0, 10);
      try {
        localStorage.setItem('cinestream_history', JSON.stringify(next));
      } catch (e) {
        console.error(e);
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
    }, 350);

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

    // If TV show, fetch full seasons and episodes list
    if (media.type === 'tv' || media.type === 'series') {
      try {
        const details = await fetchMediaDetails(media.type, media.imdbId || media.id);
        if (details.episodes && Object.keys(details.episodes).length > 0) {
          setEpisodesMap(details.episodes);
        }
      } catch (err) {
        console.warn('Could not fetch episodes list, fallback to manual numbering', err);
      }
    }

    // Scroll window to top for theater view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Direct ID launcher
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

  // Smart TV Remote hotkeys handler
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

  // Watchlist items array
  const allCurated = useMemo(() => {
    const map = new Map<string, MediaItem>();
    [
      ...HERO_FEATURED_ITEMS,
      ...NEW_2026_RELEASES,
      ...ALL_TIME_CLASSICS,
      ...TRENDING_SERIES,
      ...TRENDING_MOVIES,
      ...BOLLYWOOD_SPECIALS,
      ...ANIME_COLLECTION,
    ].forEach((m) => map.set(m.id, m));
    return map;
  }, []);

  const watchlistedItems = useMemo(() => {
    return watchlist.map(
      (id) =>
        allCurated.get(id) ||
        ({ id, title: `Title ${id}`, type: 'movie' as const, poster: '' } as MediaItem)
    );
  }, [watchlist, allCurated]);

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${
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
      <main className="flex-1 w-full pb-16">
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
          /* Dedicated Authentic OTT Platform UI with Exit Button */
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
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
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
                    className="text-xs text-amber-400 hover:underline"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
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
                {/* Hero Featured Showcase (Sliding ONLY brand new 2026 and newest releases) */}
                {currentTab === 'all' && (
                  <>
                    <HeroBanner
                      items={HERO_FEATURED_ITEMS}
                      onPlay={(item) => handlePlayMedia(item)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                    />

                    {/* Dedicated OTT Platforms Hub Selector (Netflix, Prime, Hotstar, SonyLIV, JioCinema, Apple TV+) */}
                    <OttSelectorRow
                      onSelectOtt={(ott) => setSelectedOtt(ott)}
                      isTvMode={isTvMode}
                    />
                  </>
                )}

                {/* Continue Watching Row (from watch history) */}
                {watchHistory.length > 0 && currentTab === 'all' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Continue Watching on TV</span>
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
                        const isTV = hist.media.type === 'tv' || hist.media.type === 'series';
                        return (
                          <div
                            key={hist.media.id}
                            tabIndex={0}
                            role="button"
                            onClick={() => handlePlayMedia(hist.media, hist.season, hist.episode)}
                            className="tv-focus flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer group transition-all"
                          >
                            <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-slate-950 shrink-0">
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

                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                                {hist.media.title}
                              </h3>
                              <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                                {isTV ? `Season ${hist.season} · Ep ${hist.episode}` : 'Movie'}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium mt-1">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Click to Resume</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab: Watchlist */}
                {currentTab === 'watchlist' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-amber-400" />
                      <span>My TV Watchlist ({watchlistedItems.length})</span>
                    </h2>

                    {watchlistedItems.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
                        Your watchlist is empty. Click "+ Add to List" on any movie or series to access it quickly from your TV remote.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                  <div className="max-w-7xl mx-auto space-y-2">
                    {/* Brand New 2026 Releases Row */}
                    <CatalogSection
                      title="Fresh 2026 Releases & New Shows"
                      subtitle="Chumbak, Gram Chikitsalay, Panchayat S3, Mirzapur S3, Ali Baba & more"
                      items={NEW_2026_RELEASES}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    {/* All-Time Classics Section (Inception, Interstellar, Breaking Bad, The Dark Knight) */}
                    <CatalogSection
                      title="All-Time Classics & Legendary Cinema"
                      subtitle="Inception, Interstellar, The Dark Knight, Breaking Bad & highest rated titles"
                      items={ALL_TIME_CLASSICS}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    <CatalogSection
                      title="Trending Web Series"
                      subtitle="Top binge-worthy shows with all seasons & episodes"
                      items={TRENDING_SERIES}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    <CatalogSection
                      title="Blockbuster Movies"
                      subtitle="Highest grossing and critical favorites in 1080p Ultra HD"
                      items={TRENDING_MOVIES}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    <CatalogSection
                      title="Hindi & Bollywood Specials"
                      subtitle="Panchayat, Mirzapur, 12th Fail, Jawan & Dual Audio blockbusters"
                      items={BOLLYWOOD_SPECIALS}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />

                    <CatalogSection
                      title="Top Anime Series"
                      subtitle="High-action Japanese anime series with multi-subtitles"
                      items={ANIME_COLLECTION}
                      onSelect={(media) => handlePlayMedia(media)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      isTvMode={isTvMode}
                    />
                  </div>
                )}

                {/* Tab: Movies */}
                {currentTab === 'movies' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white font-display">
                        Movies Catalog
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Select any blockbuster or classic movie to start streaming instantly in 1080p HD.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {[
                        ...TRENDING_MOVIES,
                        ...ALL_TIME_CLASSICS.filter((m) => m.type === 'movie'),
                        ...BOLLYWOOD_SPECIALS.filter((m) => m.type === 'movie'),
                      ].map((item) => (
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
                  </div>
                )}

                {/* Tab: Web Series */}
                {currentTab === 'series' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white font-display">
                        Web Series Catalog
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Complete web series with season selector, episode list and auto-resume.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {[
                        ...NEW_2026_RELEASES,
                        ...TRENDING_SERIES,
                        ...ALL_TIME_CLASSICS.filter((m) => m.type === 'tv'),
                        ...BOLLYWOOD_SPECIALS.filter((m) => m.type === 'tv'),
                        ...ANIME_COLLECTION,
                      ].map((item) => (
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
                  </div>
                )}

                {/* Tab: Bollywood / Hindi */}
                {currentTab === 'bollywood' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white font-display">
                        Hindi & Bollywood Specials
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Panchayat, Mirzapur, Gram Chikitsalay, Chumbak, 12th Fail & more.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {BOLLYWOOD_SPECIALS.map((item) => (
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
                  </div>
                )}

                {/* Tab: Anime */}
                {currentTab === 'anime' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white font-display">
                        Top Anime Series
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Subbed & Dubbed anime series with episode navigation.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {ANIME_COLLECTION.map((item) => (
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
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Smart TV Remote Guide Button */}
      <aside aria-label="Smart TV shortcuts" className="fixed bottom-4 right-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setShowTvGuide(true)}
          className="tv-focus flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700 shadow-xl backdrop-blur-md text-xs font-semibold"
          title="TV Remote Shortcuts Guide"
        >
          <Tv className="w-4 h-4" />
          <span className="hidden sm:inline">TV Remote Keys</span>
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
