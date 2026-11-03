import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Volume2,
  Settings2,
  Check,
  CheckCircle2,
  Play,
  X,
  Timer,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Episode, MediaItem, StreamServer, VideoQuality } from '../types';
import { DEFAULT_SERVER, STREAM_SERVERS } from '../data/servers';
import { EpisodePicker } from './EpisodePicker';

interface QualityOption {
  id: VideoQuality;
  label: string;
  resolution: string;
  badge: string;
  description: string;
}

export interface PlaybackErrorToast {
  failedServerName: string;
  nextServerName: string;
  attemptNumber: number;
  totalServers: number;
  errorMessage: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  {
    id: '1080p',
    label: '1080p Full HD',
    resolution: '1920×1080',
    badge: 'Highest Available (Default)',
    description: 'Crisp picture quality and uncompressed high bitrate source.',
  },
  {
    id: '720p',
    label: '720p HD',
    resolution: '1280×720',
    badge: 'Fast Buffer',
    description: 'Smooth streaming for slower TV internet connections.',
  },
  {
    id: '360p',
    label: '360p SD',
    resolution: '640×360',
    badge: 'Data Saver',
    description: 'Minimal bandwidth usage and quick loading.',
  },
  {
    id: 'auto',
    label: 'Auto (Adaptive)',
    resolution: 'Auto HLS',
    badge: 'Adaptive',
    description: 'Dynamically adapts quality based on connection speed.',
  },
];

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
  isTvMode = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [qualityNotification, setQualityNotification] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<PlaybackErrorToast | null>(null);
  const errorToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server state - stable and manual selection (no disruptive auto-switching timers)
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [showServerMenu, setShowServerMenu] = useState<boolean>(false);
  const activeServer = STREAM_SERVERS[serverIndex] || DEFAULT_SERVER;

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

  // Preferred quality state - Defaults to the highest available source (1080p)
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>(() => {
    try {
      const saved = localStorage.getItem('cinestream_preferred_quality');
      if (saved === '1080p' || saved === '720p' || saved === '360p' || saved === 'auto') {
        return saved as VideoQuality;
      }
    } catch {}
    return '1080p'; // Default to highest available source
  });

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTV = media.type === 'tv' || media.type === 'series';

  // Next episode details computation
  const getNextEpisodeInfo = () => {
    if (!isTV) return null;
    const currentSeasonEps = episodesMap[currentSeason] || [];
    const maxEpInSeason = currentSeasonEps.length || 24;

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

  // Trigger countdown when video finishes
  const triggerNextEpisodeCountdown = () => {
    if (!isTV || !isAutoPlayEnabled) return;
    const nextInfo = getNextEpisodeInfo();
    if (!nextInfo) return; // End of series, no next episode
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

  // 5-second countdown timer effect for next episode
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

  // Reset states whenever media or episode changes
  useEffect(() => {
    setCountdown(null);
    setServerIndex(0);
    setErrorToast(null);
  }, [media.id, currentSeason, currentEpisode]);

  // Manual Next Server trigger (Explicit user action or user-approved retry)
  const handleNextServer = (reason?: string) => {
    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    const nextServer = STREAM_SERVERS[nextIdx];
    setServerIndex(nextIdx);
    setIframeKey((prev) => prev + 1);
    setQualityNotification(`Switched to Server ${nextIdx + 1}: ${nextServer.name}`);
    setTimeout(() => setQualityNotification(null), 3000);
  };

  // Select specific server
  const handleSelectServerByIndex = (idx: number) => {
    if (idx === serverIndex) return;
    setServerIndex(idx);
    setShowServerMenu(false);
    setIframeKey((prev) => prev + 1);
    const chosen = STREAM_SERVERS[idx];
    setQualityNotification(`Connected to Server ${idx + 1}: ${chosen.name}`);
    setTimeout(() => setQualityNotification(null), 3000);
  };

  // Playback error notification with option for user to switch
  const handlePlaybackErrorNotice = (errorReason?: string) => {
    const currentFailed = STREAM_SERVERS[serverIndex] || activeServer;
    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    const nextTarget = STREAM_SERVERS[nextIdx];

    const toastData: PlaybackErrorToast = {
      failedServerName: currentFailed.name,
      nextServerName: nextTarget.name,
      attemptNumber: serverIndex + 1,
      totalServers: STREAM_SERVERS.length,
      errorMessage: errorReason || 'Stream unavailable on this mirror',
    };
    setErrorToast(toastData);

    if (errorToastTimerRef.current) clearTimeout(errorToastTimerRef.current);
    errorToastTimerRef.current = setTimeout(() => {
      setErrorToast(null);
    }, 6000);
  };

  // Listen for iframe postMessage events (detects errors & ended states automatically)
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

        const rawStr =
          typeof payload === 'string'
            ? payload
            : JSON.stringify(payload || '');

        // Detect video ended
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
          return;
        }
      } catch {
        // ignore malformed message events
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [currentSeason, currentEpisode, episodesMap, isAutoPlayEnabled, isTV]);

  // Reliable stream URL computed from active server
  const streamUrl = activeServer.buildUrl({
    type: isTV ? 'tv' : 'movie',
    id: media.id,
    imdbId: media.imdbId || media.id,
    tmdbId: media.tmdbId,
    season: currentSeason,
    episode: currentEpisode,
    quality: currentQuality,
  });

  // Seamless 1-Click Alternate Source Switcher
  const handleSwitchAlternateSource = () => {
    handleNextServer('Manual switch requested');
  };

  // Reload current stream
  const handleReloadStream = () => {
    setIframeKey((prev) => prev + 1);
    setQualityNotification('Reloading video stream...');
    setTimeout(() => setQualityNotification(null), 2500);
  };

  // Keyboard shortcut listener for remote control 'S' (Next Server), 'R' (Reload), 'Q' (Quality)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        handleNextServer('Remote key S pressed');
      } else if (e.key === 'r' || e.key === 'R') {
        handleReloadStream();
      } else if (e.key === 'q' || e.key === 'Q') {
        setShowQualityMenu((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [serverIndex]);

  // Quality switch handler
  const handleQualityChange = (q: VideoQuality) => {
    setCurrentQuality(q);
    setShowQualityMenu(false);
    try {
      localStorage.setItem('cinestream_preferred_quality', q);
    } catch {}
    setIframeKey((prev) => prev + 1);
    setQualityNotification(
      `Stream quality set to ${q.toUpperCase()} ${
        q === '1080p' ? '(Highest Available Source)' : ''
      }`
    );
    setTimeout(() => {
      setQualityNotification(null);
    }, 3500);
  };

  // Episode navigation
  const currentSeasonEpisodes = episodesMap[currentSeason] || [];
  const maxEpisodeInSeason = currentSeasonEpisodes.length || 24;

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

  // Fullscreen toggle
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

  // Idle timer to auto-hide player chrome overlay after 6s during playback
  const resetIdleTimer = () => {
    setShowControlsOverlay(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowControlsOverlay(false);
      setShowQualityMenu(false);
      setShowServerMenu(false);
    }, 6000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [streamUrl]);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetIdleTimer}
      className={`relative w-full bg-black flex flex-col text-slate-100 ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'min-h-[85vh]'
      }`}
    >
      {/* 5-Second Next Episode Countdown Overlay (Netflix Style) */}
      {countdown !== null && nextEpInfo && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden space-y-5">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Circular Countdown Progress Ring */}
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
                <span className="absolute text-2xl font-black text-white font-mono">
                  {countdown}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Episode Finished
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white font-display mt-0.5">
                  Playing Next Episode in {countdown}s...
                </h3>
              </div>
            </div>

            {/* Next Episode Preview Card */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
              <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-slate-850 shrink-0">
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
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-amber-400 font-bold">
                  S{nextEpInfo.season}:E{nextEpInfo.episode}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-400">
                  Season {nextEpInfo.season} · Episode {nextEpInfo.episode}
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-1">
                  {nextEpInfo.title}
                </h4>
                {nextEpInfo.overview && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {nextEpInfo.overview}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={playNextEpisodeImmediately}
                className="tv-focus flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Play Now</span>
              </button>
              <button
                onClick={cancelCountdown}
                className="tv-focus flex items-center justify-center gap-1.5 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold border border-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playback Error Alert Toast with 1-Click Server Switch Action */}
      {errorToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[94%] sm:w-auto bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Playback Issue
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Server {errorToast.attemptNumber}/{errorToast.totalServers}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                Stream not loading on <span className="text-amber-300 font-bold">{errorToast.failedServerName}</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    handleNextServer();
                    setErrorToast(null);
                  }}
                  className="tv-focus px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Switch to {errorToast.nextServerName}</span>
                </button>
                <button
                  onClick={() => handleReloadStream()}
                  className="tv-focus px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                >
                  Retry Current
                </button>
              </div>
            </div>
            <button
              onClick={() => setErrorToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quality & Stream Toast Notification */}
      {qualityNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{qualityNotification}</span>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div
        className={`transition-opacity duration-300 z-30 ${
          showControlsOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } bg-gradient-to-b from-slate-950/95 via-slate-950/75 to-transparent px-4 py-3 sm:px-6 flex items-center justify-between gap-3`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-700 shadow-md"
            title="Back to Catalog (Esc / Back button)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Browse</span>
          </button>

          <div>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1 font-display">
              {media.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              {isTV ? (
                <span className="text-amber-400 font-semibold">
                  Season {currentSeason} · Episode {currentEpisode}
                </span>
              ) : (
                <span>Movie · {media.year || '1080p'}</span>
              )}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Server {serverIndex + 1}: {activeServer.name.split('(')[0].trim()}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-amber-400 font-mono font-bold">{currentQuality.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right: Server Selector Dropdown, Quality Selector, Next Server & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Server Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowServerMenu((prev) => !prev);
                setShowQualityMenu(false);
              }}
              className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-md transition-all"
              title="Select Streaming Server"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Server {serverIndex + 1}</span>
            </button>

            {showServerMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white">Choose Stream Server</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Click to switch if a server does not play
                  </p>
                </div>
                {STREAM_SERVERS.map((srv, idx) => {
                  const isCurrent = idx === serverIndex;
                  return (
                    <button
                      key={srv.id}
                      onClick={() => handleSelectServerByIndex(idx)}
                      className={`tv-focus w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                          <span>Server {idx + 1}: {srv.name.split('(')[0].trim()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {srv.quality} · {srv.badge}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual Quality Selector Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowQualityMenu((prev) => !prev);
                setShowServerMenu(false);
              }}
              className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-md transition-all"
              title="Manual Quality Selector: 1080p, 720p, 360p, Auto (Shortcut: Q)"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentQuality.toUpperCase()}</span>
            </button>

            {/* Quality Dropdown Menu */}
            {showQualityMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Select Resolution</span>
                    <span className="text-[10px] text-amber-400 font-mono">1080p Default</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Stream defaults to highest available source
                  </p>
                </div>
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = currentQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleQualityChange(opt.id)}
                      className={`tv-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{opt.label}</span>
                          <span className="text-[10px] font-normal text-slate-400 font-mono">
                            ({opt.resolution})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {opt.description}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 1-Click Next Server Switcher (Shortcut: S) */}
          <button
            onClick={handleSwitchAlternateSource}
            className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
            title="Next Server (Shortcut: S)"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Next Server</span>
          </button>

          {/* Reload Stream Button */}
          <button
            onClick={handleReloadStream}
            className="tv-focus hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 shadow-md"
            title="Reload video stream (Shortcut: R)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reload</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="tv-focus p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Streaming Iframe Container with Permissive Setup (Plays directly on page across Phone, Tablet, Laptop, TV) */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden aspect-video sm:aspect-auto sm:min-h-[75vh]">
        <iframe
          key={`${iframeKey}-${streamUrl}-${currentQuality}`}
          src={streamUrl}
          title={media.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
          onError={() => handlePlaybackErrorNotice('Stream connection failed')}
          className="w-full h-full border-0 bg-black"
        />
      </div>

      {/* TV Series Episode Jumper Bar (docked below player or on TV screen) */}
      {isTV && (
        <div
          className={`transition-opacity duration-300 z-30 ${
            showControlsOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } bg-slate-950/95 border-t border-slate-800/80 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevEp}
              disabled={currentSeason === 1 && currentEpisode === 1}
              className="tv-focus flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-slate-300 border border-slate-800"
              title="Previous Episode (P)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Ep</span>
            </button>

            <button
              onClick={() => setShowEpisodeModal(true)}
              className="tv-focus flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-400 border border-slate-700"
              title="Select Season and Episode"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>S{currentSeason} : E{currentEpisode}</span>
            </button>

            <button
              onClick={handleNextEp}
              className="tv-focus flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800"
              title="Next Episode (N)"
            >
              <span>Next Ep</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Test 5s Countdown Button */}
            {nextEpInfo && (
              <button
                onClick={triggerNextEpisodeCountdown}
                className="tv-focus hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-amber-400 border border-slate-800"
                title="Test 5-Second Auto-Play Next Countdown"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Test Next Ep Countdown</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {/* Auto-Play Next Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-slate-300 font-medium">Auto-Play Next Episode:</span>
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
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAutoPlayEnabled ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                    isAutoPlayEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            <span className="hidden lg:inline text-slate-500">
              Keys: <strong>S</strong> (Switch Source), <strong>Q</strong> (Quality), <strong>N</strong> (Next Ep), <strong>P</strong> (Prev Ep), <strong>F</strong> (Fullscreen)
            </span>
          </div>
        </div>
      )}

      {/* Quality Ribbon & TV Info Dock (shown when not fullscreen) */}
      {!isFullscreen && (
        <div className="bg-slate-950 px-4 py-4 sm:px-6 lg:px-8 border-t border-slate-800 space-y-3">
          {/* Quality Selector Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span>Stream Quality:</span>
            </div>

            {/* Quality Switcher Buttons */}
            <div className="flex items-center gap-1.5">
              {QUALITY_OPTIONS.map((opt) => {
                const active = currentQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleQualityChange(opt.id)}
                    className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                    }`}
                  >
                    {opt.id.toUpperCase()}
                    {opt.id === '1080p' && (
                      <span className="ml-1 text-[10px] opacity-80">(Highest)</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSwitchAlternateSource}
                className="tv-focus flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                <Zap className="w-3 h-3" />
                <span>Switch Alternate Source (#{serverIndex + 1})</span>
              </button>
              <span className="text-[11px] text-emerald-400 font-medium">
                1080p Stream Active
              </span>
            </div>
          </div>

          {/* Hindi / Auto-Play / TV Remote Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">Zero Server Failure Engine:</strong> If any upstream stream buffers or reports an error, press <strong>"Alternate Source"</strong> or remote key <strong>S</strong> to auto-switch to a redundant high-speed CDN.
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">Hindi & Multi-Audio:</strong> Primary stream engine automatically loads native Hindi audio and multi-language subs.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episode Picker Modal */}
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
