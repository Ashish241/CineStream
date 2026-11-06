import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Play,
  Server,
  X,
  Star,
  Film,
  Tv,
} from 'lucide-react';
import { Episode, MediaItem, StreamServer } from '../types';
import {
  DEFAULT_SERVER,
  STREAM_SERVERS,
  getPreferredServerIndexForMedia,
} from '../data/servers';
import { EpisodePicker } from './EpisodePicker';

interface PlayerViewProps {
  media: MediaItem;
  currentSeason: number;
  currentEpisode: number;
  episodesMap: Record<number, Episode[]>;
  currentServer?: StreamServer;
  onSelectServer?: (server: StreamServer) => void;
  onEpisodeChange: (season: number, episode: number) => void;
  onBack: () => void;
  isTvMode?: boolean;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  media,
  currentSeason,
  currentEpisode,
  episodesMap,
  onEpisodeChange,
  onBack,
}) => {
  const isTV = media.type === 'tv' || media.type === 'series' || Boolean(media.isSerial);

  // Player UI & Menus State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showTopBarInFullscreen, setShowTopBarInFullscreen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Server Routing State (12 Full-Content OTT Streaming Servers - Zero YouTube/Trailer servers)
  const [serverIndex, setServerIndex] = useState<number>(() =>
    getPreferredServerIndexForMedia(media)
  );

  const activeServer = STREAM_SERVERS[serverIndex] || DEFAULT_SERVER;

  // Keep top bar visible whenever a menu or modal is open
  const isAnyMenuOpen = showSourceMenu || showEpisodeModal;

  // 5-Second Next Episode Auto-Play Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cinestream_autoplay_next');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const topMenusRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryCountRef = useRef<number>(0);

  const showToast = useCallback((msg: string, durationMs = 2600) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, durationMs);
  }, []);

  const closeAllMenus = useCallback(() => {
    setShowSourceMenu(false);
  }, []);

  // Close Server dropdown ONLY when clicking outside on phone/laptop or pressing Back/Escape on remote
  useEffect(() => {
    if (!showSourceMenu) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inTop = topMenusRef.current?.contains(target);
      if (!inTop) {
        closeAllMenus();
      }
    };

    const handleEscapeOrBack = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        if (showSourceMenu) {
          e.preventDefault();
          e.stopPropagation();
          closeAllMenus();
        }
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    window.addEventListener('keydown', handleEscapeOrBack, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      window.removeEventListener('keydown', handleEscapeOrBack, true);
    };
  }, [showSourceMenu, closeAllMenus]);

  // Reset state cleanly on media or episode change
  useEffect(() => {
    setCountdown(null);
    autoRetryCountRef.current = 0;
    const preferredIdx = getPreferredServerIndexForMedia(media);
    setServerIndex(preferredIdx);
  }, [media.id, currentSeason, currentEpisode]);

  // Automatic Failover Handler if a server reports a fatal load error
  const triggerAutomaticFailover = (reason?: string) => {
    if (autoRetryCountRef.current >= STREAM_SERVERS.length) {
      return;
    }
    autoRetryCountRef.current += 1;

    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    setServerIndex(nextIdx);
    setIframeKey((prev) => prev + 1);
    try {
      localStorage.setItem(`cinestream_srv_v7_${media.id}`, String(nextIdx));
    } catch {}
    showToast(
      reason
        ? `${reason} — Switching to Server ${nextIdx + 1} (${STREAM_SERVERS[nextIdx].badge})...`
        : `Switched to Server ${nextIdx + 1}: ${STREAM_SERVERS[nextIdx].badge}`
    );
  };

  // Manual Server Switch Handler — cleanly starts the selected server from the beginning
  const handleManualSwitchSource = (targetIdx: number) => {
    closeAllMenus();
    const chosenIdx =
      ((targetIdx % STREAM_SERVERS.length) + STREAM_SERVERS.length) % STREAM_SERVERS.length;
    setServerIndex(chosenIdx);
    setIframeKey((prev) => prev + 1);
    try {
      localStorage.setItem(`cinestream_srv_v7_${media.id}`, String(chosenIdx));
    } catch {}
    showToast(`Switched to Server ${chosenIdx + 1}: ${STREAM_SERVERS[chosenIdx].badge}`);
  };

  // Next episode details computation
  const getNextEpisodeInfo = () => {
    if (!isTV) return null;
    const currentSeasonEps = episodesMap[currentSeason] || [];
    const maxEpInSeason = currentSeasonEps.length || 30;

    if (currentEpisode < maxEpInSeason) {
      const nextEpNum = currentEpisode + 1;
      const nextEpData = currentSeasonEps.find((e) => e.episode === nextEpNum);
      return {
        season: currentSeason,
        episode: nextEpNum,
        title: nextEpData?.title || `Episode ${nextEpNum}`,
        overview: nextEpData?.overview,
        thumbnail: nextEpData?.thumbnail || media.backdrop || media.poster,
      };
    } else if (episodesMap[currentSeason + 1]) {
      const nextSeasonEps = episodesMap[currentSeason + 1];
      const nextEpData = nextSeasonEps?.[0];
      return {
        season: currentSeason + 1,
        episode: 1,
        title: nextEpData?.title || 'Episode 1',
        overview: nextEpData?.overview,
        thumbnail: nextEpData?.thumbnail || media.backdrop || media.poster,
      };
    }
    return null;
  };

  const nextEpInfo = getNextEpisodeInfo();

  const triggerNextEpisodeCountdown = () => {
    if (!isTV || !isAutoPlayEnabled) return;
    const nextInfo = getNextEpisodeInfo();
    if (!nextInfo) return;
    setCountdown(5);
  };

  const cancelCountdown = () => {
    setCountdown(null);
  };

  const playNextEpisodeImmediately = () => {
    const nextInfo = getNextEpisodeInfo();
    if (nextInfo) {
      setCountdown(null);
      onEpisodeChange(nextInfo.season, nextInfo.episode);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      playNextEpisodeImmediately();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Listen for iframe postMessage events (episode ended auto-advance)
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            // plain string
          }
        }

        const isEnded =
          payload === 'ended' ||
          payload === 'video_ended' ||
          payload?.event === 'ended' ||
          payload?.event === 'video_ended' ||
          payload?.type === 'ended' ||
          payload?.type === 'PLAYER_ENDED' ||
          payload?.action === 'ended' ||
          payload?.status === 'ended' ||
          payload?.state === 'ended' ||
          payload?.data === 'ended' ||
          (typeof payload === 'object' && payload?.data?.event === 'ended');

        if (isEnded) {
          triggerNextEpisodeCountdown();
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [currentSeason, currentEpisode, episodesMap, isAutoPlayEnabled, isTV]);

  // Compute active stream URL for the selected full-content OTT server
  const streamUrl = activeServer.buildUrl({
    type: isTV ? 'tv' : 'movie',
    id: media.id,
    imdbId: media.imdbId || media.id,
    tmdbId: media.tmdbId,
    season: currentSeason,
    episode: currentEpisode,
  });

  const handleReloadStream = () => {
    setIframeKey((prev) => prev + 1);
    showToast(`Reloading Server ${serverIndex + 1} (${activeServer.badge})...`);
  };

  const currentSeasonEpisodes = episodesMap[currentSeason] || [];
  const maxEpisodeInSeason = currentSeasonEpisodes.length || 30;
  const availableSeasons = Object.keys(episodesMap)
    .map(Number)
    .sort((a, b) => a - b);

  const handlePrevEp = () => {
    if (currentEpisode > 1) {
      onEpisodeChange(currentSeason, currentEpisode - 1);
    } else if (currentSeason > 1) {
      const prevSeasonEps = episodesMap[currentSeason - 1] || [];
      const targetEp = prevSeasonEps.length || 1;
      onEpisodeChange(currentSeason - 1, targetEp);
    }
  };

  const handleNextEp = () => {
    if (currentEpisode < maxEpisodeInSeason) {
      onEpisodeChange(currentSeason, currentEpisode + 1);
    } else if (episodesMap[currentSeason + 1]) {
      onEpisodeChange(currentSeason + 1, 1);
    } else {
      onEpisodeChange(currentSeason, currentEpisode + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {
          setIsFullscreen(true);
        });
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => setIsFullscreen(false));
    }
  };

  // Sync fullscreen state with browser fullscreenchange event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-hide top header bar only when in Fullscreen mode and no menu is open
  const resetIdleTimer = useCallback(() => {
    setShowTopBarInFullscreen(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isAnyMenuOpen) {
      return;
    }
    idleTimerRef.current = setTimeout(() => {
      if (!isAnyMenuOpen) {
        setShowTopBarInFullscreen(false);
      }
    }, 4000);
  }, [isAnyMenuOpen]);

  useEffect(() => {
    if (isAnyMenuOpen) {
      setShowTopBarInFullscreen(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [streamUrl, isAnyMenuOpen, resetIdleTimer]);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetIdleTimer}
      onTouchStart={resetIdleTimer}
      className={`relative w-full bg-slate-950 flex flex-col text-slate-100 select-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen bg-black' : ''
      }`}
    >
      {/* 5-Second Next Episode Countdown Overlay */}
      {countdown !== null && nextEpInfo && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-5 sm:p-8 text-center shadow-2xl relative overflow-hidden space-y-5">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeDasharray="213.6"
                    strokeDashoffset={`${213.6 * (1 - countdown / 5)}`}
                    strokeLinecap="round"
                    className="text-amber-500 transition-all duration-1000 ease-linear"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-2xl font-black text-white font-mono tabular-nums">
                  {countdown}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-400">Up Next</span>
                <h3 className="text-lg sm:text-xl font-bold text-white font-display mt-0.5">
                  Playing Next Episode in {countdown}s...
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
              <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                {nextEpInfo.thumbnail ? (
                  <img
                    src={nextEpInfo.thumbnail}
                    alt={nextEpInfo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                    S{nextEpInfo.season}:E{nextEpInfo.episode}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-400">
                  Season {nextEpInfo.season} · Episode {nextEpInfo.episode}
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-1">{nextEpInfo.title}</h4>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={playNextEpisodeImmediately}
                className="tv-focus flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Play Now</span>
              </button>
              <button
                onClick={cancelCountdown}
                className="tv-focus flex items-center justify-center gap-1.5 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold border border-slate-700"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 max-w-[92vw] truncate pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Header Bar (Sits cleanly above the merged server video player so controls never conflict) */}
      <div
        ref={topMenusRef}
        className={`transition-opacity duration-200 z-40 ${
          !isFullscreen || showTopBarInFullscreen || isAnyMenuOpen
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        } ${
          isFullscreen
            ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 via-black/75 to-transparent'
            : 'bg-slate-950 border-b border-slate-900'
        } px-3 py-2.5 sm:px-6 lg:px-10 flex items-center justify-between gap-2`}
      >
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-800 shadow-sm shrink-0"
            title="Back to Browse"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-base lg:text-lg font-bold text-white truncate font-display">
              {media.title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 font-medium truncate">
              {isTV ? (
                <span className="text-amber-400 font-semibold shrink-0">
                  Season {currentSeason} · Episode {currentEpisode}
                </span>
              ) : (
                <span className="text-amber-400 font-semibold shrink-0">
                  Full Movie · {media.year || '1080p HD'}
                </span>
              )}
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-emerald-400 font-semibold truncate">
                Server {serverIndex + 1}: {activeServer.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Prev/Next Ep, Episodes List, Persistent 12-Server Selector, Reload & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isTV && (
            <>
              <button
                type="button"
                onClick={handlePrevEp}
                disabled={currentSeason === 1 && currentEpisode === 1}
                data-tv-nav="true"
                className="tv-focus hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-bold border border-slate-800 whitespace-nowrap"
                title="Previous Episode"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Ep</span>
              </button>

              <button
                type="button"
                onClick={handleNextEp}
                data-tv-nav="true"
                className="tv-focus hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm whitespace-nowrap"
                title="Next Episode"
              >
                <span>Next Ep</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setShowEpisodeModal(true);
                }}
                data-tv-nav="true"
                className="tv-focus flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold border border-slate-800 whitespace-nowrap"
                title="Open All Seasons & Episodes List"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Episodes List</span>
                <span className="sm:hidden">S{currentSeason}:E{currentEpisode}</span>
              </button>
            </>
          )}

          {/* Persistent 12-Server Selector Dropdown (Stays open until user selects a server, presses Back, or clicks outside) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSourceMenu((prev) => !prev);
              }}
              data-tv-nav="true"
              className={`tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                showSourceMenu
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/40'
              }`}
              title="Select Full-Content OTT Streaming Server"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Server {serverIndex + 1}</span>
            </button>

            {showSourceMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[78vh] overflow-y-auto bg-slate-900 border border-amber-500/50 rounded-2xl p-2.5 shadow-2xl z-50 text-left space-y-1.5"
              >
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-white">
                      Select Full-Content OTT Server (12 Servers)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      If a show is slow or unavailable on one server, switch to another below:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSourceMenu(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Close Server Menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {STREAM_SERVERS.map((srv, idx) => {
                  const isCurrent = idx === serverIndex;
                  return (
                    <button
                      type="button"
                      key={srv.id}
                      onClick={() => handleManualSwitchSource(idx)}
                      data-tv-nav="true"
                      className={`tv-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/20 text-white font-bold border border-amber-500/50'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">
                          Server {idx + 1}: {srv.badge}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{srv.name}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reload Stream */}
          <button
            onClick={handleReloadStream}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800"
            title="Reload Current Server"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            data-tv-nav="true"
            className="tv-focus p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Seamlessly Merged Native Server Video Player Viewport
          - No fake timer or overlapping fake controls
          - Direct native Play/Pause, -10s/+10s, Seekbar, Quality (1080p/4K), Multi-Audio & Subtitles without restarting */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${
          isFullscreen
            ? 'flex-1 h-full'
            : 'aspect-video sm:aspect-auto sm:h-[62vh] md:h-[70vh] lg:h-[78vh] xl:h-[84vh] 2xl:h-[86vh]'
        }`}
      >
        <iframe
          ref={iframeRef}
          key={`${iframeKey}-${streamUrl}`}
          src={streamUrl}
          title={media.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
          onError={() => triggerAutomaticFailover('Connection timeout')}
          className="w-full h-full border-0 bg-black"
        />
      </div>

      {/* Details, 12-Server Bar & Interactive Episodes Section Below Video (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 py-5 sm:py-8 space-y-6">
          {/* Quick Horizontal 12-Server Switcher Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Server className="w-4 h-4 text-amber-400" />
                <span>Full-Content OTT Streaming Servers (Switch anytime if one server is slow):</span>
              </div>
              <span className="text-[11px] text-amber-400 font-semibold hidden sm:inline">
                Active: Server {serverIndex + 1} ({activeServer.badge})
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {STREAM_SERVERS.map((srv, idx) => {
                const isCurrent = idx === serverIndex;
                return (
                  <button
                    type="button"
                    key={srv.id}
                    onClick={() => handleManualSwitchSource(idx)}
                    data-tv-nav="true"
                    className={`tv-focus px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Server {idx + 1}: {srv.badge}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Now Playing Info & Quick Action Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  {isTV ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                  <span>
                    {isTV ? `Season ${currentSeason} · Episode ${currentEpisode}` : 'Full Movie'}
                  </span>
                </span>
                {media.rating && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{media.rating} IMDb</span>
                    </span>
                  </>
                )}
                {media.year && (
                  <>
                    <span>·</span>
                    <span>{media.year}</span>
                  </>
                )}
                <span>·</span>
                <span className="text-emerald-400">{activeServer.quality}</span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-display">
                {media.title}
              </h1>

              {media.overview && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {media.overview}
                </p>
              )}
            </div>

            {/* Right Controls: Prev/Next Ep & Episode List for Series */}
            {isTV && (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={handlePrevEp}
                  disabled={currentSeason === 1 && currentEpisode === 1}
                  data-tv-nav="true"
                  className="tv-focus flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-semibold text-slate-200 border border-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Episode</span>
                </button>

                <button
                  onClick={handleNextEp}
                  data-tv-nav="true"
                  className="tv-focus flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20"
                >
                  <span>Next Episode</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowEpisodeModal(true)}
                  data-tv-nav="true"
                  className="tv-focus flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs sm:text-sm font-bold border border-slate-800"
                >
                  <Layers className="w-4 h-4" />
                  <span>All Episodes</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Season & Episode Grid (For Web Series, TV Serials & Anime) */}
          {isTV && availableSeasons.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {availableSeasons.map((sNum) => {
                    const active = sNum === currentSeason;
                    return (
                      <button
                        key={sNum}
                        onClick={() => onEpisodeChange(sNum, 1)}
                        data-tv-nav="true"
                        className={`tv-focus px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                          active
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        Season {sNum}
                      </button>
                    );
                  })}
                </div>

                {/* Auto-Play Next Episode Toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-300 self-start sm:self-auto">
                  <span className="font-medium">Auto-Play Next Episode</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAutoPlayEnabled}
                    onClick={() => {
                      setIsAutoPlayEnabled((prev) => {
                        const next = !prev;
                        try {
                          localStorage.setItem('cinestream_autoplay_next', String(next));
                        } catch {}
                        return next;
                      });
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      isAutoPlayEnabled ? 'bg-amber-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow transition duration-200 ease-in-out ${
                        isAutoPlayEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Responsive Episode Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                {currentSeasonEpisodes.map((ep) => {
                  const isCurrentEp = ep.episode === currentEpisode;
                  return (
                    <button
                      key={`${ep.season}-${ep.episode}`}
                      onClick={() => {
                        onEpisodeChange(currentSeason, ep.episode);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      data-tv-nav="true"
                      className={`tv-focus flex items-center gap-3 p-3 rounded-2xl text-left border transition-all ${
                        isCurrentEp
                          ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg'
                          : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-extrabold shrink-0 ${
                          isCurrentEp
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-950 text-amber-400 border border-slate-800'
                        }`}
                      >
                        {isCurrentEp ? <Play className="w-4 h-4 fill-current" /> : `E${ep.episode}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {ep.title || `Episode ${ep.episode}`}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {isCurrentEp
                            ? 'Now Playing'
                            : ep.overview || `Season ${currentSeason} · Ep ${ep.episode}`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Episode Picker Modal (Works both in normal mode and inside Fullscreen!) */}
      {showEpisodeModal && (
        <EpisodePicker
          title={media.title}
          currentSeason={currentSeason}
          currentEpisode={currentEpisode}
          episodesMap={episodesMap}
          onSelectEpisode={(s, e) => {
            onEpisodeChange(s, e);
            setShowEpisodeModal(false);
          }}
          onClose={() => setShowEpisodeModal(false)}
        />
      )}
    </div>
  );
};
