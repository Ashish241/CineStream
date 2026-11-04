import { MediaItem, StreamServer } from '../types';

const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';

// Verified IMDb & Legacy ID -> Official TMDB ID mappings
export const IMDB_TO_TMDB_MAP: Record<string, string> = {
  // Latest Blockbusters & Indian Movies
  tt16539454: '857598',  // Pushpa 2: The Rule
  tt28383922: '1112426', // Stree 2 (Official TMDB ID)
  1147710: '1112426',    // Stree 2 legacy fix
  tt11487820: '801688',  // Kalki 2898 AD
  tt26655108: '980599',  // Bhool Bhulaiyaa 3 (Official TMDB ID)
  1097549: '980599',     // Bhool Bhulaiyaa 3 legacy fix
  1141320: '980599',     // Bhool Bhulaiyaa 3 legacy fix
  tt27015642: '1014214', // Singham Again (Official TMDB ID)
  1156593: '1014214',    // Singham Again legacy fix
  tt23561236: '1163258', // 12th Fail (Official TMDB ID)
  1189422: '1163258',    // 12th Fail legacy fix
  1056360: '1163258',    // 12th Fail legacy fix
  tt15354916: '872906',  // Jawan
  tt13751694: '781732',  // Animal
  tt27546688: '1123960', // Sirf Ek Bandaa Kaafi Hai (Official TMDB ID)
  1124403: '1123960',    // Sirf Ek Bandaa legacy fix
  tt7452352: '485087',   // Chumbak
  313172: '485087',      // Chumbak legacy

  // Indian Web Series & OTT Originals
  tt12004706: '101352',  // Panchayat
  tt11912196: '101352',  // Panchayat alias
  101605: '101352',      // Panchayat legacy
  tt6473300: '84105',    // Mirzapur
  84439: '84105',        // Mirzapur legacy
  tt34907994: '290138',  // Gram Chikitsalay
  278502: '290138',      // Gram Chikitsalay legacy
  tt10444746: '90966',   // Gullak (Official TMDB ID)
  90471: '90966',        // Gullak legacy fix
  tt9544034: '93352',    // The Family Man (Official TMDB ID)
  tt1869454: '93352',    // The Family Man alias
  93347: '93352',        // The Family Man legacy fix
  tt13854988: '132117',  // Farzi (Official TMDB ID)
  202167: '132117',      // Farzi legacy fix
  tt11911116: '100911',  // Asur
  tt12392504: '111188',  // Scam 1992: The Harshad Mehta Story (Official TMDB ID)
  110356: '111188',      // Scam 1992 legacy fix
  tt20857948: '203832',  // Taaza Khabar (Official TMDB ID)
  216390: '203832',      // Taaza Khabar legacy fix
  tt14493392: '127332',  // Sunflower (Official TMDB ID)
  124151: '127332',      // Sunflower legacy fix
  tt9432978: '89113',    // Kota Factory (Official TMDB ID)
  88040: '89113',        // Kota Factory legacy fix
  tt14392248: '124411',  // Aspirants (Official TMDB ID)
  122484: '124411',      // Aspirants legacy fix
  tt10230406: '103051',  // Paatal Lok (Official TMDB ID)
  103411: '103051',      // Paatal Lok legacy fix
  tt8108198: '79352',    // Sacred Games
  tt11801534: '100557',  // Special OPS
  tt26744888: '221160',  // Taj: Divided by Blood

  // Indian Television Shows & Serials
  tt44101690: '208744',  // Ali Baba Aur 40 Bhoot
  tt21896792: '208744',  // Ali Baba Aur 40 Bhoot
  331932: '208744',      // Ali Baba Aur 40 Bhoot
  tt1301993: '42009',    // Taarak Mehta Ka Ooltah Chashmah
  tt0401916: '14955',    // C.I.D.
  tt12679726: '106154',  // Anupamaa
  tt1379227: '31467',    // Yeh Rishta Kya Kehlata Hai
  tt4519822: '65933',    // Bhabiji Ghar Par Hain!
  tt8879516: '81929',    // Aladdin - Naam Toh Suna Hoga
  tt2479262: '64257',    // Baalveer
  tt13975556: '118345',  // Wagle Ki Duniya
  tt7161162: '73230',    // Tenali Rama
  tt2187015: '42839',    // Crime Patrol
  tt0158417: '31914',    // Mahabharat (1988)
  tt3123166: '61075',    // Mahabharat (2013)
  tt0268093: '31910',    // Ramayan
  tt2178377: '43475',    // Devon Ke Dev... Mahadev
  tt0283795: '16278',    // Shaktimaan
  tt0432049: '30816',    // Sarabhai vs Sarabhai
  tt0412751: '31031',    // Khichdi
  tt5662978: '66294',    // The Kapil Sharma Show
  tt31185959: '247620',  // The Great Indian Kapil Show
  tt20602926: '203771',  // Pushpa Impossible

  // International Blockbusters & Classics
  tt15239678: '693134',  // Dune: Part Two
  tt6263850: '533535',   // Deadpool & Wolverine
  tt4574334: '66732',    // Stranger Things
  tt15398776: '872585',  // Oppenheimer
  tt1375666: '27205',    // Inception
  tt0903747: '1396',     // Breaking Bad
  tt0816692: '157336',   // Interstellar
  tt0468569: '155',      // The Dark Knight
  tt9362722: '569094',   // Spider-Man Across the Spider-Verse
  tt1630029: '76600',    // Avatar 2
  tt1877830: '414906',   // The Batman
  tt14539740: '823464',  // Godzilla x Kong
  tt11198330: '94997',   // House of the Dragon
  tt1190634: '76479',    // The Boys
  tt10919420: '93405',   // Squid Game
  tt3581920: '100088',   // The Last of Us
  tt6468322: '71446',    // Money Heist
  tt5753856: '70523',    // Dark
  tt2788316: '126308',   // Shogun
  tt2560140: '1429',     // Attack on Titan
  tt9335498: '85937',    // Demon Slayer
  tt12343534: '95479',   // Jujutsu Kaisen
  tt21209876: '209867',  // Solo Leveling
  tt0877057: '13916',    // Death Note
};

// Dynamic runtime resolver for any IMDb ID or Title -> Verified TMDB ID
export async function resolveTmdbIdAsync(
  imdbId: string,
  title?: string,
  type?: string
): Promise<string> {
  if (!imdbId && !title) return '';
  if (imdbId && IMDB_TO_TMDB_MAP[imdbId]) {
    return IMDB_TO_TMDB_MAP[imdbId];
  }
  if (imdbId && /^\d+$/.test(imdbId)) return imdbId;

  const cacheKey = `cinestream_tmdb_v3_${imdbId || title}`;
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
      const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(
          cleanTitle
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
  if (tmdb && IMDB_TO_TMDB_MAP[tmdb]) {
    tmdb = IMDB_TO_TMDB_MAP[tmdb];
  }
  if (IMDB_TO_TMDB_MAP[params.id]) {
    tmdb = IMDB_TO_TMDB_MAP[params.id];
  }

  const isNumericTmdb = tmdb && /^\d+$/.test(tmdb);
  const bestId = isNumericTmdb ? tmdb : imdb || params.id;

  return { imdb: imdb || params.id, tmdb: tmdb || params.id, bestId };
}

/**
 * Verified Working Stream Servers (Tested with 200 OK across Indian & International Movies/Series)
 * Primary Server is VidSrc Buzz HLS Engine (which walks up to 24 internal servers automatically and
 * natively hosts Pushpa 2, Stree 2, Kalki 2898 AD, Bhool Bhulaiyaa 3, 12th Fail, Panchayat, Mirzapur, etc.)
 */
export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidsrc-buzz',
    name: 'Auto-Stream Primary (VidSrc Multi-HLS 1080p)',
    badge: 'Auto 1080p HD (Primary)',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Verified primary HLS engine with 24 internal auto-failover servers for Indian & Global Movies/Series.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://vidsrc.buzz/embed/movie/${bestId}`;
      }
      return `https://vidsrc.buzz/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'twoembed-cc',
    name: 'Auto-Stream Backup 1 (2Embed Global HD)',
    badge: 'Backup 1 (2Embed HD)',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'High-availability direct stream mirror for Bollywood, South Dubbed & Web Series.',
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
    id: 'vidsrc-pm',
    name: 'Auto-Stream Backup 2 (VidFlix 1080p Cloud)',
    badge: 'Backup 2 (VidFlix HD)',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Fast cloud stream server for Movies, OTT Originals, and Anime.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (type === 'movie') {
        return `https://vidsrc.pm/embed/movie/${bestId}`;
      }
      return `https://vidsrc.pm/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'vidsrc-me',
    name: 'Auto-Stream Backup 3 (VidSrc ME Global)',
    badge: 'Backup 3 (VidSrc ME)',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Direct TMDB/IMDb mirror with wide international and Indian catalog.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      const isTmdb = /^\d+$/.test(bestId);
      const idKey = isTmdb ? 'tmdb' : 'imdb';
      if (type === 'movie') {
        return `https://vidsrc.me/embed/movie?${idKey}=${bestId}`;
      }
      return `https://vidsrc.me/embed/tv?${idKey}=${bestId}&season=${season}&episode=${episode}`;
    },
  },
  {
    id: 'autoembed-co',
    name: 'Auto-Stream Backup 4 (AutoEmbed Multi-Server)',
    badge: 'Backup 4 (AutoEmbed)',
    quality: '1080p HD',
    notes: 'Multi-server player for Movies and Web Series.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      const isTmdb = /^\d+$/.test(bestId);
      const kind = isTmdb ? 'tmdb' : 'imdb';
      if (type === 'movie') {
        return `https://autoembed.co/movie/${kind}/${bestId}`;
      }
      return `https://autoembed.co/tv/${kind}/${bestId}-${season}-${episode}`;
    },
  },
  {
    id: 'vidsrc-su',
    name: 'Auto-Stream Backup 5 (VidSrc SU Cloud)',
    badge: 'Backup 5 (VidSrc SU)',
    quality: '1080p HD',
    notes: 'Cloud scraper engine for Hollywood, Anime & Series.',
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
    id: 'vidlink-pro',
    name: 'Auto-Stream Backup 6 (VidLink Western/Anime)',
    badge: 'Backup 6 (VidLink)',
    quality: '1080p HD',
    notes: 'Secondary fallback for Hollywood & Anime.',
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
];

export const DEFAULT_SERVER = STREAM_SERVERS[0];

export function getPreferredServerIndexForMedia(media: MediaItem): number {
  try {
    const saved = localStorage.getItem(`cinestream_srv_v3_${media.id}`);
    if (saved !== null) {
      const idx = Number(saved);
      if (!Number.isNaN(idx) && idx >= 0 && idx < STREAM_SERVERS.length) {
        return idx;
      }
    }
  } catch {}
  return 0;
}
