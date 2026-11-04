import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Check,
  CheckCircle2,
  Play,
  X,
  Zap,
  Star,
  Sparkles,
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
  description: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  {
    id: '1080p',
    label: '1080p Full HD',
    resolution: '1920×1080',
    description: 'Highest available picture and audio quality.',
  },
  {
    id: '720p',
    label: '720p HD',
    resolution: '1280×720',
    description: 'Smooth streaming for moderate connections.',
  },
  {
    id: '360p',
    label: '360p Data Saver',
    resolution: '640×360',
    description: 'Low mobile data usage.',
  },
  {
    id: 'auto',
    label: 'Auto (Adaptive)',
    resolution: 'Adaptive HLS',
    description: 'Automatically adjusts to your internet speed.',
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
}) => {
  const isSerialMedia = isLikelyTvSerial(media);
  const isTV = media.type === 'tv' || media.type === 'series';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Automatic Smart Stream Routing State (Completely transparent to the user)
  const [serverIndex, setServerIndex] = useState<number>(() =>
    getPreferredServerIndexForMedia(media)
  );
  const [resolvedDirectStreams, setResolvedDirectStreams] = useState<DirectSerialStream[]>([]);
  const [activeDirectStreamIndex, setActiveDirectStreamIndex] = useState<number>(0);
  const [useDirectStream, setUseDirectStream] = useState<boolean>(false);
  const [isResolvingAutoStream, setIsResolvingAutoStream] = useState<boolean>(isSerialMedia);

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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryCountRef = useRef<number>(0);

  const showToast = (msg: string, duration = 3200) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  // Smart Auto-Stream Resolver:
  // Automatically resolves the best playable stream for any Movie, Web Series, TV Serial, or Anime
  // without requiring the user to manually switch servers or click any special engine buttons.
  useEffect(() => {
    let cancelled = false;
    setCountdown(null);
    autoRetryCountRef.current = 0;

    const preferredIdx = getPreferredServerIndexForMedia(media);
    setServerIndex(preferredIdx);

    const serialCheck = isLikelyTvSerial(media);
    setIsResolvingAutoStream(serialCheck);
    if (serialCheck) {
      setUseDirectStream(true);
    }

    // Ensure the player never stays on loading screen for more than 2.6s even if network is slow
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setIsResolvingAutoStream(false);
    }, 2600);

    // Pre-fetch direct YouTube HD episode streams so serials/regional shows play automatically & any show has instant fallback
    fetchDirectSerialStreams(media.title, currentSeason, currentEpisode, !isTV)
      .then((streams) => {
        if (cancelled) return;
        setResolvedDirectStreams(streams);
        setActiveDirectStreamIndex(0);
        if (serialCheck && streams.length > 0) {
          setUseDirectStream(true);
        } else if (!serialCheck) {
          setUseDirectStream(false);
        }
      })
      .catch(() => {
        if (!cancelled) setUseDirectStream(false);
      })
      .finally(() => {
        clearTimeout(safetyTimer);
        if (!cancelled) setIsResolvingAutoStream(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [media.id, media.title, currentSeason, currentEpisode, isTV]);

  // Automatic Failover Handler (Triggered when an embed player reports an error or fails to load)
  const triggerAutomaticFailover = (reason?: string) => {
    if (autoRetryCountRef.current >= STREAM_SERVERS.length + resolvedDirectStreams.length) {
      return;
    }
    autoRetryCountRef.current += 1;

    // If currently using direct stream and alternate direct streams exist, advance to next stream
    if (useDirectStream) {
      if (activeDirectStreamIndex + 1 < resolvedDirectStreams.length) {
        setActiveDirectStreamIndex((prev) => prev + 1);
        showToast('Auto-optimizing direct HD stream...');
        return;
      }
      setUseDirectStream(false);
      setServerIndex(0);
      setIframeKey((prev) => prev + 1);
      showToast('Auto-switching to backup HD server...');
      return;
    }

    // If primary VidFast/Videasy servers fail and we have verified direct YouTube HD streams ready, switch immediately!
    if (serverIndex >= 1 && resolvedDirectStreams.length > 0) {
      setUseDirectStream(true);
      setActiveDirectStreamIndex(0);
      showToast('Auto-connecting to Direct HD Stream...');
      return;
    }

    // Otherwise cycle through STREAM_SERVERS automatically
    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    setServerIndex(nextIdx);
    setIframeKey((prev) => prev + 1);
    try {
      localStorage.setItem(`cinestream_srv_v4_${media.id}`, String(nextIdx));
    } catch {}
    showToast(
      reason
        ? `${reason} — Auto-switching to ${STREAM_SERVERS[nextIdx].badge}...`
        : `Auto-switching to ${STREAM_SERVERS[nextIdx].badge}...`
    );
  };

  // Manual 1-click stream source switch (if user ever wants to change source)
  const handleManualSwitchSource = (targetIdx?: number, directFlag?: boolean) => {
    setShowSourceMenu(false);

    // Explicit click from dropdown menu
    if (directFlag !== undefined) {
      if (directFlag && resolvedDirectStreams.length > 0) {
        setUseDirectStream(true);
        const chosenMirror =
          targetIdx !== undefined
            ? targetIdx
            : (activeDirectStreamIndex + 1) % resolvedDirectStreams.length;
        setActiveDirectStreamIndex(chosenMirror);
        showToast(`Switched to Direct HD Stream ${chosenMirror + 1}`);
        return;
      }
      setUseDirectStream(false);
      const chosenIdx =
        targetIdx !== undefined ? targetIdx : (serverIndex + 1) % STREAM_SERVERS.length;
      setServerIndex(chosenIdx);
      setIframeKey((prev) => prev + 1);
      try {
        localStorage.setItem(`cinestream_srv_v4_${media.id}`, String(chosenIdx));
      } catch {}
      showToast(`Switched to ${STREAM_SERVERS[chosenIdx].name}`);
      return;
    }

    // 1-Click "Switch Backup Stream" button: smartly cycles through Direct HD Streams + Multi-CDN Servers
    if (useDirectStream) {
      if (activeDirectStreamIndex + 1 < Math.min(resolvedDirectStreams.length, 3)) {
        const nextMirror = activeDirectStreamIndex + 1;
        setActiveDirectStreamIndex(nextMirror);
        showToast(`Switched to Alternate Direct HD Stream ${nextMirror + 1}`);
        return;
      }
      setUseDirectStream(false);
      setServerIndex(0);
      setIframeKey((prev) => prev + 1);
      showToast(`Switched to ${STREAM_SERVERS[0].name}`);
      return;
    }

    // If currently on a VidSrc/TMDB server and Direct YouTube HD Stream is available, offer it right after Server 1!
    if (serverIndex === 0 && resolvedDirectStreams.length > 0) {
      setUseDirectStream(true);
      setActiveDirectStreamIndex(0);
      showToast('Switched to Direct HD Stream (No-Block)');
      return;
    }

    const chosenIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    setServerIndex(chosenIdx);
    setIframeKey((prev) => prev + 1);
    try {
      localStorage.setItem(`cinestream_srv_v4_${media.id}`, String(chosenIdx));
    } catch {}
    showToast(`Switched to ${STREAM_SERVERS[chosenIdx].name}`);
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

  // Listen for iframe postMessage events (both playback ended & playback error signals for automatic failover)
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

        // Detect explicit player error events to automatically switch server without bothering the user
        const isError =
          payload === 'error' ||
          payload === 'media_error' ||
          payload === 'no_sources' ||
          payload?.event === 'error' ||
          payload?.type === 'error' ||
          payload?.type === 'PLAYER_ERROR' ||
          payload?.status === 'error' ||
          (typeof payload === 'object' && payload?.data?.event === 'error');

        if (isError) {
          triggerAutomaticFailover('Stream unavailable on primary mirror');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [
    currentSeason,
    currentEpisode,
    episodesMap,
    isAutoPlayEnabled,
    isTV,
    serverIndex,
    useDirectStream,
    activeDirectStreamIndex,
    resolvedDirectStreams.length,
  ]);

  // Compute active stream URL automatically
  const activeDirectObj = resolvedDirectStreams[activeDirectStreamIndex];
  const streamUrl =
    useDirectStream && activeDirectObj
      ? activeDirectObj.embedUrl
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
    showToast('Reloading stream...');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        handleManualSwitchSource();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReloadStream();
      } else if (e.key === 'q' || e.key === 'Q') {
        setShowQualityMenu((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [serverIndex, useDirectStream, activeDirectStreamIndex, resolvedDirectStreams.length]);

  const handleQualityChange = (q: VideoQuality) => {
    setCurrentQuality(q);
    setShowQualityMenu(false);
    try {
      localStorage.setItem('cinestream_preferred_quality', q);
    } catch {}
    setIframeKey((prev) => prev + 1);
    showToast(`Quality set to ${q.toUpperCase()}`);
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

  const resetIdleTimer = () => {
    setShowControlsOverlay(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowControlsOverlay(false);
      setShowQualityMenu(false);
      setShowSourceMenu(false);
    }, 4500);
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
      className={`relative w-full bg-slate-950 flex flex-col text-slate-100 ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen bg-black' : ''
      }`}
    >
      {/* 5-Second Next Episode Countdown Overlay (Netflix / Hotstar Style) */}
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
                  Up Next
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

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 max-w-[92vw] truncate">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Clean OTT Top Controls Bar */}
      <div
        className={`transition-opacity duration-300 z-30 ${
          showControlsOverlay || !isFullscreen
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        } ${
          isFullscreen
            ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent'
            : 'bg-slate-950 border-b border-slate-900'
        } px-3 py-2.5 sm:px-6 lg:px-10 flex items-center justify-between gap-2`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-800 shadow-sm shrink-0"
            title="Back to Browse (Esc / Back button)"
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
                <span className="shrink-0">Movie · {media.year || 'HD'}</span>
              )}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Auto HD Stream</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Clean OTT Controls (Episodes, Next Ep, Quality, Auto-Source Backup, Fullscreen) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isTV && (
            <>
              <button
                onClick={() => setShowEpisodeModal(true)}
                data-tv-nav="true"
                className="tv-focus flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold border border-slate-800"
                title="View All Seasons & Episodes"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Episodes</span>
                <span className="sm:hidden">S{currentSeason}:E{currentEpisode}</span>
              </button>

              <button
                onClick={handleNextEp}
                data-tv-nav="true"
                className="tv-focus hidden md:flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800"
                title="Next Episode (N)"
              >
                <span>Next Ep</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Quality Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowQualityMenu((prev) => !prev);
                setShowSourceMenu(false);
              }}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800"
              title="Video Quality (1080p Full HD Default)"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentQuality.toUpperCase()}</span>
            </button>

            {showQualityMenu && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1">
                <div className="px-3 py-1.5 border-b border-slate-800 text-xs font-bold text-white">
                  Video Quality
                </div>
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = currentQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleQualityChange(opt.id)}
                      className={`tv-focus w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.description}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Discreet Auto-Stream Source Menu (Only needed if user ever wants to switch backup stream) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSourceMenu((prev) => !prev);
                setShowQualityMenu(false);
              }}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800"
              title="Stream Source (Auto-Selected)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Stream: Auto</span>
            </button>

            {showSourceMenu && (
              <div className="absolute right-0 top-full mt-2 w-68 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Auto Stream Router</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Automatically selects the fastest working server. Tap below only if you wish to switch backup stream:
                  </p>
                </div>

                {resolvedDirectStreams.length > 0 && (
                  <button
                    onClick={() => handleManualSwitchSource(0, true)}
                    className={`tv-focus w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      useDirectStream
                        ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">Auto Direct HD Stream</div>
                      <div className="text-[10px] text-slate-400">Fastest direct episode source</div>
                    </div>
                    {useDirectStream && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                )}

                {STREAM_SERVERS.map((srv, idx) => {
                  const isCurrent = !useDirectStream && idx === serverIndex;
                  return (
                    <button
                      key={srv.id}
                      onClick={() => handleManualSwitchSource(idx, false)}
                      className={`tv-focus w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">{srv.badge}</div>
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
            className="tv-focus hidden lg:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800"
            title="Reload Stream (R)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            data-tv-nav="true"
            className="tv-focus p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Cinema Video Frame:
          - Mobile (<640px): Crisp 16:9 aspect-video
          - Tablet (sm/md): 60vh-68vh
          - Laptop/Desktop (lg/xl): 78vh-84vh Theater
          - Smart TV (2xl): 86vh Full Theater */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${
          isFullscreen
            ? 'flex-1 h-full'
            : 'aspect-video sm:aspect-auto sm:h-[60vh] md:h-[68vh] lg:h-[78vh] xl:h-[84vh] 2xl:h-[86vh]'
        }`}
      >
        {isResolvingAutoStream ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-10 h-10 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              Starting {media.title}...
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
            onError={() => triggerAutomaticFailover('Connection timeout')}
            className="w-full h-full border-0 bg-black"
          />
        )}
      </div>

      {/* Clean OTT Details & Interactive Episodes Section Below Video (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 py-5 sm:py-8 space-y-6">
          {/* Now Playing Info & Quick Action Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase">
                  {isTV ? `Season ${currentSeason} · Episode ${currentEpisode}` : 'Full Movie'}
                </span>
                {media.rating && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{media.rating} IMDb</span>
                  </span>
                )}
                {media.year && (
                  <>
                    <span>·</span>
                    <span>{media.year}</span>
                  </>
                )}
                <span>·</span>
                <span className="text-emerald-400">1080p Full HD</span>
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

            {/* Right Controls: Prev/Next Ep or Instant Stream Switch if needed */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isTV && (
                <>
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
                </>
              )}

              <button
                onClick={() => handleManualSwitchSource()}
                data-tv-nav="true"
                className="tv-focus flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800"
                title="If video is slow on your internet, tap to switch to next auto-stream"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch Backup Stream</span>
              </button>
            </div>
          </div>

          {/* OTT-Style Interactive Season & Episode Grid (For Web Series, TV Serials & Anime) */}
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

              {/* Responsive Episode Grid across Mobile (1-2 cols), Tablet (2-3 cols), Laptop (4 cols), TV (5 cols) */}
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
                          {isCurrentEp ? 'Now Playing' : ep.overview || `Season ${currentSeason} · Ep ${ep.episode}`}
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
