import { MediaItem, StreamServer } from '../types';

const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';

// Fast lookup for known IMDb to TMDB mappings (Movies, Web Series, Anime & TV Shows)
export const IMDB_TO_TMDB_MAP: Record<string, string> = {
  // Indian Web Series & Hits
  tt12004706: '101352', // Panchayat (Official TMDB ID)
  tt11912196: '101352', // Panchayat alias
  101605: '101352',     // Panchayat legacy
  tt6473300: '84105',   // Mirzapur (Official TMDB ID)
  84439: '84105',       // Mirzapur legacy
  tt34907994: '290138', // Gram Chikitsalay (Official TMDB ID)
  278502: '290138',     // Gram Chikitsalay legacy
  tt44101690: '208744', // Ali Baba Aur 40 Bhoot (Official TMDB ID)
  tt21896792: '208744', // Ali Baba Aur 40 Bhoot IMDb
  331932: '208744',     // Ali Baba Aur 40 Bhoot mapped
  209707: '208744',     // Ali Baba legacy
  tt33497184: '485087', // Chumbak (Official TMDB ID)
  313172: '485087',     // Chumbak mapped
  272566: '485087',     // Chumbak legacy
  tt7452352: '485087',  // Chumbak (Swanand Kirkire)
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
  tt9544034: '93347',   // The Family Man IMDb
  tt12392504: '110356', // Scam 1992: The Harshad Mehta Story
  tt8108198: '79352',   // Sacred Games
  tt10230406: '103411', // Paatal Lok
  tt11801534: '100557', // Special OPS

  // Indian Television Shows & Serials
  tt1301993: '42009',   // Taarak Mehta Ka Ooltah Chashmah
  tt0401916: '14955',   // C.I.D.
  tt12679726: '106154', // Anupamaa
  tt1379227: '31467',   // Yeh Rishta Kya Kehlata Hai
  tt4519822: '65933',   // Bhabiji Ghar Par Hain!
  tt8879516: '81929',   // Aladdin - Naam Toh Suna Hoga
  tt2479262: '64257',   // Baalveer
  tt13975556: '118345', // Wagle Ki Duniya
  tt7161162: '73230',   // Tenali Rama
  tt2187015: '42839',   // Crime Patrol
  tt0158417: '31914',   // Mahabharat (1988)
  tt3123166: '61075',   // Mahabharat (2013 Star Plus)
  tt0268093: '31910',   // Ramayan
  tt2178377: '43475',   // Devon Ke Dev... Mahadev
  tt0283795: '16278',   // Shaktimaan
  tt0432049: '30816',   // Sarabhai vs Sarabhai
  tt0412751: '31031',   // Khichdi
  tt5662978: '66294',   // The Kapil Sharma Show
  tt31185959: '247620', // The Great Indian Kapil Show
  tt20602926: '203771', // Pushpa Impossible

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
export async function resolveTmdbIdAsync(imdbId: string, title?: string, type?: string): Promise<string> {
  if (!imdbId && !title) return '';
  if (imdbId && IMDB_TO_TMDB_MAP[imdbId]) {
    return IMDB_TO_TMDB_MAP[imdbId];
  }
  if (imdbId && /^\d+$/.test(imdbId)) return imdbId;

  const cacheKey = `cinestream_tmdb_${imdbId || title}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached && /^\d+$/.test(cached)) {
      if (imdbId) IMDB_TO_TMDB_MAP[imdbId] = cached;
      return cached;
    }
  } catch {}

  try {
    if (imdbId && imdbId.startsWith('tt')) {
      const res = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`
      );
      if (res.ok) {
        const data = await res.json();
        const match = data.tv_results?.[0] || data.movie_results?.[0];
        if (match?.id) {
          const tmdbStr = String(match.id);
          IMDB_TO_TMDB_MAP[imdbId] = tmdbStr;
          try {
            localStorage.setItem(cacheKey, tmdbStr);
          } catch {}
          return tmdbStr;
        }
      }
    }

    if (title) {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(
          title
        )}`
      );
      if (searchRes.ok) {
        const sData = await searchRes.json();
        const first = sData.results?.[0];
        if (first?.id) {
          const tmdbStr = String(first.id);
          if (imdbId) IMDB_TO_TMDB_MAP[imdbId] = tmdbStr;
          try {
            localStorage.setItem(cacheKey, tmdbStr);
          } catch {}
          return tmdbStr;
        }
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

  if (imdb && IMDB_TO_TMDB_MAP[imdb]) {
    tmdb = IMDB_TO_TMDB_MAP[imdb];
  }
  if (IMDB_TO_TMDB_MAP[params.id]) {
    tmdb = IMDB_TO_TMDB_MAP[params.id];
  }

  const isNumericTmdb = tmdb && /^\d+$/.test(tmdb);
  const bestId = isNumericTmdb ? tmdb : imdb || params.id;

  return { imdb: imdb || params.id, tmdb: tmdb || params.id, bestId };
}

/**
 * Multi-CDN Auto-Aggregating Stream Servers
 * Ordered by highest automatic resolution rate across Movies, Web Series, Anime & Shows
 */
export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidlink-pro',
    name: 'Auto-Stream Primary (1080p Ultra HD)',
    badge: 'Auto 1080p CDN',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Primary multi-CDN auto-selecting engine with 1080p playback.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://vidlink.pro/movie/485087?autoplay=true&primaryColor=f59e0b`;
      }
      if (type === 'movie') {
        return `https://vidlink.pro/movie/${bestId}?autoplay=true&primaryColor=f59e0b`;
      }
      return `https://vidlink.pro/tv/${bestId}/${season}/${episode}?autoplay=true&primaryColor=f59e0b`;
    },
  },
  {
    id: 'autoembed-in',
    name: 'Auto-Stream Backup 1 (India & Global Multi-CDN)',
    badge: 'Hindi & Multi-Audio',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Automatic multi-server aggregator for Indian & International OTT content.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://player.autoembed.cc/embed/movie/485087`;
      }
      if (type === 'movie') {
        return `https://player.autoembed.cc/embed/movie/${bestId}`;
      }
      return `https://player.autoembed.cc/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'multiembed-hub',
    name: 'Auto-Stream Backup 2 (MultiEmbed Hindi Hub)',
    badge: 'Multi-Audio',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'High-availability mirror for Bollywood, Web Series & South Dubbed hits.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://multiembed.mov/?video_id=485087&tmdb=1`;
      }
      const isTmdb = /^\d+$/.test(bestId);
      const tmdbParam = isTmdb ? '&tmdb=1' : '';

      if (type === 'movie') {
        return `https://multiembed.mov/?video_id=${bestId}${tmdbParam}`;
      }
      return `https://multiembed.mov/?video_id=${bestId}${tmdbParam}&s=${season}&e=${episode}`;
    },
  },
  {
    id: 'vidsrc-vip',
    name: 'Auto-Stream Backup 3 (VidSrc VIP Direct)',
    badge: 'Direct 1080p',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Fast direct mirror for OTT Originals, Movies, and Anime.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://vidsrc.vip/embed/movie/485087`;
      }
      if (type === 'movie') {
        return `https://vidsrc.vip/embed/movie/${bestId}`;
      }
      return `https://vidsrc.vip/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'embedsu',
    name: 'Auto-Stream Backup 4 (Embed.su Cloud)',
    badge: 'Adaptive Cloud',
    quality: '1080p HD',
    notes: 'Fast auto-routing player with adaptive CDN buffer.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://embed.su/embed/movie/485087`;
      }
      if (type === 'movie') {
        return `https://embed.su/embed/movie/${bestId}`;
      }
      return `https://embed.su/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'twoembed',
    name: 'Auto-Stream Backup 5 (2Embed Global)',
    badge: 'Global Mirror',
    quality: '1080p HD',
    notes: 'Global fallback player for classic and regional content.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://www.2embed.cc/embed/485087`;
      }
      if (type === 'movie') {
        return `https://www.2embed.cc/embed/${bestId}`;
      }
      return `https://www.2embed.cc/embedtv/${bestId}&s=${season}&e=${episode}`;
    },
  },
];

export const DEFAULT_SERVER = STREAM_SERVERS[0];

export function getPreferredServerIndexForMedia(media: MediaItem): number {
  try {
    const saved = localStorage.getItem(`cinestream_srv_${media.id}`);
    if (saved !== null) {
      const idx = Number(saved);
      if (!Number.isNaN(idx) && idx >= 0 && idx < STREAM_SERVERS.length) {
        return idx;
      }
    }
  } catch {}
  return 0;
}
