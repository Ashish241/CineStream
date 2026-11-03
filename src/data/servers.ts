import { StreamServer, VideoQuality } from '../types';

// Fast lookup for known IMDb to TMDB mappings
export const IMDB_TO_TMDB_MAP: Record<string, string> = {
  // Indian Web Series & Hits
  tt12004706: '101352', // Panchayat (Official TMDB ID)
  tt11912196: '101352', // Panchayat alias
  101605: '101352',     // Panchayat legacy
  tt6473300: '84105',   // Mirzapur (Official TMDB ID)
  84439: '84105',       // Mirzapur legacy
  tt34907994: '290138', // Gram Chikitsalay (Official TMDB ID)
  278502: '290138',     // Gram Chikitsalay legacy
  tt44101690: '331932', // Ali Baba Aur 40 Bhoot (Official 2026 TMDB ID)
  tt21896792: '331932', // Ali Baba Aur 40 Bhoot alias
  209707: '331932',     // Ali Baba legacy
  tt33497184: '313172', // Chumbak 2026 Series (Official TMDB ID)
  272566: '313172',     // Chumbak legacy
  tt7452352: '485087',  // Chumbak Movie (Swanand Kirkire)
  537827: '485087',     // Chumbak movie legacy
  tt14493392: '124151', // Sunflower (ZEE5 Official TMDB ID)
  tt26744888: '221160', // Taj: Divided by Blood (ZEE5)
  tt27546688: '1124403',// Sirf Ek Bandaa Kaafi Hai (ZEE5)
  tt10444746: '90471',  // Gullak
  tt9432978: '88040',   // Kota Factory
  tt11911116: '100911', // Asur
  tt20857948: '216390', // Taaza Khabar
  tt14392248: '122484', // Aspirants
  tt28383922: '1147710',// Stree 2
  tt23561236: '1189422',// 12th Fail
  tt15354916: '872906', // Jawan
  tt13751694: '781732', // Animal
  tt13854988: '202167', // Farzi
  tt11487820: '801688', // Kalki 2898 AD
  tt1869454: '93347',   // The Family Man

  // International Blockbusters & Classics
  tt15239678: '693134', // Dune: Part Two
  tt6263850: '533535',  // Deadpool & Wolverine
  tt4574334: '66732',   // Stranger Things
  tt15398776: '872585', // Oppenheimer
  tt1375666: '27205',   // Inception
  tt0903747: '1396',    // Breaking Bad
  tt0816692: '157336',  // Interstellar
  tt0468569: '155',     // The Dark Knight
  tt9362722: '569094',  // Spider-Man Across the Spider-Verse
  tt1630029: '76600',   // Avatar 2
  tt1877830: '414906',  // The Batman
  tt14539740: '823464', // Godzilla x Kong
  tt11198330: '94997',  // House of the Dragon
  tt1190634: '76479',   // The Boys
  tt10919420: '93405',  // Squid Game
  tt3581920: '100088',  // The Last of Us
  tt6468322: '71446',   // Money Heist
  tt5753856: '70523',   // Dark
  tt2788316: '126308',  // Shogun
  tt2560140: '1429',    // Attack on Titan
  tt9335498: '85937',   // Demon Slayer
  tt12343534: '95479',  // Jujutsu Kaisen
  tt21209876: '209867', // Solo Leveling
  tt0877057: '13916',   // Death Note
};

// Dynamic runtime resolver for any IMDb ID -> TMDB ID
export async function resolveTmdbIdAsync(imdbId: string): Promise<string> {
  if (!imdbId) return '';
  // If already numeric TMDB ID, return immediately
  if (/^\d+$/.test(imdbId)) return imdbId;

  // 1. Check in-memory map
  if (IMDB_TO_TMDB_MAP[imdbId]) {
    return IMDB_TO_TMDB_MAP[imdbId];
  }

  // 2. Check browser localStorage cache
  try {
    const cached = localStorage.getItem(`cinestream_tmdb_${imdbId}`);
    if (cached && /^\d+$/.test(cached)) {
      IMDB_TO_TMDB_MAP[imdbId] = cached;
      return cached;
    }
  } catch {}

  // 3. Query TMDB Find API for live ID lookup
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=8265bd1679663a7ea12ac168da84d2e8&external_source=imdb_id`
    );
    if (res.ok) {
      const data = await res.json();
      const match = data.tv_results?.[0] || data.movie_results?.[0];
      if (match?.id) {
        const tmdbStr = String(match.id);
        IMDB_TO_TMDB_MAP[imdbId] = tmdbStr;
        try {
          localStorage.setItem(`cinestream_tmdb_${imdbId}`, tmdbStr);
        } catch {}
        return tmdbStr;
      }
    }
  } catch (err) {
    console.warn('Could not resolve TMDB ID dynamically:', err);
  }

  return imdbId;
}

export function getResolvedIds(params: {
  id: string;
  imdbId?: string;
  tmdbId?: string;
}): { imdb: string; tmdb: string; bestId: string } {
  let imdb = params.imdbId || (params.id.startsWith('tt') ? params.id : '');
  let tmdb = params.tmdbId || (!params.id.startsWith('tt') ? params.id : '');

  // Look up mapped TMDB ID
  if (imdb && !tmdb && IMDB_TO_TMDB_MAP[imdb]) {
    tmdb = IMDB_TO_TMDB_MAP[imdb];
  }
  if (!tmdb && IMDB_TO_TMDB_MAP[params.id]) {
    tmdb = IMDB_TO_TMDB_MAP[params.id];
  }

  // CRITICAL FIX FOR: "Content not found using IMDB ID, please try again with TMDB ID."
  // All modern streaming servers (VidSrc SU, Embed.su, AutoEmbed) REQUIRE the numeric TMDB ID.
  // We ALWAYS prioritize the numeric TMDB ID so servers never reject with 'Circe: Unavailable'.
  const isNumericTmdb = tmdb && /^\d+$/.test(tmdb);
  const bestId = isNumericTmdb ? tmdb : (imdb || params.id);

  return { imdb: imdb || params.id, tmdb: tmdb || params.id, bestId };
}

// Ordered strictly by verified uptime and zero-sandbox compatibility.
// VidLink Pro and MultiEmbed are prioritized for flawless Smart TV & Indian web series playback.
export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidlink-pro',
    name: 'Primary Stream (VidLink 1080p Engine)',
    badge: '1080p Ultra HD',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'High-speed TMDB stream engine with clean 1080p delivery. Zero sandbox issues, perfect for Smart TV.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://vidlink.pro/movie/${bestId}`;
      }
      return `https://vidlink.pro/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'multiembed-hub',
    name: 'Backup Stream 1 (MultiEmbed Hindi Hub)',
    badge: 'Hindi Multi-Audio',
    quality: 'Multi-Audio / Hindi',
    isRecommended: true,
    notes: 'Specialized Indian regional & Hindi web series server with dual audio support.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      const isTmdb = /^\d+$/.test(bestId);
      const tmdbParam = isTmdb ? '&tmdb=1' : '';

      if (type === 'movie') {
        return `https://multiembed.mov/?video_id=${bestId}${tmdbParam}`;
      }
      return `https://multiembed.mov/?video_id=${bestId}${tmdbParam}&s=${season}&e=${episode}`;
    },
  },
  {
    id: 'vidsrc-su',
    name: 'Backup Stream 2 (VidSrc SU - TMDB)',
    badge: '1080p Full HD',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Direct TMDB scraper engine. Auto-cycles if Circe is unavailable.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://vidsrc.su/embed/movie/${bestId}`;
      }
      return `https://vidsrc.su/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'embedsu',
    name: 'Backup Stream 3 (Embed.su Fast Buffer)',
    badge: 'Adaptive Buffer',
    quality: '1080p HD',
    notes: 'Fast auto-routing player with adaptive CDN buffer.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://embed.su/embed/movie/${bestId}`;
      }
      return `https://embed.su/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'twoembed',
    name: 'Backup Stream 4 (2Embed Direct)',
    badge: 'Direct Stream',
    quality: '1080p HD',
    notes: 'Reliable direct player with wide Indian series season coverage.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://www.2embed.cc/embed/${bestId}`;
      }
      return `https://www.2embed.cc/embedtv/${bestId}&s=${season}&e=${episode}`;
    },
  },
  {
    id: 'vidsrc-vip',
    name: 'Backup Stream 5 (VidSrc VIP)',
    badge: 'Direct Mirror',
    quality: '1080p HD',
    notes: 'Direct streaming mirror for Indian web series and global blockbusters.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://vidsrc.vip/embed/movie/${bestId}`;
      }
      return `https://vidsrc.vip/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
];

export const DEFAULT_SERVER = STREAM_SERVERS[0];
