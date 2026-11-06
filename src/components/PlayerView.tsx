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
  MousePointerClick,
  Gamepad2,
} from 'lucide-react';
import { Episode, MediaItem, StreamServer, VideoQuality } from '../types';
import {
  DEFAULT_SERVER,
  STREAM_SERVERS,
  getPreferredServerIndexForMedia,
} from '../data/servers';
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

interface PersistedPlaybackState {
  mediaId: string;
  season: number;
  episode: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  serverIndex: number;
  quality: VideoQuality;
  updatedAt: number;
}

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

function getPlaybackStorageKey(mediaId: string, season: number, episode: number): string {
  return `cinestream_pb_state_${mediaId}_s${season}_e${episode}`;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  media,
  currentSeason,
  currentEpisode,
  episodesMap,
  onSelectServer,
  onEpisodeChange,
  onBack,
}) => {
  const isTV = media.type === 'tv' || media.type === 'series' || Boolean(media.isSerial);

  // Load any saved playback state for this exact media + season + episode
  const loadSavedPlaybackState = useCallback((): Partial<PersistedPlaybackState> | null => {
    try {
      const raw = sessionStorage.getItem(
        getPlaybackStorageKey(media.id, currentSeason, currentEpisode)
      );
      if (!raw) return null;
      return JSON.parse(raw) as Partial<PersistedPlaybackState>;
    } catch {
      return null;
    }
  }, [media.id, currentSeason, currentEpisode]);

  // Internal Application Player UI & Menus State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isControlsLocked, setIsControlsLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Seamless Server Switching & Stream Readiness State
  // Wait for iframe onLoad before advancing the internal clock so the timer never runs ahead while loading
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [isSeamlessSwitching, setIsSeamlessSwitching] = useState(false);
  const [interactiveEmbedMode, setInteractiveEmbedMode] = useState(false);

  // Unified Internal Application Player Playback State (Preserved across server switches)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(() => {
    const saved = loadSavedPlaybackState();
    return saved?.currentTime && saved.currentTime > 0 ? saved.currentTime : 0;
  });
  // committedStartAt is only updated when switching servers or committing a seek, NEVER on Play/Pause
  const [committedStartAt, setCommittedStartAt] = useState<number>(() => {
    const saved = loadSavedPlaybackState();
    return saved?.currentTime && saved.currentTime > 0 ? saved.currentTime : 0;
  });
  const [duration, setDuration] = useState<number>(() => {
    const saved = loadSavedPlaybackState();
    return saved?.duration && saved.duration > 60 ? saved.duration : isTV ? 2580 : 8100;
  });
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [aspectFit, setAspectFit] = useState<AspectFitMode>('fit');
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>(
    'Hindi / Original (Dual Audio)'
  );
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('Off');
  const [seekFeedback, setSeekFeedback] = useState<'forward' | 'backward' | null>(null);

  // Server Routing State (12 Full-Content OTT Streaming Servers)
  const [serverIndex, setServerIndex] = useState<number>(() => {
    const saved = loadSavedPlaybackState();
    if (
      typeof saved?.serverIndex === 'number' &&
      saved.serverIndex >= 0 &&
      saved.serverIndex < STREAM_SERVERS.length
    ) {
      return saved.serverIndex;
    }
    return getPreferredServerIndexForMedia(media);
  });

  const activeServer = STREAM_SERVERS[serverIndex] || DEFAULT_SERVER;

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

  // Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const topMenusRef = useRef<HTMLDivElement>(null);
  const bottomMenusRef = useRef<HTMLDivElement>(null);
  const primaryPlayBtnRef = useRef<HTMLButtonElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTimeRef = useRef<number>(currentTime);
  const durationRef = useRef<number>(duration);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const lastManualSeekAtRef = useRef<number>(0);
  const hasLiveTimeTelemetryRef = useRef<boolean>(false);
  const prevEpisodeKeyRef = useRef<string>(`${media.id}_s${currentSeason}_e${currentEpisode}`);
  const autoRetryCountRef = useRef<number>(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Persist playback state (timestamp, playing state, active episode, server, quality) continuously
  useEffect(() => {
    try {
      const stateToSave: PersistedPlaybackState = {
        mediaId: media.id,
        season: currentSeason,
        episode: currentEpisode,
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
        isPlaying,
        serverIndex,
        quality: currentQuality,
        updatedAt: Date.now(),
      };
      sessionStorage.setItem(
        getPlaybackStorageKey(media.id, currentSeason, currentEpisode),
        JSON.stringify(stateToSave)
      );
    } catch {
      // ignore storage errors
    }
  }, [media.id, currentSeason, currentEpisode, currentTime, duration, isPlaying, serverIndex, currentQuality]);

  const showToast = useCallback((msg: string, durationMs = 2600) => {
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

  // Multi-protocol postMessage bridge to control embedded streams in-place without reloading the iframe
  const sendPlayerCommand = useCallback(
    (action: 'play' | 'pause' | 'seek' | 'volume' | 'mute' | 'unmute' | 'speed', value?: number) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;

      try {
        // Register listening handshake
        win.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');

        if (action === 'play') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          win.postMessage(JSON.stringify({ api: 'play', action: 'play', command: 'play', method: 'play' }), '*');
          win.postMessage({ api: 'play', action: 'play', command: 'play', method: 'play', type: 'PLAYER_CONTROL' }, '*');
        } else if (action === 'pause') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          win.postMessage(JSON.stringify({ api: 'pause', action: 'pause', command: 'pause', method: 'pause' }), '*');
          win.postMessage({ api: 'pause', action: 'pause', command: 'pause', method: 'pause', type: 'PLAYER_CONTROL' }, '*');
        } else if (action === 'seek' && typeof value === 'number') {
          const targetSec = Math.max(0, Math.floor(value));
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [targetSec, true] }),
            '*'
          );
          win.postMessage(
            JSON.stringify({ api: 'seek', action: 'seek', command: 'seek', method: 'seek', set: targetSec, time: targetSec, value: targetSec }),
            '*'
          );
          win.postMessage(
            { api: 'seek', action: 'seek', command: 'seek', method: 'seek', set: targetSec, time: targetSec, currentTime: targetSec, type: 'PLAYER_CONTROL' },
            '*'
          );
        } else if (action === 'volume' && typeof value === 'number') {
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.floor(value)] }),
            '*'
          );
          win.postMessage(
            JSON.stringify({ api: 'volume', action: 'volume', method: 'setVolume', set: value / 100, value: value / 100 }),
            '*'
          );
        } else if (action === 'mute') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
          win.postMessage(JSON.stringify({ api: 'mute', action: 'mute', method: 'mute' }), '*');
        } else if (action === 'unmute') {
          win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
          win.postMessage(JSON.stringify({ api: 'unmute', action: 'unmute', method: 'unmute' }), '*');
        } else if (action === 'speed' && typeof value === 'number') {
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [value] }),
            '*'
          );
          win.postMessage(JSON.stringify({ api: 'speed', action: 'speed', set: value, rate: value }), '*');
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
      const keyCode = e.keyCode || e.which;
      if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'GoBack' ||
        e.key === 'BrowserBack' ||
        keyCode === 4 ||
        keyCode === 27
      ) {
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

  // Reset timeline ONLY when the media ID, season, or episode actually changes (NEVER when switching servers!)
  useEffect(() => {
    const nextEpisodeKey = `${media.id}_s${currentSeason}_e${currentEpisode}`;
    if (prevEpisodeKeyRef.current !== nextEpisodeKey) {
      prevEpisodeKeyRef.current = nextEpisodeKey;
      setCountdown(null);
      autoRetryCountRef.current = 0;
      hasLiveTimeTelemetryRef.current = false;

      const saved = loadSavedPlaybackState();
      const restoredTime = saved?.currentTime && saved.currentTime > 5 ? saved.currentTime : 0;
      setCurrentTime(restoredTime);
      setCommittedStartAt(restoredTime);
      currentTimeRef.current = restoredTime;
      setIsPlaying(true);
      setIsStreamLoading(true);
      setDuration(saved?.duration && saved.duration > 60 ? saved.duration : isTV ? 2580 : 8100);
    }
  }, [media.id, currentSeason, currentEpisode, isTV, loadSavedPlaybackState]);

  // Auto-focus primary Play/Pause control in internal application player UI for TV Remote D-pad navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      primaryPlayBtnRef.current?.focus({ preventScroll: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [media.id, currentSeason, currentEpisode]);

  // Handle iframe onLoad: mark stream ready after initial buffer handshake so timer never runs ahead while server is loading
  const handleIframeLoad = useCallback(() => {
    if (streamReadyTimerRef.current) clearTimeout(streamReadyTimerRef.current);
    // Give the embedded HLS player a brief moment after document load to initialize video playback
    streamReadyTimerRef.current = setTimeout(() => {
      setIsStreamLoading(false);
      setIsSeamlessSwitching(false);
      if (currentTimeRef.current > 0) {
        sendPlayerCommand('seek', currentTimeRef.current);
      }
      if (!isPlayingRef.current) {
        sendPlayerCommand('pause');
      }
    }, 1400);
  }, [sendPlayerCommand]);

  useEffect(() => {
    return () => {
      if (streamReadyTimerRef.current) clearTimeout(streamReadyTimerRef.current);
      if (seekCommitTimerRef.current) clearTimeout(seekCommitTimerRef.current);
    };
  }, []);

  // Synchronized internal player clock:
  // ONLY ticks when the stream has finished loading (!isStreamLoading) AND isPlaying is true
  useEffect(() => {
    if (!isPlaying || isStreamLoading) return;
    const interval = setInterval(() => {
      // If the provider is sending live sub-second PLAYER_EVENT timeupdates, let live telemetry drive currentTime
      if (hasLiveTimeTelemetryRef.current && Date.now() - lastManualSeekAtRef.current > 2500) {
        return;
      }
      setCurrentTime((prev) => {
        if (prev + playbackSpeed >= duration) {
          return duration;
        }
        return prev + playbackSpeed;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isStreamLoading, duration, playbackSpeed]);

  /**
   * SEAMLESS SERVER SWITCHING MECHANISM:
   * Preserves playback state (`isPlaying`), exact timestamp (`currentTime`), and active episode index
   * (`currentSeason`, `currentEpisode`) when switching providers so the player never resets to 00:00 or S1:E1.
   */
  const handleSeamlessServerSwitch = useCallback(
    (targetIdx: number, reason?: string) => {
      closeAllMenus();
      const chosenIdx =
        ((targetIdx % STREAM_SERVERS.length) + STREAM_SERVERS.length) % STREAM_SERVERS.length;
      const preservedTimestamp = Math.max(0, Math.floor(currentTimeRef.current));
      const targetServer = STREAM_SERVERS[chosenIdx] || DEFAULT_SERVER;

      // Maintain currentTime, committedStartAt, isPlaying, currentSeason, and currentEpisode!
      setCommittedStartAt(preservedTimestamp);
      setCurrentTime(preservedTimestamp);
      setIsStreamLoading(true);
      setIsSeamlessSwitching(true);
      hasLiveTimeTelemetryRef.current = false;
      setServerIndex(chosenIdx);

      if (onSelectServer) {
        onSelectServer(targetServer);
      }

      try {
        localStorage.setItem(`cinestream_srv_v7_${media.id}`, String(chosenIdx));
      } catch {}

      const timeLabel = preservedTimestamp > 0 ? ` at ${formatTime(preservedTimestamp)}` : '';
      showToast(
        reason
          ? `${reason} — Seamlessly switching to Server ${chosenIdx + 1} (${targetServer.badge})${timeLabel}`
          : `Switched to Server ${chosenIdx + 1}: ${targetServer.badge}${timeLabel} (${
              isTV ? `S${currentSeason}:E${currentEpisode}` : 'Movie'
            })`
      );
    },
    [closeAllMenus, media.id, onSelectServer, showToast, isTV, currentSeason, currentEpisode]
  );

  // Automatic Failover Handler (uses seamless server switch to preserve timestamp & episode)
  const triggerAutomaticFailover = useCallback(
    (reason?: string) => {
      if (autoRetryCountRef.current >= STREAM_SERVERS.length) {
        return;
      }
      autoRetryCountRef.current += 1;
      const nextIdx = (serverIndex + 1) % STREAM_SERVERS.length;
      handleSeamlessServerSwitch(nextIdx, reason || 'Optimizing stream');
    },
    [serverIndex, handleSeamlessServerSwitch]
  );

  // Internal Application Player Controls:
  // 1. Play / Pause: NEVER changes iframe src/key and NEVER unmounts the iframe, preventing server resets!
  const handleTogglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      sendPlayerCommand(next ? 'play' : 'pause');
      showToast(
        next
          ? `▶ Playing (${formatTime(currentTimeRef.current)})`
          : `⏸ Paused at ${formatTime(currentTimeRef.current)}`,
        1400
      );
      return next;
    });
  }, [sendPlayerCommand, showToast]);

  // 2. Seek (-10s, +10s, Skip Intro, Seekbar): sends in-place seek command + updates committedStartAt
  const commitSeekTimestamp = useCallback(
    (targetSec: number) => {
      const clamped = Math.max(0, Math.min(durationRef.current, Math.floor(targetSec)));
      lastManualSeekAtRef.current = Date.now();
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);

      // Send immediate in-place seek postMessage to the embedded player
      sendPlayerCommand('seek', clamped);

      // Also debounce-sync committedStartAt for providers that rely on URL startAt parameter
      if (seekCommitTimerRef.current) clearTimeout(seekCommitTimerRef.current);
      seekCommitTimerRef.current = setTimeout(() => {
        setCommittedStartAt(clamped);
      }, 450);
    },
    [sendPlayerCommand]
  );

  const handleSeekByOffset = useCallback(
    (deltaSeconds: number) => {
      const nextTime = Math.max(
        0,
        Math.min(durationRef.current, currentTimeRef.current + deltaSeconds)
      );
      commitSeekTimestamp(nextTime);

      setSeekFeedback(deltaSeconds > 0 ? 'forward' : 'backward');
      if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
      seekFeedbackTimerRef.current = setTimeout(() => {
        setSeekFeedback(null);
      }, 700);
      showToast(
        deltaSeconds > 0
          ? `⏩ +${deltaSeconds}s Forward (${formatTime(nextTime)})`
          : `⏪ ${deltaSeconds}s Backward (${formatTime(nextTime)})`,
        1400
      );
    },
    [commitSeekTimestamp, showToast]
  );

  const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = Number(e.target.value);
    commitSeekTimestamp(targetSec);
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      sendPlayerCommand(next ? 'mute' : 'unmute');
      showToast(next ? '🔇 Muted' : '🔊 Unmuted', 1300);
      return next;
    });
  }, [sendPlayerCommand, showToast]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    const muted = val === 0;
    setIsMuted(muted);
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
      showToast(`Screen Fit: ${label}`, 1600);
      return next;
    });
  };

  // Next episode details computation
  const getNextEpisodeInfo = useCallback(() => {
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
  }, [isTV, episodesMap, currentSeason, currentEpisode, media.backdrop, media.poster]);

  const nextEpInfo = getNextEpisodeInfo();

  const triggerNextEpisodeCountdown = useCallback(() => {
    if (!isTV || !isAutoPlayEnabled) return;
    const nextInfo = getNextEpisodeInfo();
    if (!nextInfo) return;
    setCountdown(5);
  }, [isTV, isAutoPlayEnabled, getNextEpisodeInfo]);

  const cancelCountdown = () => {
    setCountdown(null);
  };

  const playNextEpisodeImmediately = useCallback(() => {
    const nextInfo = getNextEpisodeInfo();
    if (nextInfo) {
      setCountdown(null);
      onEpisodeChange(nextInfo.season, nextInfo.episode);
    }
  }, [getNextEpisodeInfo, onEpisodeChange]);

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
  }, [countdown, playNextEpisodeImmediately]);

  // Listen for live telemetry (PLAYER_EVENT from VidLink/VidFast/Videasy & postMessage from providers)
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

        if (typeof payload === 'object' && payload !== null) {
          const evData = payload.data || payload.info || payload;

          if (typeof evData.currentTime === 'number' && evData.currentTime > 0) {
            hasLiveTimeTelemetryRef.current = true;
            setIsStreamLoading(false);
            setIsSeamlessSwitching(false);
            if (Date.now() - lastManualSeekAtRef.current > 2000) {
              setCurrentTime(Math.floor(evData.currentTime));
            }
          }

          if (typeof evData.duration === 'number' && evData.duration > 60) {
            setDuration(Math.floor(evData.duration));
          }

          if (evData.event === 'play' || evData.playerState === 1) {
            setIsStreamLoading(false);
            setIsSeamlessSwitching(false);
            setIsPlaying(true);
          } else if (evData.event === 'pause' || evData.playerState === 2) {
            setIsPlaying(false);
          } else if (evData.event === 'ended' || evData.playerState === 0) {
            triggerNextEpisodeCountdown();
            return;
          }
        }

        const isEnded =
          payload === 'ended' ||
          payload === 'video_ended' ||
          payload?.event === 'ended' ||
          payload?.event === 'video_ended' ||
          payload?.type === 'ended' ||
          payload?.type === 'PLAYER_ENDED';

        if (isEnded) {
          triggerNextEpisodeCountdown();
          return;
        }

        const isError =
          payload === 'error' ||
          payload === 'media_error' ||
          payload === 'no_sources' ||
          payload?.event === 'error' ||
          payload?.type === 'PLAYER_ERROR';

        if (isError) {
          triggerAutomaticFailover('Stream unavailable on current server');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [triggerNextEpisodeCountdown, triggerAutomaticFailover]);

  // Compute active stream URL:
  // Notice `isPlaying` and `currentTime` are NOT dependencies here — only `committedStartAt` is used!
  // This guarantees Play/Pause and timeline ticking NEVER reload or reset the provider iframe.
  const streamUrl = activeServer.buildUrl({
    type: isTV ? 'tv' : 'movie',
    id: media.id,
    imdbId: media.imdbId || media.id,
    tmdbId: media.tmdbId,
    season: currentSeason,
    episode: currentEpisode,
    quality: currentQuality,
    startAt: committedStartAt,
  });

  const handleReloadStream = () => {
    const resumeSec = Math.max(0, Math.floor(currentTimeRef.current));
    setCommittedStartAt(resumeSec);
    setIsStreamLoading(true);
    setReloadNonce((prev) => prev + 1);
    showToast(`Reloading Server ${serverIndex + 1} at ${formatTime(resumeSec)}...`);
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

  const toggleFullscreen = useCallback(() => {
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
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleQualityChange = (q: VideoQuality) => {
    const preservedSec = Math.max(0, Math.floor(currentTimeRef.current));
    setCommittedStartAt(preservedSec);
    setCurrentQuality(q);
    setShowQualityMenu(false);
    try {
      localStorage.setItem('cinestream_preferred_quality', q);
    } catch {}
    showToast(`Quality set to ${q.toUpperCase()} (Resuming at ${formatTime(preservedSec)})`);
  };

  // Idle timer: keeps internal player controls visible whenever any dropdown menu is open or paused
  const resetIdleTimer = useCallback(() => {
    setShowControlsOverlay(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isAnyMenuOpen || !isPlaying) {
      return;
    }
    idleTimerRef.current = setTimeout(() => {
      if (!isAnyMenuOpen && isPlaying) {
        setShowControlsOverlay(false);
      }
    }, 5000);
  }, [isAnyMenuOpen, isPlaying]);

  useEffect(() => {
    if (isAnyMenuOpen || !isPlaying) {
      setShowControlsOverlay(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [streamUrl, isAnyMenuOpen, isPlaying, resetIdleTimer]);

  // TV Remote & Keyboard Hotkeys inside PlayerView (Menu, MediaPlayPause, Rewind, FastForward, Server Switch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
      if (tag === 'TEXTAREA') return;

      const keyCode = e.keyCode || e.which;

      // Remote Menu / Guide / Info key reveals internal player controls & focuses Server Selector
      if (
        e.key === 'ContextMenu' ||
        e.key === 'Menu' ||
        e.key === 'Info' ||
        e.key === 'Guide' ||
        e.key === 'F1' ||
        keyCode === 82 ||
        keyCode === 165
      ) {
        e.preventDefault();
        resetIdleTimer();
        setShowSourceMenu((prev) => !prev);
        return;
      }

      // Any D-pad arrow wakes up the internal application player UI controls
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        keyCode === 37 ||
        keyCode === 38 ||
        keyCode === 39 ||
        keyCode === 40
      ) {
        resetIdleTimer();
      }

      if (e.key === 'k' || e.key === 'K' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'MediaRewind') {
        e.preventDefault();
        handleSeekByOffset(-10);
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'MediaFastForward') {
        e.preventDefault();
        handleSeekByOffset(10);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'e' || e.key === 'E') {
        if (isTV) {
          e.preventDefault();
          setShowEpisodeModal((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    resetIdleTimer,
    handleTogglePlayPause,
    handleSeekByOffset,
    toggleFullscreen,
    handleToggleMute,
    isTV,
  ]);

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
        <div
          role="dialog"
          aria-modal="true"
          className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
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
                data-tv-nav="true"
                data-tv-autofocus="true"
                className="tv-focus flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Play Now</span>
              </button>
              <button
                onClick={cancelCountdown}
                data-tv-nav="true"
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

      {/* Internal Application Player Top Bar (All buttons support TV Remote Up/Down/Left/Right/OK) */}
      <div
        ref={topMenusRef}
        className={`transition-opacity duration-200 z-40 ${
          showControlsOverlay || isAnyMenuOpen || !isFullscreen
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
            type="button"
            onClick={onBack}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-800 shadow-sm shrink-0"
            title="Back to Browse (Remote Back)"
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

        {/* Right: Episodes List, Seamless 12-Server Selector, Quality, Reload & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isTV && (
            <button
              type="button"
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

          {/* Persistent 12-Server Selector Dropdown (Maintains timestamp & episode on switch) */}
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
              title="Switch Server Seamlessly (Maintains Timestamp & Episode)"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Server {serverIndex + 1}</span>
            </button>

            {showSourceMenu && (
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[78vh] overflow-y-auto bg-slate-900 border border-amber-500/50 rounded-2xl p-2.5 shadow-2xl z-50 text-left space-y-1.5"
              >
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-white">
                      Seamless Server Switch (12 OTT Servers)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Preserves {formatTime(currentTime)} timestamp &{' '}
                      {isTV ? `S${currentSeason}:E${currentEpisode}` : 'playback state'}:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSourceMenu(false)}
                    data-tv-nav="true"
                    className="tv-focus p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
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
                      onClick={() => handleSeamlessServerSwitch(idx)}
                      data-tv-nav="true"
                      data-tv-autofocus={isCurrent ? 'true' : undefined}
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
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1"
              >
                <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-white">
                  <span>Video Quality</span>
                  <button
                    type="button"
                    onClick={() => setShowQualityMenu(false)}
                    data-tv-nav="true"
                    className="tv-focus p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
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
            type="button"
            onClick={handleReloadStream}
            data-tv-nav="true"
            className="tv-focus hidden lg:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800"
            title="Reload Stream at Current Timestamp"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            data-tv-nav="true"
            className="tv-focus p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Internal Application Player Viewport
          - Renders stream source inside our internal application player shell
          - Prevents embedded iframes from stealing TV remote D-pad focus (`tabIndex={-1}`)
          - Keeps iframe mounted continuously so Play/Pause never resets the stream */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${
          isFullscreen
            ? 'flex-1 h-full'
            : 'aspect-video sm:aspect-auto sm:h-[62vh] md:h-[70vh] lg:h-[78vh] xl:h-[84vh] 2xl:h-[86vh]'
        }`}
      >
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
            key={`${reloadNonce}-${media.id}-${currentSeason}-${currentEpisode}-${activeServer.id}-${currentQuality}-${committedStartAt}`}
            src={streamUrl}
            tabIndex={-1}
            title={media.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="origin"
            onLoad={handleIframeLoad}
            onError={() => triggerAutomaticFailover('Connection timeout')}
            className={`w-full h-full border-0 bg-black ${
              interactiveEmbedMode ? 'pointer-events-auto' : 'pointer-events-none sm:pointer-events-auto'
            }`}
          />
        </div>

        {/* Seamless Server Switch / Initial Buffer Status Pill (Timer stays locked until ready) */}
        {(isStreamLoading || isSeamlessSwitching) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-1.5 rounded-full bg-slate-950/90 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xl backdrop-blur-md">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span>
              {isSeamlessSwitching
                ? `Seamlessly resuming on Server ${serverIndex + 1} (${activeServer.badge}) at ${formatTime(
                    currentTime
                  )}...`
                : `Syncing Server ${serverIndex + 1} (${activeServer.badge}) · ${formatTime(
                    currentTime
                  )}`}
            </span>
          </div>
        )}

        {/* Visual -10s / +10s Seek Ripple Feedback */}
        {seekFeedback === 'backward' && (
          <div className="absolute left-6 sm:left-16 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/80 border border-amber-500/50 text-amber-400 shadow-2xl">
            <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-xs font-extrabold font-mono mt-1">-10s</span>
          </div>
        )}

        {seekFeedback === 'forward' && (
          <div className="absolute right-6 sm:right-16 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/80 border border-amber-500/50 text-amber-400 shadow-2xl">
            <RotateCw className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-xs font-extrabold font-mono mt-1">+10s</span>
          </div>
        )}

        {/* Internal Application Player Bottom Control Deck (Consistent TV Remote Compatibility Across All Providers) */}
        <div
          ref={bottomMenusRef}
          onClick={(e) => e.stopPropagation()}
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
                Remote Controls Locked · {media.title}
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Synchronized Timeline / Seekbar Row */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] sm:text-xs font-mono tabular-nums text-amber-400 font-bold shrink-0">
                  {formatTime(currentTime)}
                </span>

                <div className="relative flex-1 flex items-center group py-1">
                  <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
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

              {/* Main Internal Application Player Control Row (All buttons navigable via TV Remote D-Pad) */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Left Transport Controls: Play/Pause, -10s, +10s, Volume, Skip Intro */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    ref={primaryPlayBtnRef}
                    type="button"
                    onClick={handleTogglePlayPause}
                    data-tv-nav="true"
                    data-tv-autofocus="true"
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

                {/* Center Episode / Movie Navigation Controls */}
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

                {/* Right Utility Controls: Next Server Quick Switch, Audio/Sub, Speed, Fit, Lock, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* 1-Click Next Server Button (Seamless Switch for TV Remotes) */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSeamlessServerSwitch((serverIndex + 1) % STREAM_SERVERS.length)
                    }
                    data-tv-nav="true"
                    className="tv-focus flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 text-xs font-bold border border-amber-500/40 whitespace-nowrap"
                    title="Seamlessly Switch to Next Server (Preserves Timestamp)"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Next Server</span>
                  </button>

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
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-50 text-left space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs font-bold text-white">
                          <span>Audio & Subtitles</span>
                          <button
                            type="button"
                            onClick={() => setShowAudioMenu(false)}
                            data-tv-nav="true"
                            className="tv-focus p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
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
                              data-tv-nav="true"
                              className={`tv-focus w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
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
                              data-tv-nav="true"
                              className={`tv-focus w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
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
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-full mb-2 w-40 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 text-left space-y-1"
                      >
                        <div className="px-2.5 py-1 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
                          <span>Speed</span>
                          <button
                            type="button"
                            onClick={() => setShowSpeedMenu(false)}
                            data-tv-nav="true"
                            className="tv-focus p-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {SPEED_OPTIONS.map((spd) => (
                          <button
                            type="button"
                            key={spd}
                            onClick={() => handleSpeedChange(spd)}
                            data-tv-nav="true"
                            className={`tv-focus w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
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

                  {/* Screen Fit Toggle */}
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

                  {/* Embed Touch Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setInteractiveEmbedMode((prev) => {
                        const next = !prev;
                        showToast(
                          next
                            ? 'Embed Touch Mode ON'
                            : 'TV Remote Internal Player Navigation ON'
                        );
                        return next;
                      });
                    }}
                    data-tv-nav="true"
                    className={`tv-focus hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${
                      interactiveEmbedMode
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                    title="Toggle Embed Touch vs TV Remote Internal Navigation"
                  >
                    {interactiveEmbedMode ? (
                      <MousePointerClick className="w-3.5 h-3.5" />
                    ) : (
                      <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </button>

                  {/* Lock Controls */}
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

      {/* Details, Seamless 12-Server Bar & Interactive Episodes Section Below Video (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 py-5 sm:py-8 space-y-6">
          {/* Quick Horizontal 12-Server Switcher Bar (Preserves playback state, timestamp & episode) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Server className="w-4 h-4 text-amber-400" />
                <span>
                  Seamless OTT Servers (Switches provider while keeping {formatTime(currentTime)} &{' '}
                  {isTV ? `S${currentSeason}:E${currentEpisode}` : 'playback state'}):
                </span>
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
                    onClick={() => handleSeamlessServerSwitch(idx)}
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
                  type="button"
                  onClick={handlePrevEp}
                  disabled={currentSeason === 1 && currentEpisode === 1}
                  data-tv-nav="true"
                  className="tv-focus flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-semibold text-slate-200 border border-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Episode</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextEp}
                  data-tv-nav="true"
                  className="tv-focus flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20"
                >
                  <span>Next Episode</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
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
                        type="button"
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
                    data-tv-nav="true"
                    onClick={() => {
                      setIsAutoPlayEnabled((prev) => {
                        const next = !prev;
                        try {
                          localStorage.setItem('cinestream_autoplay_next', String(next));
                        } catch {}
                        return next;
                      });
                    }}
                    className={`tv-focus relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
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
                      type="button"
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
