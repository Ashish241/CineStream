export type MediaType = 'movie' | 'tv' | 'series';

export type VideoQuality = '1080p' | '720p' | '360p' | 'auto';

export interface MediaItem {
  id: string; // IMDb ID (tt...) or TMDB ID
  tmdbId?: string;
  imdbId?: string;
  title: string;
  type: MediaType;
  poster: string;
  backdrop?: string;
  year?: number | string;
  rating?: number | string;
  overview?: string;
  genres?: string[];
  duration?: string;
  totalSeasons?: number;
  featured?: boolean;
  category?: string;
  aliases?: string[];
  isSerial?: boolean;
  defaultServerId?: string;
  platform?: string;
}

export interface Episode {
  season: number;
  episode: number;
  title: string;
  overview?: string;
  thumbnail?: string;
  released?: string;
}

export interface StreamServer {
  id: string;
  name: string;
  badge: string;
  quality: string;
  isRecommended?: boolean;
  notes?: string;
  supportsTmdb?: boolean;
  supportsImdb?: boolean;
  supportsQualityParam?: boolean;
  buildUrl: (params: {
    type: 'movie' | 'tv';
    id: string; // resolved preferred ID (tmdb or imdb)
    imdbId?: string;
    tmdbId?: string;
    season?: number;
    episode?: number;
    quality?: VideoQuality;
    startAt?: number;
    autoPlay?: boolean;
    muted?: boolean;
  }) => string;
}

export interface WatchHistoryItem {
  media: MediaItem;
  season?: number;
  episode?: number;
  serverId: string;
  watchedAt: number;
}
