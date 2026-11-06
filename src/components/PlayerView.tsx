import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Monitor,
  Subtitles,
  Lock,
  Unlock,
  Server,
  SkipForward,
  X,
  Star,
  Film,
  Tv,
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

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

type AspectFitMode = 'fit' | 'zoom' | 'stretch';

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

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
  const isTV = media.type === 'tv' || media.type === 'series' || Boolean(media.isSerial);

  // Player UI & Menus State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isControlsLocked, setIsControlsLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Unified CineStream Native Video Player Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(isTV ? 2580 : 8100); // 43m default for TV, 2h15m for Movie
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [aspectFit, setAspectFit] = useState<AspectFitMode>('fit');
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>('Hindi / Original (Dual Audio)');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('Off');
  const [seekFeedback, setSeekFeedback] = useState<'forward' | 'backward' | null>(null);

  // Server & Stream Routing State
  const [serverIndex, setServerIndex] = useState<number>(() =>
    getPreferredServerIndexForMedia(media)
  );
  const [resolvedDirectStreams, setResolvedDirectStreams] = useState<DirectSerialStream[]>([]);
  const [activeDirectStreamIndex, setActiveDirectStreamIndex] = useState<number>(0);
  const [useDirectStream, setUseDirectStream] = useState<boolean>(false);
  const [isResolvingAutoStream, setIsResolvingAutoStream] = useState<boolean>(isSerialMedia);

  const activeServer = STREAM_SERVERS[serverIndex] || DEFAULT_SERVER;

  // Any open dropdown check: prevents auto-hide while user is browsing servers/quality/speed/audio
  const isAnyMenuOpen =
    showSourceMenu || showQualityMenu || showSpeedMenu || showAudioMenu || showEpisodeModal;

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

  // Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const topMenusRef = useRef<HTMLDivElement>(null);
  const bottomMenusRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryCountRef = useRef<number>(0);

  const showToast = useCallback((msg: string, durationMs = 3000) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, durationMs);
  }, []);

  const closeAllMenus = useCallback(() => {
    setShowSourceMenu(false);
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
    setShowAudioMenu(false);
  }, []);

  // Bridge to send commands to the active stream inside CineStream's unified video player
  const sendPlayerCommand = useCallback(
    (action: 'play' | 'pause' | 'seek' | 'volume' | 'mute' | 'unmute' | 'speed', value?: number) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;

      try {
        // 1. YouTube IFrame JS API commands
        if (action === 'play') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          win.postMessage(JSON.stringify({ action: 'play', command: 'play', api: 'play' }), '*');
        } else if (action === 'pause') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          win.postMessage(JSON.stringify({ action: 'pause', command: 'pause', api: 'pause' }), '*');
        } else if (action === 'seek' && typeof value === 'number') {
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.floor(value), true] }),
            '*'
          );
          win.postMessage(
            JSON.stringify({ action: 'seek', command: 'seek', api: 'seek', time: Math.floor(value), set: Math.floor(value) }),
            '*'
          );
        } else if (action === 'volume' && typeof value === 'number') {
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.floor(value)] }),
            '*'
          );
          win.postMessage(
            JSON.stringify({ action: 'volume', api: 'volume', value: value / 100, set: value / 100 }),
            '*'
          );
        } else if (action === 'mute') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
          win.postMessage(JSON.stringify({ action: 'mute', api: 'mute' }), '*');
        } else if (action === 'unmute') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
          win.postMessage(JSON.stringify({ action: 'unmute', api: 'unmute' }), '*');
        } else if (action === 'speed' && typeof value === 'number') {
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [value] }),
            '*'
          );
          win.postMessage(JSON.stringify({ action: 'speed', speed: value, rate: value }), '*');
        }
      } catch {
        // Ignore cross-origin postMessage restrictions
      }
    },
    []
  );

  // Close dropdown menus ONLY when clicking outside on phone/laptop or pressing Back/Escape on remote
  useEffect(() => {
    if (!isAnyMenuOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inTop = topMenusRef.current?.contains(target);
      const inBottom = bottomMenusRef.current?.contains(target);
      if (!inTop && !inBottom) {
        closeAllMenus();
      }
    };

    const handleEscapeOrBack = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        if (showSourceMenu || showQualityMenu || showSpeedMenu || showAudioMenu) {
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
  }, [isAnyMenuOpen, showSourceMenu, showQualityMenu, showSpeedMenu, showAudioMenu, closeAllMenus]);

  // Smart Auto-Stream Resolver on media or episode change
  useEffect(() => {
    let cancelled = false;
    setCountdown(null);
    autoRetryCountRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
    setDuration(isTV ? 2580 : 8100);

    const preferredIdx = getPreferredServerIndexForMedia(media);
    setServerIndex(preferredIdx);

    const serialCheck = isLikelyTvSerial(media);
    setIsResolvingAutoStream(serialCheck);
    if (serialCheck) {
      setUseDirectStream(true);
    }

    const safetyTimer = setTimeout(() => {
      if (!cancelled) setIsResolvingAutoStream(false);
    }, 2200);

    fetchDirectSerialStreams(media.title, currentSeason, currentEpisode, !isTV)
      .then((streams) => {
        if (cancelled) return;
        setResolvedDirectStreams(streams);
        setActiveDirectStreamIndex(0);
        if (serialCheck && streams.length > 0) {
          setUseDirectStream(true);
          if (streams[0].duration) {
            setDuration(streams[0].duration);
          }
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

  // Synchronized timeline clock for CineStream Custom Player UI
  useEffect(() => {
    if (!isPlaying || isResolvingAutoStream) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev + playbackSpeed >= duration) {
          return duration;
        }
        return prev + playbackSpeed;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isResolvingAutoStream, duration, playbackSpeed]);

  // Automatic Failover Handler
  const triggerAutomaticFailover = (reason?: string) => {
    if (autoRetryCountRef.current >= STREAM_SERVERS.length + resolvedDirectStreams.length) {
      return;
    }
    autoRetryCountRef.current += 1;

    if (useDirectStream) {
      if (activeDirectStreamIndex + 1 < resolvedDirectStreams.length) {
        setActiveDirectStreamIndex((prev) => prev + 1);
        showToast('Auto-optimizing direct HD stream...');
        return;
      }
      setUseDirectStream(false);
      setServerIndex(0);
      setIframeKey((prev) => prev + 1);
      showToast('Auto-switching to Server 1...');
      return;
    }

    if (serverIndex >= 1 && resolvedDirectStreams.length > 0) {
      setUseDirectStream(true);
      setActiveDirectStreamIndex(0);
      showToast('Auto-connecting to Direct HD Stream...');
      return;
    }

    const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    setServerIndex(nextIdx);
    setIframeKey((prev) => prev + 1);
    try {
      localStorage.setItem(`cinestream_srv_v5_${media.id}`, String(nextIdx));
    } catch {}
    showToast(
      reason
        ? `${reason} — Auto-switching to ${STREAM_SERVERS[nextIdx].badge}...`
        : `Switched to ${STREAM_SERVERS[nextIdx].badge}`
    );
  };

  // Manual Server Switch Handler (Plays immediately inside CineStream Player on the same screen)
  const handleManualSwitchSource = (targetIdx?: number, directFlag?: boolean) => {
    closeAllMenus();
    setIsPlaying(true);

    if (directFlag !== undefined) {
      if (directFlag && resolvedDirectStreams.length > 0) {
        setUseDirectStream(true);
        const chosenMirror =
          targetIdx !== undefined
            ? targetIdx
            : (activeDirectStreamIndex + 1) % resolvedDirectStreams.length;
        setActiveDirectStreamIndex(chosenMirror);
        if (resolvedDirectStreams[chosenMirror]?.duration) {
          setDuration(resolvedDirectStreams[chosenMirror].duration!);
        }
        setIframeKey((prev) => prev + 1);
        showToast('Playing on CineStream Player · Direct HD Server');
        return;
      }

      setUseDirectStream(false);
      const chosenIdx =
        targetIdx !== undefined ? targetIdx : (serverIndex + 1) % STREAM_SERVERS.length;
      setServerIndex(chosenIdx);
      setIframeKey((prev) => prev + 1);
      try {
        localStorage.setItem(`cinestream_srv_v5_${media.id}`, String(chosenIdx));
      } catch {}
      showToast(`Playing on CineStream Player · ${STREAM_SERVERS[chosenIdx].badge}`);
      return;
    }

    const chosenIdx = (serverIndex + 1) % STREAM_SERVERS.length;
    setUseDirectStream(false);
    setServerIndex(chosenIdx);
    setIframeKey((prev) => prev + 1);
    try {
      localStorage.setItem(`cinestream_srv_v5_${media.id}`, String(chosenIdx));
    } catch {}
    showToast(`Playing on CineStream Player · ${STREAM_SERVERS[chosenIdx].badge}`);
  };

  // Custom Player Controls: Play/Pause, -10s Backward, +10s Forward, Seek, Volume, Speed
  const handleTogglePlayPause = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      sendPlayerCommand(next ? 'play' : 'pause');
      showToast(next ? '▶ Playing' : '⏸ Paused', 1400);
      return next;
    });
  };

  const handleSeekByOffset = (deltaSeconds: number) => {
    setCurrentTime((prev) => {
      const nextTime = Math.max(0, Math.min(duration, prev + deltaSeconds));
      sendPlayerCommand('seek', nextTime);
      return nextTime;
    });
    setSeekFeedback(deltaSeconds > 0 ? 'forward' : 'backward');
    if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 750);
    showToast(deltaSeconds > 0 ? `⏩ +${deltaSeconds}s Forward` : `⏪ ${deltaSeconds}s Backward`, 1400);
  };

  const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = Number(e.target.value);
    setCurrentTime(targetSec);
    sendPlayerCommand('seek', targetSec);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      sendPlayerCommand(next ? 'mute' : 'unmute');
      return next;
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    sendPlayerCommand('volume', val);
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    setShowSpeedMenu(false);
    sendPlayerCommand('speed', spd);
    showToast(`Playback Speed: ${spd}x`);
  };

  const handleCycleAspectFit = () => {
    setAspectFit((prev) => {
      const next: AspectFitMode = prev === 'fit' ? 'zoom' : prev === 'zoom' ? 'stretch' : 'fit';
      const label =
        next === 'fit'
          ? '16:9 Original Fit'
          : next === 'zoom'
          ? 'Cinema Zoom (Crop Black Bars)'
          : 'Full Screen Stretch';
      showToast(`Screen Fit: ${label}`, 1800);
      return next;
    });
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

  // Listen for iframe postMessage events (time updates, duration, ended, and failover)
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

        // Sync live currentTime and duration from embedded player if provided
        if (typeof payload === 'object' && payload !== null) {
          const info = payload.info || payload.data || payload;
          if (typeof info.currentTime === 'number' && info.currentTime > 0) {
            setCurrentTime(Math.floor(info.currentTime));
          }
          if (typeof info.duration === 'number' && info.duration > 60) {
            setDuration(Math.floor(info.duration));
          }
          if (typeof info.playerState === 'number') {
            // YouTube playerState: 1 = playing, 2 = paused, 0 = ended
            if (info.playerState === 1) setIsPlaying(true);
            else if (info.playerState === 2) setIsPlaying(false);
            else if (info.playerState === 0) triggerNextEpisodeCountdown();
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

        // Detect explicit player error events
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
    setIsPlaying(true);
    showToast('Reloading stream in CineStream Player...');
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

  // Keyboard & Remote Hotkeys for CineStream Custom Video Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.key === 'j' || e.key === 'J' || (e.shiftKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        handleSeekByOffset(-10);
      } else if (e.key === 'l' || e.key === 'L' || (e.shiftKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        handleSeekByOffset(10);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReloadStream();
      } else if (e.key === 'e' || e.key === 'E') {
        if (isTV) {
          e.preventDefault();
          setShowEpisodeModal((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, isTV, currentSeason, currentEpisode]);

  const handleQualityChange = (q: VideoQuality) => {
    setCurrentQuality(q);
    setShowQualityMenu(false);
    try {
      localStorage.setItem('cinestream_preferred_quality', q);
    } catch {}
    setIframeKey((prev) => prev + 1);
    showToast(`Video Quality set to ${q.toUpperCase()}`);
  };

  // Idle timer: keeps controls visible whenever any dropdown menu is open!
  const resetIdleTimer = useCallback(() => {
    setShowControlsOverlay(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isAnyMenuOpen) {
      // Never auto-close or hide overlay while the user has a dropdown open
      return;
    }
    idleTimerRef.current = setTimeout(() => {
      if (!isAnyMenuOpen) {
        setShowControlsOverlay(false);
      }
    }, 5000);
  }, [isAnyMenuOpen]);

  useEffect(() => {
    if (isAnyMenuOpen) {
      setShowControlsOverlay(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [streamUrl, isAnyMenuOpen, resetIdleTimer]);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

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

      {/* Top Header Bar of CineStream Custom Player */}
      <div
        ref={topMenusRef}
        className={`transition-opacity duration-200 z-40 ${
          showControlsOverlay || isAnyMenuOpen || !isFullscreen
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        } ${
          isFullscreen
            ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 via-black/70 to-transparent'
            : 'bg-slate-950 border-b border-slate-900'
        } px-3 py-2.5 sm:px-6 lg:px-10 flex items-center justify-between gap-2`}
      >
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-800 shadow-sm shrink-0"
            title="Back to Browse (Esc / Back)"
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
                CineStream Player ({useDirectStream ? 'Direct HD' : activeServer.badge})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Persistent Server Selector, Episodes Button, Quality & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isTV && (
            <button
              onClick={() => {
                closeAllMenus();
                setShowEpisodeModal(true);
              }}
              data-tv-nav="true"
              className="tv-focus flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold border border-slate-800 whitespace-nowrap"
              title="Open Episodes List (E)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Episodes List</span>
              <span className="sm:hidden">S{currentSeason}:E{currentEpisode}</span>
            </button>
          )}

          {/* Persistent Server Selector Dropdown (Stays open until user selects a server, presses Back, or clicks outside) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSourceMenu((prev) => !prev);
                setShowQualityMenu(false);
                setShowSpeedMenu(false);
                setShowAudioMenu(false);
              }}
              data-tv-nav="true"
              className={`tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                showSourceMenu
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/40'
              }`}
              title="Select Stream Server (Plays inside CineStream Video Player)"
            >
              <Server className="w-3.5 h-3.5" />
              <span>
                {useDirectStream ? 'Server: Direct HD' : `Server ${serverIndex + 1}`}
              </span>
            </button>

            {showSourceMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-80 max-h-[78vh] overflow-y-auto bg-slate-900 border border-amber-500/50 rounded-2xl p-2.5 shadow-2xl z-50 text-left space-y-1.5"
              >
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-white">
                      Select Server (CineStream Player)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Every server plays directly on this screen inside CineStream Player:
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

                {/* Clean 7 Primary Multi-CDN Servers (First 3 Broadcast Stream entries removed as requested) */}
                {STREAM_SERVERS.map((srv, idx) => {
                  const isCurrent = !useDirectStream && idx === serverIndex;
                  return (
                    <button
                      type="button"
                      key={srv.id}
                      onClick={() => handleManualSwitchSource(idx, false)}
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
                        <div className="text-[10px] text-slate-400 truncate">{srv.quality}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}

                {/* Single verified Direct HD option when available for Indian TV Serials / Sitcoms */}
                {resolvedDirectStreams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleManualSwitchSource(0, true)}
                    data-tv-nav="true"
                    className={`tv-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                      useDirectStream
                        ? 'bg-emerald-500/20 text-white font-bold border border-emerald-500/50'
                        : 'text-emerald-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate">
                        Server {STREAM_SERVERS.length + 1}: Indian TV & Serial Direct HD
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Instant 1080p Native Stream
                      </div>
                    </div>
                    {useDirectStream && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quality Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu((prev) => !prev);
                setShowSourceMenu(false);
                setShowSpeedMenu(false);
                setShowAudioMenu(false);
              }}
              data-tv-nav="true"
              className={`tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${
                showQualityMenu
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
              title="Video Quality (1080p Full HD Default)"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentQuality.toUpperCase()}</span>
            </button>

            {showQualityMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1"
              >
                <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-white">
                  <span>Video Quality</span>
                  <button
                    type="button"
                    onClick={() => setShowQualityMenu(false)}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = currentQuality === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => handleQualityChange(opt.id)}
                      data-tv-nav="true"
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

      {/* Unified CineStream Video Player Screen & Custom Interactive Control Deck */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${
          isFullscreen
            ? 'flex-1 h-full'
            : 'aspect-video sm:aspect-auto sm:h-[62vh] md:h-[70vh] lg:h-[78vh] xl:h-[84vh] 2xl:h-[86vh]'
        }`}
      >
        {isResolvingAutoStream ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-10 h-10 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              Loading {media.title} in CineStream Player...
            </p>
          </div>
        ) : (
          <div
            className={`w-full h-full transition-transform duration-300 ${
              aspectFit === 'zoom'
                ? 'scale-[1.15]'
                : aspectFit === 'stretch'
                ? 'scale-x-[1.10] scale-y-[1.04]'
                : 'scale-100'
            }`}
          >
            <iframe
              ref={iframeRef}
              key={`${iframeKey}-${streamUrl}-${currentQuality}`}
              src={streamUrl}
              title={media.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="origin"
              onError={() => triggerAutomaticFailover('Connection timeout')}
              className="w-full h-full border-0 bg-black"
            />
          </div>
        )}

        {/* Visual -10s / +10s Seek Ripple Feedback */}
        {seekFeedback === 'backward' && (
          <div className="absolute left-6 sm:left-16 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/75 border border-amber-500/50 text-amber-400 shadow-2xl">
            <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-xs font-extrabold font-mono mt-1">-10s</span>
          </div>
        )}

        {seekFeedback === 'forward' && (
          <div className="absolute right-6 sm:right-16 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/75 border border-amber-500/50 text-amber-400 shadow-2xl">
            <RotateCw className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-xs font-extrabold font-mono mt-1">+10s</span>
          </div>
        )}

        {/* Center Quick Controls (-10s Backward, Play/Pause, +10s Forward) */}
        {!isControlsLocked && (showControlsOverlay || !isPlaying) && !isResolvingAutoStream && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center gap-6 sm:gap-12 pointer-events-none">
            <button
              type="button"
              onClick={() => handleSeekByOffset(-10)}
              data-tv-nav="true"
              className="tv-focus pointer-events-auto flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-950/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all active:scale-90"
              title="Rewind 10 Seconds (-10s)"
            >
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-extrabold font-mono">-10s</span>
            </button>

            <button
              type="button"
              onClick={handleTogglePlayPause}
              data-tv-nav="true"
              className="tv-focus pointer-events-auto flex items-center justify-center w-15 h-15 sm:w-20 sm:h-20 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xl shadow-amber-500/40 transition-all active:scale-90"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-slate-950" />
              ) : (
                <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-slate-950 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSeekByOffset(10)}
              data-tv-nav="true"
              className="tv-focus pointer-events-auto flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-950/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all active:scale-90"
              title="Fast-Forward 10 Seconds (+10s)"
            >
              <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-extrabold font-mono">+10s</span>
            </button>
          </div>
        )}

        {/* Optional Subtitle Display Bar when Subtitles are Enabled */}
        {selectedSubtitle !== 'Off' && isPlaying && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-1.5 rounded-lg bg-black/80 text-white text-xs sm:text-base font-medium border border-white/10 max-w-[85vw] text-center">
            [{selectedSubtitle} Subtitles Active · {media.title}]
          </div>
        )}

        {/* Unified CineStream Bottom Video Player Control Deck (Tailored for Movies vs Web Series/TV) */}
        <div
          ref={bottomMenusRef}
          className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/85 to-transparent px-3 sm:px-6 lg:px-10 pt-8 pb-3 sm:pb-4 transition-opacity duration-200 ${
            showControlsOverlay || isAnyMenuOpen || !isPlaying
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          {isControlsLocked ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsControlsLocked(false);
                  showToast('Player Controls Unlocked');
                }}
                data-tv-nav="true"
                className="tv-focus flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Player Controls</span>
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Touch Controls Locked · {media.title}
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Interactive Seekbar / Scrubber Row */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] sm:text-xs font-mono tabular-nums text-amber-400 font-bold shrink-0">
                  {formatTime(currentTime)}
                </span>

                <div className="relative flex-1 flex items-center group">
                  <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={handleSeekBarChange}
                    aria-label="Seek video timeline"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <span className="text-[11px] sm:text-xs font-mono tabular-nums text-slate-300 font-semibold shrink-0">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Main Player Control Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Left Transport Controls: Play/Pause, -10s, +10s, Volume, Skip Intro */}
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={handleTogglePlayPause}
                    data-tv-nav="true"
                    className="tv-focus flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-transform active:scale-95"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 ml-0.5" />
                    )}
                  </button>

                  {/* 10 Sec Backward */}
                  <button
                    type="button"
                    onClick={() => handleSeekByOffset(-10)}
                    data-tv-nav="true"
                    className="tv-focus flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700/80 whitespace-nowrap"
                    title="Rewind 10 Seconds (-10s)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>-10s</span>
                  </button>

                  {/* 10 Sec Forward */}
                  <button
                    type="button"
                    onClick={() => handleSeekByOffset(10)}
                    data-tv-nav="true"
                    className="tv-focus flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700/80 whitespace-nowrap"
                    title="Fast-Forward 10 Seconds (+10s)"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>+10s</span>
                  </button>

                  {/* Volume & Mute */}
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      data-tv-nav="true"
                      className="tv-focus text-slate-200 hover:text-amber-400"
                      title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-amber-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      className="w-16 lg:w-20 accent-amber-500 cursor-pointer h-1"
                    />
                  </div>

                  {/* Skip Intro (+85s) */}
                  <button
                    type="button"
                    onClick={() => handleSeekByOffset(85)}
                    data-tv-nav="true"
                    className="tv-focus hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 text-xs font-bold border border-amber-500/30 whitespace-nowrap"
                    title="Skip Intro (+85s)"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Skip Intro</span>
                  </button>
                </div>

                {/* Center / Mode-Specific Controls:
                    - TV Series / Serials / Anime: Prev Ep, Next Episode, Episodes List
                    - Movies: Movie Cinema Mode Badge & Quick Chapter Jump (+5m) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {isTV ? (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevEp}
                        disabled={currentSeason === 1 && currentEpisode === 1}
                        data-tv-nav="true"
                        className="tv-focus flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-bold border border-slate-700/80 whitespace-nowrap"
                        title="Previous Episode"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Prev Ep</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextEp}
                        data-tv-nav="true"
                        className="tv-focus flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md whitespace-nowrap"
                        title="Play Next Episode Immediately"
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
                        className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 text-xs font-bold border border-amber-500/40 whitespace-nowrap"
                        title="Open All Seasons & Episodes List"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Episodes</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-amber-400">
                        <Film className="w-3.5 h-3.5" />
                        <span>Movie Theater Mode</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSeekByOffset(300)}
                        data-tv-nav="true"
                        className="tv-focus hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700/80 whitespace-nowrap"
                        title="Jump Ahead 5 Minutes (+5m)"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                        <span>+5 Min</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Right Utility Controls: Audio/Subtitles, Speed, Aspect Fit, Lock, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Audio & Subtitles Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAudioMenu((prev) => !prev);
                        setShowSpeedMenu(false);
                        setShowSourceMenu(false);
                        setShowQualityMenu(false);
                      }}
                      data-tv-nav="true"
                      className={`tv-focus flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${
                        showAudioMenu
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                      }`}
                      title="Audio Track & Subtitles"
                    >
                      <Subtitles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden xl:inline">Audio / Sub</span>
                    </button>

                    {showAudioMenu && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-50 text-left space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs font-bold text-white">
                          <span>Audio & Subtitles</span>
                          <button
                            type="button"
                            onClick={() => setShowAudioMenu(false)}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-amber-400 px-2">
                            Audio Language
                          </div>
                          {[
                            'Hindi / Original (Dual Audio)',
                            'Hindi Dubbed / Original',
                            'English / Original Audio',
                          ].map((track) => (
                            <button
                              type="button"
                              key={track}
                              onClick={() => {
                                setSelectedAudioTrack(track);
                                setShowAudioMenu(false);
                                showToast(`Audio Track: ${track}`);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                                selectedAudioTrack === track
                                  ? 'bg-amber-500/20 text-white font-bold'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{track}</span>
                              {selectedAudioTrack === track && (
                                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-800">
                          <div className="text-[10px] font-bold text-amber-400 px-2">Subtitles</div>
                          {['Off', 'English', 'Hindi'].map((sub) => (
                            <button
                              type="button"
                              key={sub}
                              onClick={() => {
                                setSelectedSubtitle(sub);
                                setShowAudioMenu(false);
                                showToast(`Subtitles: ${sub}`);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                                selectedSubtitle === sub
                                  ? 'bg-amber-500/20 text-white font-bold'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span>{sub}</span>
                              {selectedSubtitle === sub && (
                                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Playback Speed Selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpeedMenu((prev) => !prev);
                        setShowAudioMenu(false);
                        setShowSourceMenu(false);
                        setShowQualityMenu(false);
                      }}
                      data-tv-nav="true"
                      className={`tv-focus flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${
                        showSpeedMenu
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                      }`}
                      title="Playback Speed"
                    >
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>{playbackSpeed}x</span>
                    </button>

                    {showSpeedMenu && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-full mb-2 w-40 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1"
                      >
                        <div className="px-2.5 py-1 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
                          <span>Speed</span>
                          <button
                            type="button"
                            onClick={() => setShowSpeedMenu(false)}
                            className="p-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {SPEED_OPTIONS.map((spd) => (
                          <button
                            type="button"
                            key={spd}
                            onClick={() => handleSpeedChange(spd)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                              playbackSpeed === spd
                                ? 'bg-amber-500/20 text-white font-bold'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>{spd === 1 ? '1x (Normal)' : `${spd}x`}</span>
                            {playbackSpeed === spd && (
                              <Check className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Screen Fit / Cinema Crop Toggle */}
                  <button
                    type="button"
                    onClick={handleCycleAspectFit}
                    data-tv-nav="true"
                    className="tv-focus hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700/80 whitespace-nowrap"
                    title="Change Screen Fit / Crop Black Bars"
                  >
                    <Monitor className="w-3.5 h-3.5 text-amber-400" />
                    <span className="capitalize">{aspectFit}</span>
                  </button>

                  {/* Lock Touch Controls */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsControlsLocked(true);
                      closeAllMenus();
                      showToast('Player Controls Locked');
                    }}
                    data-tv-nav="true"
                    className="tv-focus p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80"
                    title="Lock Player Controls"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    data-tv-nav="true"
                    className="tv-focus p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/40 transition-colors"
                    title="Toggle Fullscreen (F)"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details, Server Bar & Interactive Episodes Section Below Video (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 py-5 sm:py-8 space-y-6">
          {/* Quick Horizontal Server Switcher Pill Bar (1-Click Server Selection on the same player) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 shrink-0">
              <Server className="w-4 h-4 text-amber-400" />
              <span>CineStream Video Player Servers:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              {STREAM_SERVERS.map((srv, idx) => {
                const isCurrent = !useDirectStream && idx === serverIndex;
                return (
                  <button
                    type="button"
                    key={srv.id}
                    onClick={() => handleManualSwitchSource(idx, false)}
                    data-tv-nav="true"
                    className={`tv-focus px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Server {idx + 1}: {srv.badge.replace(/\s*\(TV Safe\)/i, '')}
                  </button>
                );
              })}

              {resolvedDirectStreams.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleManualSwitchSource(0, true)}
                  data-tv-nav="true"
                  className={`tv-focus px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all ${
                    useDirectStream
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  Direct HD Stream
                </button>
              )}
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
