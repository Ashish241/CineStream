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
  Tv,
  Radio,
  Loader2,
} from 'lucide-react';
import { Episode, MediaItem, StreamServer, VideoQuality } from '../types';
import {
  DEFAULT_SERVER,
  STREAM_SERVERS,
  getPreferredServerIndexForMedia,
} from '../data/servers';
import {
  DirectSerialStream,
  fetchDirectSerialStreams,
  isLikelyTvSerial,
} from '../services/catalogService';
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
  const isSerialMedia = isLikelyTvSerial(media);
  const isTV = media.type === 'tv' || media.type === 'series' || isSerialMedia;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [qualityNotification, setQualityNotification] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<PlaybackErrorToast | null>(null);
  const errorToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server state: starts on optimal server for media type
  const [serverIndex, setServerIndex] = useState<number>(() =>
    getPreferredServerIndexForMedia(media)
  );
  const [showServerMenu, setShowServerMenu] = useState<boolean>(false);

  // Direct TV Serial & Hindi Show Resolver Engine (Automatically active for Indian TV serials)
  const [useDirectSerialEngine, setUseDirectSerialEngine] = useState<boolean>(isSerialMedia);
  const [directStreams, setDirectStreams] = useState<DirectSerialStream[]>([]);
  const [selectedDirectMirror, setSelectedDirectMirror] = useState<number>(0);
  const [isLoadingDirectStreams, setIsLoadingDirectStreams] = useState<boolean>(false);

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

  // Preferred quality state - Defaults to 1080p
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>(() => {
    try {
      const saved = localStorage.getItem('cinestream_preferred_quality');
      if (saved === '1080p' || saved === '720p' || saved === '360p' || saved === 'auto') {
        return saved as VideoQuality;
      }
    } catch {}
    return '1080p';
  });

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve Direct TV Serial / Show Streams whenever serial engine is active or episode changes
  useEffect(() => {
    let cancelled = false;
    const shouldFetch = isSerialMedia || useDirectSerialEngine;
    if (!shouldFetch) return;

    setIsLoadingDirectStreams(true);
    fetchDirectSerialStreams(media.title, currentSeason, currentEpisode, !isTV)
      .then((streams) => {
        if (cancelled) return;
        setDirectStreams(streams);
        setSelectedDirectMirror(0);
        // If no direct streams found for a serial, gracefully fall back to MultiEmbed / AutoEmbed India
        if (streams.length === 0 && useDirectSerialEngine) {
          setUseDirectSerialEngine(false);
          setServerIndex(getPreferredServerIndexForMedia(media));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDirectStreams(false);
      });

    return () => {
      cancelled = true;
    };
  }, [media.id, media.title, currentSeason, currentEpisode, isSerialMedia, useDirectSerialEngine, isTV]);

  // Reset states whenever media or episode changes
  useEffect(() => {
    setCountdown(null);
    const serialFlag = isLikelyTvSerial(media);
    setUseDirectSerialEngine(serialFlag);
    setServerIndex(getPreferredServerIndexForMedia(media));
    setErrorToast(null);
  }, [media.id, currentSeason, currentEpisode]);

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

  // Manual Next Server trigger
  const handleNextServer = () => {
    if (useDirectSerialEngine && directStreams.length > 1 && selectedDirectMirror + 1 < directStreams.length) {
      const nextMirror = selectedDirectMirror + 1;
      setSelectedDirectMirror(nextMirror);
      setQualityNotification(`Switched to Direct Serial Mirror #${nextMirror + 1}`);
      setTimeout(() => setQualityNotification(null), 3000);
      return;
    }
    setUseDirectSerialEngine(false);
    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    const nextServer = STREAM_SERVERS[nextIdx];
    setServerIndex(nextIdx);
    setIframeKey((prev) => prev + 1);
    setQualityNotification(`Switched to Server ${nextIdx + 1}: ${nextServer.name}`);
    setTimeout(() => setQualityNotification(null), 3000);
  };

  // Select specific standard server
  const handleSelectServerByIndex = (idx: number) => {
    setUseDirectSerialEngine(false);
    setServerIndex(idx);
    setShowServerMenu(false);
    setIframeKey((prev) => prev + 1);
    const chosen = STREAM_SERVERS[idx];
    setQualityNotification(`Connected to Server ${idx + 1}: ${chosen.name}`);
    setTimeout(() => setQualityNotification(null), 3000);
  };

  // Activate Direct Serial / Hindi Episode Engine
  const handleActivateDirectSerialEngine = () => {
    setUseDirectSerialEngine(true);
    setShowServerMenu(false);
    setQualityNotification(`Connected to Direct TV Serial & Hindi HD Engine`);
    setTimeout(() => setQualityNotification(null), 3000);
  };

  // Playback error notification with option for user to switch
  const handlePlaybackErrorNotice = (errorReason?: string) => {
    const currentFailed = STREAM_SERVERS[serverIndex] || activeServer;
    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    const nextTarget = STREAM_SERVERS[nextIdx];

    const toastData: PlaybackErrorToast = {
      failedServerName: useDirectSerialEngine ? 'Direct Serial Stream' : currentFailed.name,
      nextServerName: nextTarget.name,
      attemptNumber: serverIndex + 1,
      totalServers: STREAM_SERVERS.length,
      errorMessage: errorReason || 'Stream unavailable on this mirror',
    };
    setErrorToast(toastData);

    if (errorToastTimerRef.current) clearTimeout(errorToastTimerRef.current);
    errorToastTimerRef.current = setTimeout(() => {
      setErrorToast(null);
    }, 7000);
  };

  // Listen for iframe postMessage events (detects video ended state)
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

  // Compute active stream URL (either Direct TV Serial Engine or selected TMDB/IMDb Server)
  const activeDirectStream = directStreams[selectedDirectMirror];
  const streamUrl =
    useDirectSerialEngine && activeDirectStream
      ? activeDirectStream.embedUrl
      : activeServer.buildUrl({
          type: isTV ? 'tv' : 'movie',
          id: media.id,
          imdbId: media.imdbId || media.id,
          tmdbId: media.tmdbId,
          season: currentSeason,
          episode: currentEpisode,
          quality: currentQuality,
        });

  const handleReloadStream = () => {
    setIframeKey((prev) => prev + 1);
    setQualityNotification('Reloading video stream...');
    setTimeout(() => setQualityNotification(null), 2500);
  };

  // Keyboard shortcut listener for remote control 'S' (Next Server), 'R' (Reload), 'Q' (Quality)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        handleNextServer();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReloadStream();
      } else if (e.key === 'q' || e.key === 'Q') {
        setShowQualityMenu((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [serverIndex, useDirectSerialEngine, selectedDirectMirror, directStreams.length]);

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
  const maxEpisodeInSeason = currentSeasonEpisodes.length || 30;

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

  const resetIdleTimer = () => {
    setShowControlsOverlay(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowControlsOverlay(false);
      setShowQualityMenu(false);
      setShowServerMenu(false);
    }, 6500);
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
      onTouchStart={resetIdleTimer}
      className={`relative w-full bg-black flex flex-col text-slate-100 ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : ''
      }`}
    >
      {/* 5-Second Next Episode Countdown Overlay */}
      {countdown !== null && nextEpInfo && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-5 sm:p-8 text-center shadow-2xl relative overflow-hidden space-y-5">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

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
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[94%] sm:w-auto bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Stream Switcher
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Server {errorToast.attemptNumber}/{errorToast.totalServers}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                Not playing on <span className="text-amber-300 font-bold">{errorToast.failedServerName}</span>?
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    handleActivateDirectSerialEngine();
                    setErrorToast(null);
                  }}
                  className="tv-focus px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Try Direct Hindi/Serial Engine</span>
                </button>
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
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 max-w-[92vw] truncate">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{qualityNotification}</span>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div
        className={`transition-opacity duration-300 z-30 ${
          showControlsOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between gap-2`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="tv-focus flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-700 shadow-md shrink-0"
            title="Back to Catalog (Esc / Back button)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-white truncate font-display">
              {media.title}
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-400 font-medium truncate">
              {isTV ? (
                <span className="text-amber-400 font-semibold shrink-0">
                  S{currentSeason} · Ep {currentEpisode}
                </span>
              ) : (
                <span className="shrink-0">Movie · {media.year || 'HD'}</span>
              )}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">
                  {useDirectSerialEngine && activeDirectStream
                    ? `Direct TV Serial HD (Mirror ${selectedDirectMirror + 1})`
                    : `Server ${serverIndex + 1}: ${activeServer.name.split('(')[0].trim()}`}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Server Selector Dropdown, Quality Selector, Next Server & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Direct TV Serial Engine Quick Toggle Button */}
          <button
            onClick={handleActivateDirectSerialEngine}
            className={`tv-focus hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              useDirectSerialEngine
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-emerald-500/40'
            }`}
            title="Direct Episode Engine for Indian TV Serials & Daily Shows"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>TV Serial Engine</span>
          </button>

          {/* Server Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowServerMenu((prev) => !prev);
                setShowQualityMenu(false);
              }}
              className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-md transition-all"
              title="Select Streaming Server"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{useDirectSerialEngine ? 'Serial HD' : `Srv ${serverIndex + 1}`}</span>
            </button>

            {showServerMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 max-h-[75vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white">Choose Stream Server</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Switch instantly if a show or serial gives an error
                  </p>
                </div>

                {/* Special Direct TV Serial Engine Option */}
                <button
                  onClick={handleActivateDirectSerialEngine}
                  className={`tv-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                    useDirectSerialEngine
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-emerald-400 hover:bg-slate-850 border border-emerald-500/20'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 shrink-0" />
                      <span>Direct TV Serial & Hindi Engine</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Best for Indian TV Serials (TMKOC, CID, Ali Baba, Anupamaa)
                    </div>
                  </div>
                  {useDirectSerialEngine && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>

                {STREAM_SERVERS.map((srv, idx) => {
                  const isCurrent = !useDirectSerialEngine && idx === serverIndex;
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

          {/* Quality Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowQualityMenu((prev) => !prev);
                setShowServerMenu(false);
              }}
              className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-md transition-all"
              title="Manual Quality Selector: 1080p, 720p, 360p, Auto"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentQuality.toUpperCase()}</span>
            </button>

            {showQualityMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Select Resolution</span>
                    <span className="text-[10px] text-amber-400 font-mono">1080p Default</span>
                  </div>
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

          {/* 1-Click Next Server Switcher */}
          <button
            onClick={handleNextServer}
            className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
            title="Switch to Next Working Server (Shortcut: S)"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Next Server</span>
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

      {/* Main Streaming Video Container (Responsive 16:9 on mobile, Theater height on TV/Desktop) */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${
          isFullscreen ? 'flex-1 h-full' : 'aspect-video sm:aspect-auto sm:h-[72vh] lg:h-[78vh]'
        }`}
      >
        {isLoadingDirectStreams && useDirectSerialEngine ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs sm:text-sm font-semibold text-slate-200">
              Loading Direct HD Episode Stream for {media.title} (Ep {currentEpisode})...
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Quick Server & TV Serial Switcher Strip (Always accessible on Mobile, Tablet & Smart TV) */}
      {!isFullscreen && (
        <div className="bg-slate-950 border-t border-slate-800/90 px-3 py-2.5 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Servers:</span>
          </span>

          {/* Direct Serial & Hindi Engine Pill */}
          <button
            onClick={handleActivateDirectSerialEngine}
            data-tv-nav="true"
            className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all ${
              useDirectSerialEngine
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>TV Serial / Hindi Direct HD</span>
          </button>

          {/* If Direct Serial Engine is active and has multiple mirrors, show Mirror pills */}
          {useDirectSerialEngine &&
            directStreams.length > 1 &&
            directStreams.slice(0, 5).map((ds, mIdx) => (
              <button
                key={ds.id}
                onClick={() => setSelectedDirectMirror(mIdx)}
                data-tv-nav="true"
                className={`tv-focus px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  selectedDirectMirror === mIdx
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Ep Mirror #{mIdx + 1}
              </button>
            ))}

          {/* Standard 8 OTT/Multi-Audio Servers */}
          {STREAM_SERVERS.map((srv, idx) => {
            const active = !useDirectSerialEngine && serverIndex === idx;
            return (
              <button
                key={srv.id}
                onClick={() => handleSelectServerByIndex(idx)}
                data-tv-nav="true"
                className={`tv-focus px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                Srv {idx + 1}: {srv.name.split('(')[0].trim()}
              </button>
            );
          })}
        </div>
      )}

      {/* TV Series / Serial Episode Jumper Bar */}
      {isTV && (
        <div
          className={`transition-opacity duration-300 z-30 ${
            showControlsOverlay || !isFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } bg-slate-950/95 border-t border-slate-800/80 px-3 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-2`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handlePrevEp}
              disabled={currentSeason === 1 && currentEpisode === 1}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-slate-300 border border-slate-800"
              title="Previous Episode (P)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Ep</span>
            </button>

            <button
              onClick={() => setShowEpisodeModal(true)}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-400 border border-amber-500/30"
              title="Select Season and Episode"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                Season {currentSeason} · Ep {currentEpisode} (All Episodes)
              </span>
            </button>

            <button
              onClick={handleNextEp}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800"
              title="Next Episode (N)"
            >
              <span>Next Ep</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-slate-300 font-medium text-[11px] sm:text-xs">
                Auto-Next Ep:
              </span>
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
              Remote Keys: <strong>S</strong> (Switch Server), <strong>Q</strong> (Quality),{' '}
              <strong>N / CH+</strong> (Next Ep), <strong>P / CH-</strong> (Prev Ep)
            </span>
          </div>
        </div>
      )}

      {/* Quality & Info Dock (shown when not fullscreen) */}
      {!isFullscreen && (
        <div className="bg-slate-950 px-3 py-3 sm:px-6 lg:px-8 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span>Resolution:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {QUALITY_OPTIONS.map((opt) => {
                const active = currentQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleQualityChange(opt.id)}
                    className={`tv-focus px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                    }`}
                  >
                    {opt.id.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReloadStream}
                className="tv-focus flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reload Player</span>
              </button>
              <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">
                1080p HD Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
              <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">TV Serials & Daily Soaps Fixed:</strong> If a TV serial or Hindi show says "Unavailable" on western servers, tap{' '}
                <strong className="text-emerald-400">"TV Serial / Hindi Direct HD"</strong> above to stream full episodes directly.
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
              <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">Airtel Xstream Box & Smart TV Ready:</strong> Use your remote D-Pad or press <strong>S</strong> to switch servers and <strong>CH+ / CH-</strong> to change episodes.
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
