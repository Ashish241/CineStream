import { Episode, MediaItem, MediaType } from '../types';
import {
  ALL_TIME_CLASSICS,
  ANIME_COLLECTION,
  BOLLYWOOD_SPECIALS,
  HERO_FEATURED_ITEMS,
  NEW_2026_RELEASES,
  TRENDING_MOVIES,
  TRENDING_SERIES,
  TV_SERIALS_COLLECTION,
} from '../data/curatedCatalog';
import { IMDB_TO_TMDB_MAP } from '../data/servers';
import { containsDevanagari, convertHindiToEnglish } from '../utils/hindiTransliteration';

// Cinemeta Stremio open catalog endpoints (free, CORS-enabled, no API key needed)
const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';
const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';

export interface DirectSerialStream {
  id: string;
  title: string;
  embedUrl: string;
  duration: number;
  thumbnail?: string;
}

interface CinemetaMetaResponse {
  meta?: {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    logo?: string;
    description?: string;
    releaseInfo?: string;
    imdbRating?: string;
    genres?: string[];
    runtime?: string;
    videos?: Array<{
      id: string;
      title: string;
      season: number;
      episode: number;
      overview?: string;
      thumbnail?: string;
      released?: string;
    }>;
  };
}

interface CinemetaCatalogResponse {
  metas?: Array<{
    id: string;
    type: string;
    name: string;
    poster?: string;
    releaseInfo?: string;
    imdbRating?: string;
    description?: string;
    genres?: string[];
  }>;
}

// Known Indian TV Serials / Daily Soaps keywords or IDs for automatic Serial Engine detection
const SERIAL_TITLE_PATTERNS = [
  'taarak mehta',
  'tarak mehta',
  'tmkoc',
  'ali baba',
  '40 bhoot',
  'dastaan-e-kabul',
  'anupama',
  'yeh rishta',
  'cid',
  'baalveer',
  'aladdin',
  'wagle ki duniya',
  'pushpa impossible',
  'bhabiji ghar par',
  'sarabhai vs sarabhai',
  'khichdi',
  'crime patrol',
  'savdhaan india',
  'kumkum bhagya',
  'kundali bhagya',
  'bhagya lakshmi',
  'ghoom hai kisikey',
  'jhanak',
  'udne ki aasha',
  'tenali rama',
  'chakravartin ashoka',
  'devon ke dev',
  'radhakrishn',
  'shrimad ramayan',
  'ramayan',
  'mahabharat',
  'shaktimaan',
  'ahat',
  'fir ',
  'lapataganj',
  'chidiya ghar',
  'maddam sir',
  'naagin',
  'bigg boss',
  'kapil sharma',
  'indian idol',
  'shark tank india',
  'kaun banega crorepati',
];

export function isLikelyTvSerial(media: MediaItem): boolean {
  if (media.isSerial || media.category === 'serials') return true;
  const serialMatch = TV_SERIALS_COLLECTION.some(
    (s) => s.id === media.id || s.imdbId === media.id || s.tmdbId === media.id || s.tmdbId === media.tmdbId
  );
  if (serialMatch) return true;
  const lowerTitle = (media.title || '').toLowerCase();
  return SERIAL_TITLE_PATTERNS.some((p) => lowerTitle.includes(p));
}

// Phonetic and typo-tolerant search normalizer (preserves Devanagari letters)
function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, '')
    .replace(/\s+/g, '')
    .replace(/j/g, 'z')
    .replace(/sh/g, 's')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u');
}

// Convert TMDB raw item into MediaItem
function mapTmdbItemToMedia(item: any, forcedType?: 'movie' | 'tv'): MediaItem | null {
  if (!item || !item.id || (!item.poster_path && !item.backdrop_path)) return null;
  const isTv = forcedType ? forcedType === 'tv' : item.media_type === 'tv' || Boolean(item.first_air_date || item.name);
  let title = isTv ? item.name || item.original_name : item.title || item.original_title;
  const tmdbIdStr = String(item.id);

  // Preserve requested display title for Ali Baba Aur 40 Bhoot
  if (tmdbIdStr === '208744' || (title && title.toLowerCase().includes('dastaan-e-kabul'))) {
    title = 'Ali Baba Aur 40 Bhoot';
  }

  const date = isTv ? item.first_air_date : item.release_date;
  const year = date ? String(date).slice(0, 4) : '';

  const mediaItem: MediaItem = {
    id: tmdbIdStr,
    tmdbId: tmdbIdStr,
    imdbId: tmdbIdStr,
    title: title || 'Untitled',
    type: isTv ? 'tv' : 'movie',
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : `https://image.tmdb.org/t/p/w780${item.backdrop_path}`,
    backdrop: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
      : item.poster_path
      ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
      : undefined,
    year,
    rating: item.vote_average ? String(Number(item.vote_average).toFixed(1)) : '7.8',
    overview: item.overview || '',
    genres: [],
  };

  if (isLikelyTvSerial(mediaItem)) {
    mediaItem.isSerial = true;
    mediaItem.category = 'serials';
  }

  return mediaItem;
}

// Fallback search in curated catalog with alias matching and fuzzy phonetic support
function searchLocalCatalog(query: string): MediaItem[] {
  const rawQ = query.toLowerCase().trim();
  const isHindi = containsDevanagari(rawQ);
  const transliterated = isHindi ? convertHindiToEnglish(rawQ).toLowerCase().trim() : '';
  const normQ = normalizeSearch(rawQ);
  const normTranslit = transliterated ? normalizeSearch(transliterated) : '';

  const all = [
    ...HERO_FEATURED_ITEMS,
    ...NEW_2026_RELEASES,
    ...TV_SERIALS_COLLECTION,
    ...ALL_TIME_CLASSICS,
    ...TRENDING_SERIES,
    ...TRENDING_MOVIES,
    ...BOLLYWOOD_SPECIALS,
    ...ANIME_COLLECTION,
  ];

  const unique = new Map<string, MediaItem>();
  for (const item of all) {
    const itemTitle = item.title.toLowerCase();
    const normTitle = normalizeSearch(item.title);
    const itemOverview = (item.overview || '').toLowerCase();

    const matchesAlias = item.aliases?.some((alias) => {
      const aLower = alias.toLowerCase();
      const aNorm = normalizeSearch(alias);
      return (
        aLower.includes(rawQ) ||
        rawQ.includes(aLower) ||
        (transliterated && (aLower.includes(transliterated) || transliterated.includes(aLower))) ||
        (normQ.length >= 2 && (aNorm.includes(normQ) || normQ.includes(aNorm))) ||
        (normTranslit.length >= 2 && (aNorm.includes(normTranslit) || normTranslit.includes(aNorm)))
      );
    });

    const isMatch =
      matchesAlias ||
      itemTitle.includes(rawQ) ||
      (transliterated && itemTitle.includes(transliterated)) ||
      (normQ.length >= 2 && normTitle.includes(normQ)) ||
      (normTranslit.length >= 2 && normTitle.includes(normTranslit)) ||
      itemOverview.includes(rawQ) ||
      (transliterated && itemOverview.includes(transliterated)) ||
      item.id.toLowerCase() === rawQ ||
      (item.genres && item.genres.some((g) => g.toLowerCase().includes(rawQ)));

    if (isMatch) {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
      }
    }
  }
  return Array.from(unique.values());
}

/**
 * Searches movies, web series, anime, and TV serials by title or IMDb/TMDB ID
 */
export async function searchCatalog(query: string): Promise<MediaItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  if (/^tt\d+$/i.test(cleanQuery)) {
    try {
      const details = await fetchMediaDetails('movie', cleanQuery);
      if (details?.media) return [details.media];
    } catch {
      // ignore
    }
  }

  const isHindi = containsDevanagari(cleanQuery);
  const englishQuery = isHindi ? convertHindiToEnglish(cleanQuery) : cleanQuery;

  const localMatches = searchLocalCatalog(cleanQuery);
  const englishLocalMatches = isHindi && englishQuery !== cleanQuery ? searchLocalCatalog(englishQuery) : [];

  const initialMatchesMap = new Map<string, MediaItem>();
  localMatches.forEach((m) => initialMatchesMap.set(m.id, m));
  englishLocalMatches.forEach((m) => initialMatchesMap.set(m.id, m));

  try {
    const encodedEnglish = encodeURIComponent(englishQuery);

    const [tmdbRes, tmdbPage2Res, movieRes, seriesRes] = await Promise.allSettled([
      fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodedEnglish}&include_adult=false&page=1`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodedEnglish}&include_adult=false&page=2`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(`${CINEMETA_BASE}/catalog/movie/top/search=${encodedEnglish}.json`, {
        headers: { Accept: 'application/json' },
      }).then((r) => (r.ok ? (r.json() as Promise<CinemetaCatalogResponse>) : null)),
      fetch(`${CINEMETA_BASE}/catalog/series/top/search=${encodedEnglish}.json`, {
        headers: { Accept: 'application/json' },
      }).then((r) => (r.ok ? (r.json() as Promise<CinemetaCatalogResponse>) : null)),
    ]);

    const remoteItems: MediaItem[] = [];

    const processTmdbResults = (results: any[]) => {
      for (const item of results) {
        if (!item.id || (item.media_type !== 'movie' && item.media_type !== 'tv')) continue;
        const mapped = mapTmdbItemToMedia(item);
        if (mapped) remoteItems.push(mapped);
      }
    };

    if (tmdbRes.status === 'fulfilled' && tmdbRes.value?.results) {
      processTmdbResults(tmdbRes.value.results);
    }
    if (tmdbPage2Res.status === 'fulfilled' && tmdbPage2Res.value?.results) {
      processTmdbResults(tmdbPage2Res.value.results);
    }

    if (movieRes.status === 'fulfilled' && movieRes.value?.metas) {
      for (const m of movieRes.value.metas) {
        if (!m.id) continue;
        remoteItems.push({
          id: m.id,
          imdbId: m.id,
          title: m.name || 'Untitled Movie',
          type: 'movie',
          poster: m.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop',
          year: m.releaseInfo || '',
          rating: m.imdbRating || '',
          overview: m.description || '',
          genres: m.genres || [],
        });
      }
    }

    if (seriesRes.status === 'fulfilled' && seriesRes.value?.metas) {
      for (const s of seriesRes.value.metas) {
        if (!s.id) continue;
        const item: MediaItem = {
          id: s.id,
          imdbId: s.id,
          title: s.name === 'Ali Baba: Dastaan-E-Kabul' ? 'Ali Baba Aur 40 Bhoot' : s.name || 'Untitled Series',
          type: 'tv',
          poster: s.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop',
          year: s.releaseInfo || '',
          rating: s.imdbRating || '',
          overview: s.description || '',
          genres: s.genres || [],
        };
        if (isLikelyTvSerial(item)) {
          item.isSerial = true;
          item.category = 'serials';
        }
        remoteItems.push(item);
      }
    }

    const combinedMap = new Map<string, MediaItem>(initialMatchesMap);
    remoteItems.forEach((item) => {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    });

    return Array.from(combinedMap.values());
  } catch (err) {
    console.warn('Network search failed, returning local catalog matches', err);
    return Array.from(initialMatchesMap.values());
  }
}

/**
 * Fetches live auto-updating feeds from TMDB so newly released movies, web series,
 * Indian OTT releases, TV serials, and anime automatically appear on the home screen!
 */
export async function fetchLiveHomeFeeds(): Promise<{
  trendingToday: MediaItem[];
  newIndianReleases: MediaItem[];
  liveMovies: MediaItem[];
  liveSeries: MediaItem[];
  liveSerials: MediaItem[];
  liveAnime: MediaItem[];
}> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [trendingRes, indianMoviesRes, indianTvRes, moviesRes, seriesRes, serialsRes, animeRes] =
      await Promise.allSettled([
        fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_original_language=hi&sort_by=primary_release_date.desc&primary_release_date.lte=${today}&vote_count.gte=5&page=1`
        ).then((r) => (r.ok ? r.json() : null)),
        fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_original_language=hi&sort_by=first_air_date.desc&first_air_date.lte=${today}&page=1`
        ).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_KEY}&region=IN&page=1`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`https://api.themoviedb.org/3/tv/trending/week?api_key=${TMDB_KEY}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_origin_country=IN&with_original_language=hi&sort_by=popularity.desc&page=1`
        ).then((r) => (r.ok ? r.json() : null)),
        fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1`
        ).then((r) => (r.ok ? r.json() : null)),
      ]);

    const parseList = (res: PromiseSettledResult<any>, forcedType?: 'movie' | 'tv'): MediaItem[] => {
      if (res.status !== 'fulfilled' || !res.value?.results) return [];
      const out: MediaItem[] = [];
      for (const raw of res.value.results) {
        const m = mapTmdbItemToMedia(raw, forcedType);
        if (m) out.push(m);
      }
      return out;
    };

    const trendingToday = parseList(trendingRes);
    const indianMovies = parseList(indianMoviesRes, 'movie');
    const indianTv = parseList(indianTvRes, 'tv');
    const newIndianReleases = [...indianMovies.slice(0, 10), ...indianTv.slice(0, 10)];
    const liveMovies = parseList(moviesRes, 'movie');
    const liveSeries = parseList(seriesRes, 'tv');
    const liveSerials = parseList(serialsRes, 'tv').map((s) => ({ ...s, isSerial: true, category: 'serials' as const }));
    const liveAnime = parseList(animeRes, 'tv');

    return {
      trendingToday,
      newIndianReleases,
      liveMovies,
      liveSeries,
      liveSerials,
      liveAnime,
    };
  } catch (err) {
    console.warn('Live home feeds fallback to curated catalog', err);
    return {
      trendingToday: [],
      newIndianReleases: [],
      liveMovies: [],
      liveSeries: [],
      liveSerials: [],
      liveAnime: [],
    };
  }
}

/**
 * Fetches live OTT Platform catalog from TMDB (Netflix, Prime Video, JioHotstar, SonyLIV, ZEE5, Apple TV+)
 */
export async function fetchLiveOttCatalog(
  providerId: string,
  networkId: string,
  page = 1
): Promise<{ movies: MediaItem[]; series: MediaItem[] }> {
  try {
    const [moviesByProvider, tvByProvider, tvByNetwork] = await Promise.allSettled([
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&watch_region=IN&with_watch_providers=${providerId}&sort_by=popularity.desc&page=${page}`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&watch_region=IN&with_watch_providers=${providerId}&sort_by=popularity.desc&page=${page}`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=${networkId}&sort_by=popularity.desc&page=${page}`
      ).then((r) => (r.ok ? r.json() : null)),
    ]);

    const movies: MediaItem[] = [];
    const seriesMap = new Map<string, MediaItem>();

    if (moviesByProvider.status === 'fulfilled' && moviesByProvider.value?.results) {
      for (const raw of moviesByProvider.value.results) {
        const m = mapTmdbItemToMedia(raw, 'movie');
        if (m) movies.push(m);
      }
    }

    if (tvByProvider.status === 'fulfilled' && tvByProvider.value?.results) {
      for (const raw of tvByProvider.value.results) {
        const s = mapTmdbItemToMedia(raw, 'tv');
        if (s) seriesMap.set(s.id, s);
      }
    }

    if (tvByNetwork.status === 'fulfilled' && tvByNetwork.value?.results) {
      for (const raw of tvByNetwork.value.results) {
        const s = mapTmdbItemToMedia(raw, 'tv');
        if (s && !seriesMap.has(s.id)) seriesMap.set(s.id, s);
      }
    }

    return {
      movies,
      series: Array.from(seriesMap.values()),
    };
  } catch (err) {
    console.warn('Error fetching live OTT catalog:', err);
    return { movies: [], series: [] };
  }
}

/**
 * Fetches paginated discover catalog for infinite "Load More" across Movies, Series, Bollywood, TV Serials, and Anime
 */
export async function fetchDiscoverCatalog(
  category: 'movies' | 'series' | 'bollywood' | 'serials' | 'anime',
  page = 1,
  filter: 'popular' | 'newest' | 'classic' = 'popular'
): Promise<MediaItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    let url = '';
    if (category === 'movies') {
      const sort =
        filter === 'newest'
          ? `primary_release_date.desc&primary_release_date.lte=${today}&vote_count.gte=20`
          : filter === 'classic'
          ? 'vote_average.desc&vote_count.gte=1500'
          : 'popularity.desc';
      url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&sort_by=${sort}&page=${page}`;
    } else if (category === 'series') {
      const sort =
        filter === 'newest'
          ? `first_air_date.desc&first_air_date.lte=${today}&vote_count.gte=10`
          : filter === 'classic'
          ? 'vote_average.desc&vote_count.gte=500'
          : 'popularity.desc';
      url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&sort_by=${sort}&page=${page}`;
    } else if (category === 'bollywood') {
      const sort =
        filter === 'newest'
          ? `primary_release_date.desc&primary_release_date.lte=${today}`
          : filter === 'classic'
          ? 'vote_average.desc&vote_count.gte=50'
          : 'popularity.desc';
      url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_original_language=hi&sort_by=${sort}&page=${page}`;
    } else if (category === 'serials') {
      url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_origin_country=IN&with_original_language=hi&sort_by=popularity.desc&page=${page}`;
    } else if (category === 'anime') {
      const sort =
        filter === 'newest'
          ? `first_air_date.desc&first_air_date.lte=${today}`
          : filter === 'classic'
          ? 'vote_average.desc&vote_count.gte=200'
          : 'popularity.desc';
      url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=${sort}&page=${page}`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const forcedType = category === 'movies' || category === 'bollywood' ? 'movie' : 'tv';

    const items: MediaItem[] = [];
    for (const raw of data.results || []) {
      const mapped = mapTmdbItemToMedia(raw, forcedType);
      if (mapped) {
        if (category === 'serials') {
          mapped.isSerial = true;
          mapped.category = 'serials';
        }
        items.push(mapped);
      }
    }
    return items;
  } catch (err) {
    console.warn('Discover catalog error:', err);
    return [];
  }
}

/**
 * Resolves playable full-episode streams for Indian TV Serials and hard-to-find shows
 * via Dailymotion's public CORS API (No API key required, works on Smart TVs, Airtel Xstream Box & Mobile)
 */
export async function fetchDirectSerialStreams(
  title: string,
  season = 1,
  episode = 1,
  isMovie = false
): Promise<DirectSerialStream[]> {
  // Clean title for better episode matching
  let searchTitle = title
    .replace(/\(.*?\)/g, '')
    .replace(/Season\s*\d+/gi, '')
    .trim();

  // For Ali Baba Aur 40 Bhoot, search both popular names so episodes always resolve
  const isAliBaba =
    searchTitle.toLowerCase().includes('ali baba') || searchTitle.toLowerCase().includes('40 bhoot');

  const queries = isMovie
    ? [`${searchTitle} full movie hindi`, `${searchTitle} full movie`]
    : isAliBaba
    ? [
        `Ali Baba Dastaan E Kabul Episode ${episode}`,
        `Ali Baba Ek Andaaz Andekha Episode ${episode}`,
        `Ali Baba Episode ${episode} Full Episode`,
      ]
    : [
        `${searchTitle} Episode ${episode} Full Episode`,
        `${searchTitle} Ep ${episode}`,
        `${searchTitle} Full Episode`,
      ];

  try {
    for (const q of queries) {
      const encoded = encodeURIComponent(q);
      const res = await fetch(
        `https://api.dailymotion.com/videos?search=${encoded}&longer_than=5&limit=8&fields=id,title,duration,thumbnail_url`
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.list && Array.isArray(data.list) && data.list.length > 0) {
        return data.list.map((v: any) => ({
          id: String(v.id),
          title: String(v.title || `${title} - Ep ${episode}`),
          embedUrl: `https://www.dailymotion.com/embed/video/${v.id}?autoplay=1&ui-logo=0&sharing-enable=0`,
          duration: Number(v.duration || 1200),
          thumbnail: v.thumbnail_url,
        }));
      }
    }
  } catch (err) {
    console.warn('Direct serial stream resolver error:', err);
  }

  return [];
}

/**
 * Custom curated episode definitions for Indian web series
 */
const CURATED_SERIES_EPISODES: Record<string, Record<number, Episode[]>> = {
  // Panchayat (All 4 Seasons)
  tt11912196: {
    1: [
      { season: 1, episode: 1, title: 'Gram Panchayat Phulera', overview: 'Abhishek Tripathi arrives in Phulera as Panchayat Secretary.' },
      { season: 1, episode: 2, title: 'Bhojpuri', overview: 'A solar light installation leads to comic disputes.' },
      { season: 1, episode: 3, title: 'Chakke Wali Kursi', overview: 'Abhishek orders a revolving chair with unexpected outcomes.' },
      { season: 1, episode: 4, title: 'Kusum', overview: 'A family planning slogan causes an uproar in the village.' },
      { season: 1, episode: 5, title: 'Bhoot', overview: 'A haunted tree rumor sweeps Phulera.' },
      { season: 1, episode: 6, title: 'Bahoot Hua Samman', overview: 'A visiting groom refuses to show respect to the Pradhan.' },
      { season: 1, episode: 7, title: 'Laddoo', overview: 'The Republic Day celebration requires a delicate compromise.' },
      { season: 1, episode: 8, title: 'Jab Kangan Bole', overview: 'Abhishek studies for CAT amidst village turmoil.' },
    ],
    2: [
      { season: 2, episode: 1, title: 'Naach', overview: 'A dancer troupe stirs excitement in Phulera.' },
      { season: 2, episode: 2, title: 'Bolero', overview: 'The Pradhan acquires a new vehicle.' },
      { season: 2, episode: 3, title: 'Kranti', overview: 'Local politics heat up ahead of panchayat elections.' },
      { season: 2, episode: 4, title: 'Tension', overview: 'A drainage construction triggers neighborhood tension.' },
      { season: 2, episode: 5, title: 'Jaise Ko Taisa', overview: 'MLA Chandrakishore Singh visits Phulera.' },
      { season: 2, episode: 6, title: 'Aukaat', overview: 'Abhishek is caught between local honour and government duties.' },
      { season: 2, episode: 7, title: 'Dost', overview: 'Old friendships face unexpected trials.' },
      { season: 2, episode: 8, title: 'Parivaar', overview: 'An emotional crisis brings the entire village together.' },
    ],
    3: [
      { season: 3, episode: 1, title: 'Rangbaazi', overview: 'Abhishek prepares for the upcoming administrative transition.' },
      { season: 3, episode: 2, title: 'Chunav Fever', overview: 'Political rivalries intensify across Phulera.' },
      { season: 3, episode: 3, title: 'Gathbandhan', overview: 'Opposing factions forge surprising alliances.' },
      { season: 3, episode: 4, title: 'Aandolan', overview: 'Villagers assemble for an impassioned demonstration.' },
      { season: 3, episode: 5, title: 'Shikayat', overview: 'Official complaints are filed at the district headquarters.' },
      { season: 3, episode: 6, title: 'Dhoka', overview: 'Betrayals reshape the village power balance.' },
      { season: 3, episode: 7, title: 'Mukabla', overview: 'A dramatic confrontation unfolds between rival leaders.' },
      { season: 3, episode: 8, title: 'Faisla', overview: 'The season finale concludes with high stakes for all.' },
    ],
    4: [
      { season: 4, episode: 1, title: 'Naya Daur', overview: 'A new chapter unfolds in Phulera post the high-voltage election results.' },
      { season: 4, episode: 2, title: 'Vikas Karyakram', overview: 'New development funds and rural infrastructure schemes spark fresh village discussions.' },
      { season: 4, episode: 3, title: 'Shanti Samjhauta', overview: 'Local leaders seek a truce as Phulera welcomes district administrative delegates.' },
      { season: 4, episode: 4, title: 'Pariksha Parinaam', overview: 'Abhishek awaits his crucial career exam results while managing rural duties.' },
      { season: 4, episode: 5, title: 'Gaon Ka Mela', overview: 'The grand Phulera village fair brings fun, music, and humorous rivalries.' },
      { season: 4, episode: 6, title: 'Dosti Ki Kasam', overview: 'Vikas and Prahlad stand together through an unprecedented test.' },
      { season: 4, episode: 7, title: 'Aakhri Daav', overview: 'A strategic confrontation reaches the sub-divisional magistrate.' },
      { season: 4, episode: 8, title: 'Phulera Zindabad', overview: 'A heartwarming, high-stakes finale uniting the entire village community.' },
    ],
  },
  // Mirzapur
  tt6473300: {
    1: [
      { season: 1, episode: 1, title: 'Bhaukaal', overview: 'Munna Tripathi crashes a wedding, changing the Pandit family destiny.' },
      { season: 1, episode: 2, title: 'Guddu & Bablu', overview: 'Guddu and Bablu make an audacious pitch to Akhandanand.' },
      { season: 1, episode: 3, title: 'Wafadar', overview: 'The boys begin managing the contraband empire.' },
      { season: 1, episode: 4, title: 'Virginity', overview: 'Rivalries and romance create dangerous friction.' },
      { season: 1, episode: 5, title: 'Barat', overview: 'A gun deal test brings lethal consequences.' },
      { season: 1, episode: 6, title: 'Musafir', overview: 'Sweety, Golu and Guddu make pivotal decisions.' },
      { season: 1, episode: 7, title: 'Sher Aur Sawa Sher', overview: 'Rati Shankar Shukla schemes to conquer Mirzapur.' },
      { season: 1, episode: 8, title: 'Tandav', overview: 'Loyalties splinter as violence reaches fever pitch.' },
      { season: 1, episode: 9, title: 'Mirzapur', overview: 'A catastrophic showdown at the wedding reception in Gorakhpur.' },
    ],
    2: [
      { season: 2, episode: 1, title: 'Dhenkul', overview: 'Guddu, Golu, and Dimpy plot their vengeance in hiding.' },
      { season: 2, episode: 2, title: 'Khargosh', overview: 'Munna consolidates political control with CM Surya Pratap Yadav.' },
      { season: 2, episode: 3, title: 'Viklaang Quota', overview: 'Sharad Shukla begins his calculated ascent.' },
      { season: 2, episode: 4, title: 'Bhaymukt', overview: 'New alliances are forged across Bihar and Purvanchal.' },
      { season: 2, episode: 5, title: 'Langda', overview: 'Dadda Tyagi and his twin sons enter the fray.' },
      { season: 2, episode: 6, title: 'Ankush', overview: 'A police operation threatens the Tripathi fortress.' },
      { season: 2, episode: 7, title: 'Ood Bilaw', overview: 'Madhuri Yadav asserts her political supremacy.' },
      { season: 2, episode: 8, title: 'Chauchak', overview: 'The Tyagi family feud reaches the boiling point.' },
      { season: 2, episode: 9, title: 'Butterscotch', overview: 'Pre-emptive strikes are launched on both sides.' },
      { season: 2, episode: 10, title: 'Dushyant', overview: 'A deadly ambush concludes in an explosive climax.' },
    ],
    3: [
      { season: 3, episode: 1, title: 'Gaddi', overview: 'Guddu Pandit claims the throne of Mirzapur amidst rising chaos.' },
      { season: 3, episode: 2, title: 'Bhasad', overview: 'Sharad Shukla seeks to unite regional baahubalis against Guddu.' },
      { season: 3, episode: 3, title: 'Pariksha', overview: 'Madhuri Yadav cracks down on criminal syndicates.' },
      { season: 3, episode: 4, title: 'Daldal', overview: 'Golu investigates illicit supply chains.' },
      { season: 3, episode: 5, title: 'Shatranj', overview: 'Kaleen Bhaiya awakens in hiding with a revenge plot.' },
      { season: 3, episode: 6, title: 'Hisaab', overview: 'A violent prison revolt alters all strategies.' },
      { season: 3, episode: 7, title: 'Kaal', overview: 'Blood is spilled in a high-voltage confrontation.' },
      { season: 3, episode: 8, title: 'Antim Prahar', overview: 'The explosive conclusion to the battle for Purvanchal.' },
    ],
  },
  // Gram Chikitsalay
  tt34907994: {
    1: [
      { season: 1, episode: 1, title: 'Bhatkandi PHC', overview: 'Dr. Prabhat arrives at the dilapidated rural health center.' },
      { season: 1, episode: 2, title: 'Dawa Aur Dua', overview: 'Facing superstitious beliefs and local medicine shortages.' },
      { season: 1, episode: 3, title: 'Nuskha', overview: 'The local quack challenges the young doctor to a diagnosis.' },
      { season: 1, episode: 4, title: 'Inspection Day', overview: 'A surprise government audit leads to comic chaos.' },
      { season: 1, episode: 5, title: 'Emergency Ward', overview: 'A real village emergency tests the makeshift hospital staff.' },
      { season: 1, episode: 6, title: 'Swasthya Kranti', overview: 'Villagers rally to support Dr. Prabhat in the season finale.' },
    ],
  },
  // Ali Baba Aur 40 Bhoot
  tt21896792: {
    1: Array.from({ length: 40 }, (_, i) => ({
      season: 1,
      episode: i + 1,
      title: `Episode ${i + 1} - Ali Baba Aur 40 Bhoot`,
      overview: `Ali Baba protects the five orphans of Kabul and battles the mystical forty thieves & spirits (Episode ${i + 1}).`,
    })),
    2: Array.from({ length: 40 }, (_, i) => ({
      season: 2,
      episode: i + 1,
      title: `Season 2 Episode ${i + 1}`,
      overview: `New adventures of Ali Baba in Kabul with magical mysteries and action (Episode ${i + 1}).`,
    })),
  },
  // Sunflower (ZEE5)
  tt14493392: {
    1: [
      { season: 1, episode: 1, title: 'Murder at Sunflower', overview: 'Mr. Raj Kapoor is found dead in flat 1001, setting off a wild investigation.' },
      { season: 1, episode: 2, title: 'Suspects Galore', overview: 'Inspectors Digendra and Tambe interrogate eccentric residents.' },
      { season: 1, episode: 3, title: "Sonu's Coconut Oil", overview: 'Sonu Singh behaves so abnormally that he becomes the prime suspect.' },
      { season: 1, episode: 4, title: 'The Red Bag', overview: 'A missing bag creates havoc among the neighbors.' },
      { season: 1, episode: 5, title: 'Society Politics', overview: 'The society chairman election interferes with police questioning.' },
      { season: 1, episode: 6, title: 'The Twist', overview: 'A surprising lead reveals hidden connections in the building.' },
      { season: 1, episode: 7, title: 'Cat and Mouse', overview: 'Sonu unknowingly outwits the detectives at every corner.' },
      { season: 1, episode: 8, title: 'The Climax', overview: 'The season ends on an unbelievable cliffhanger.' },
    ],
    2: [
      { season: 2, episode: 1, title: 'Sonu in Custody', overview: 'Sonu Singh faces interrogation while Rosie enters Sunflower society.' },
      { season: 2, episode: 2, title: "Rosie's Secret", overview: 'Bar dancer Rosie reveals an unexpected will from Mr. Kapoor.' },
      { season: 2, episode: 3, title: "The Maid's Testimony", overview: 'Household secrets blow the investigation wide open.' },
      { season: 2, episode: 4, title: 'The Poisonous Cocktail', overview: 'Forensic reports pinpoint the exact toxic concoction.' },
      { season: 2, episode: 5, title: 'Double Game', overview: 'Deceptions and romantic entanglements mislead the police force.' },
      { season: 2, episode: 6, title: 'Sunflower Season Finale', overview: 'The actual culprit is unveiled in an unexpected, hilarious resolution.' },
    ],
  },
};

/**
 * Fetches full metadata and episodes list for a series, TV serial, or movie
 */
export async function fetchMediaDetails(
  type: MediaType,
  imdbId: string
): Promise<{ media: MediaItem; episodes: Record<number, Episode[]> }> {
  const normType = type === 'movie' ? 'movie' : 'series';

  const mappedTmdb = IMDB_TO_TMDB_MAP[imdbId];
  const matchedEpisodes =
    CURATED_SERIES_EPISODES[imdbId] ||
    (mappedTmdb ? CURATED_SERIES_EPISODES[mappedTmdb] : null) ||
    (imdbId === '101352' ? CURATED_SERIES_EPISODES['tt11912196'] : null) ||
    (imdbId === '84105' ? CURATED_SERIES_EPISODES['tt6473300'] : null) ||
    (imdbId === '290138' ? CURATED_SERIES_EPISODES['tt34907994'] : null) ||
    (imdbId === '208744' ? CURATED_SERIES_EPISODES['tt21896792'] : null) ||
    (imdbId === '124151' ? CURATED_SERIES_EPISODES['tt14493392'] : null);

  const allLocalItems = [
    ...HERO_FEATURED_ITEMS,
    ...NEW_2026_RELEASES,
    ...TV_SERIALS_COLLECTION,
    ...ALL_TIME_CLASSICS,
    ...TRENDING_SERIES,
    ...TRENDING_MOVIES,
    ...BOLLYWOOD_SPECIALS,
    ...ANIME_COLLECTION,
  ];

  const localMatch = allLocalItems.find(
    (m) => m.id === imdbId || m.imdbId === imdbId || m.tmdbId === imdbId
  );

  if (matchedEpisodes) {
    const media: MediaItem = localMatch || {
      id: imdbId,
      imdbId,
      title: imdbId === 'tt21896792' || imdbId === '208744' ? 'Ali Baba Aur 40 Bhoot' : 'Series',
      type: 'tv',
      poster: '',
      year: '2024',
      rating: '8.5',
    };

    return { media, episodes: matchedEpisodes };
  }

  // If this is a known Indian TV Serial from TV_SERIALS_COLLECTION, provide rich 50-episode packs per season
  if (localMatch && isLikelyTvSerial(localMatch)) {
    const episodesMap: Record<number, Episode[]> = {};
    const seasons = Math.min(localMatch.totalSeasons || 4, 6);
    for (let s = 1; s <= seasons; s++) {
      episodesMap[s] = [];
      for (let e = 1; e <= 50; e++) {
        episodesMap[s].push({
          season: s,
          episode: e,
          title: `${localMatch.title} - Episode ${e}`,
          overview: `Full HD broadcast episode ${e} of ${localMatch.title}.`,
        });
      }
    }
    return {
      media: { ...localMatch, isSerial: true },
      episodes: episodesMap,
    };
  }

  try {
    const res = await fetch(`${CINEMETA_BASE}/meta/${normType}/${imdbId}.json`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = (await res.json()) as CinemetaMetaResponse;
    const meta = data.meta;

    if (!meta) throw new Error('No metadata found');

    const episodesMap: Record<number, Episode[]> = {};

    if (meta.videos && meta.videos.length > 0) {
      for (const v of meta.videos) {
        if (typeof v.season !== 'number' || typeof v.episode !== 'number') continue;
        if (v.season === 0) continue;
        if (!episodesMap[v.season]) {
          episodesMap[v.season] = [];
        }
        episodesMap[v.season].push({
          season: v.season,
          episode: v.episode,
          title: v.title || `Episode ${v.episode}`,
          overview: v.overview,
          thumbnail: v.thumbnail,
          released: v.released,
        });
      }

      Object.keys(episodesMap).forEach((seasonStr) => {
        const s = Number(seasonStr);
        episodesMap[s].sort((a, b) => a.episode - b.episode);
      });
    }

    const seasonsCount = Object.keys(episodesMap).length;
    const displayName =
      meta.name === 'Ali Baba: Dastaan-E-Kabul' ? 'Ali Baba Aur 40 Bhoot' : meta.name;

    const media: MediaItem = {
      id: meta.id,
      imdbId: meta.id,
      title: displayName,
      type: meta.type === 'movie' ? 'movie' : 'tv',
      poster: meta.poster || '',
      backdrop: meta.background || meta.poster || '',
      year: meta.releaseInfo,
      rating: meta.imdbRating,
      overview: meta.description,
      genres: meta.genres || [],
      duration: meta.runtime,
      totalSeasons: seasonsCount || (normType === 'series' ? 1 : undefined),
    };

    if (isLikelyTvSerial(media)) {
      media.isSerial = true;
      media.category = 'serials';
    }

    // If Cinemeta returned no episodes for a TV show/serial, populate 30 episodes so user can switch episodes freely
    if (media.type === 'tv' && Object.keys(episodesMap).length === 0) {
      for (let s = 1; s <= (media.totalSeasons || 2); s++) {
        episodesMap[s] = Array.from({ length: 30 }, (_, idx) => ({
          season: s,
          episode: idx + 1,
          title: `Episode ${idx + 1}`,
        }));
      }
    }

    return { media, episodes: episodesMap };
  } catch (err) {
    const numericTmdbId = /^\d+$/.test(imdbId) ? imdbId : IMDB_TO_TMDB_MAP[imdbId];
    if (numericTmdbId) {
      try {
        const tmdbEndpoint = normType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(
          `https://api.themoviedb.org/3/${tmdbEndpoint}/${numericTmdbId}?api_key=${TMDB_KEY}&language=en-US`
        );
        if (tmdbRes.ok) {
          const tData = await tmdbRes.json();
          const isTv = normType !== 'movie';
          const releaseDate = isTv ? tData.first_air_date : tData.release_date;
          const year = releaseDate ? String(releaseDate).slice(0, 4) : '';
          let title = isTv ? tData.name : tData.title;
          if (String(tData.id) === '208744' || (title && title.toLowerCase().includes('dastaan-e-kabul'))) {
            title = 'Ali Baba Aur 40 Bhoot';
          }
          const seasonsCount = isTv ? Math.min(tData.number_of_seasons || 1, 10) : undefined;

          const media: MediaItem = {
            id: String(tData.id),
            tmdbId: String(tData.id),
            imdbId: tData.imdb_id || (imdbId.startsWith('tt') ? imdbId : undefined),
            title: title || `Title (${imdbId})`,
            type: isTv ? 'tv' : 'movie',
            poster: tData.poster_path
              ? `https://image.tmdb.org/t/p/w500${tData.poster_path}`
              : '',
            backdrop: tData.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280${tData.backdrop_path}`
              : undefined,
            year,
            rating: tData.vote_average ? String(tData.vote_average.toFixed(1)) : '8.0',
            overview: tData.overview || '',
            genres: tData.genres?.map((g: { name: string }) => g.name) || [],
            totalSeasons: seasonsCount,
          };

          if (isLikelyTvSerial(media)) {
            media.isSerial = true;
            media.category = 'serials';
          }

          const episodesMap: Record<number, Episode[]> = {};
          if (isTv && seasonsCount) {
            for (let s = 1; s <= seasonsCount; s++) {
              episodesMap[s] = [];
              const rawEpCount =
                tData.seasons?.find((sn: { season_number: number }) => sn.season_number === s)
                  ?.episode_count || 20;
              const epCount = Math.min(Math.max(rawEpCount, 10), 60);
              for (let e = 1; e <= epCount; e++) {
                episodesMap[s].push({
                  season: s,
                  episode: e,
                  title: `Episode ${e}`,
                });
              }
            }
          }

          return { media, episodes: episodesMap };
        }
      } catch (tmdbErr) {
        console.warn('TMDB direct details fetch error:', tmdbErr);
      }
    }

    const media: MediaItem = localMatch || {
      id: imdbId,
      imdbId,
      title: `Title (${imdbId})`,
      type: normType === 'movie' ? 'movie' : 'tv',
      poster: '',
      year: '',
      rating: '',
    };

    const episodesMap: Record<number, Episode[]> = {};
    if (media.type === 'tv' || normType === 'series') {
      const seasons = Math.min(media.totalSeasons || 3, 5);
      for (let s = 1; s <= seasons; s++) {
        episodesMap[s] = [];
        for (let e = 1; e <= 25; e++) {
          episodesMap[s].push({
            season: s,
            episode: e,
            title: `Episode ${e}`,
          });
        }
      }
    }

    return { media, episodes: episodesMap };
  }
}
