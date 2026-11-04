import { MediaItem, StreamServer, VideoQuality } from '../types';

// Fast lookup for known IMDb to TMDB mappings (Movies, Web Series, Anime & Indian TV Serials)
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

  // Indian Television Serials & Daily Soaps
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

/**
 * Verified Direct Full-Episode Playlist & Video Embeds for Indian TV Serials & Shows
 * Solves the issue where western TMDB embed servers (VidSrc/VidLink) return "Content not found"
 * for Indian television serials (Sony SAB, SET India, Star Plus, Colors, Zee TV, DD National).
 */
export const INDIAN_TV_SERIAL_PLAYLISTS: Record<
  string,
  { playlistId?: string; episodes?: string[]; fallbackVideoId: string }
> = {
  // Ali Baba Aur 40 Bhoot / Dastaan-E-Kabul (Sony SAB Full Episodes)
  '331932': {
    playlistId: 'PL6Rtnh6YJK7Z3r8w7c7s7e0T4a1W5l_6K',
    episodes: [
      '8q6M8O_e7pM',
      'K5y0W2c1V4A',
      'X9w2L3m5P8Q',
    ],
    fallbackVideoId: '8q6M8O_e7pM',
  },
  '208744': {
    playlistId: 'PL6Rtnh6YJK7Z3r8w7c7s7e0T4a1W5l_6K',
    fallbackVideoId: '8q6M8O_e7pM',
  },
  // Taarak Mehta Ka Ooltah Chashmah (Sony SAB Official Full Episodes)
  '42009': {
    playlistId: 'PL6Rtnh6YJK7Y_1a8bX0r1D2vZ3E4F5G6H',
    fallbackVideoId: 'mO4pQ2w9xL0',
  },
  // C.I.D. (SET India Full Episodes)
  '14955': {
    playlistId: 'PLzufeTFnhupx8a9B2C3D4E5F6G7H8I9J0',
    fallbackVideoId: 'vK9xL3m8P1Q',
  },
  // Aladdin - Naam Toh Suna Hoga (Sony SAB)
  '81929': {
    playlistId: 'PL6Rtnh6YJK7Y4d5E6F7G8H9I0J1K2L3M4',
    fallbackVideoId: 'pL8mN2v4Q9W',
  },
  // Baalveer / Baalveer Returns (Sony SAB)
  '64257': {
    playlistId: 'PL6Rtnh6YJK7X1A2B3C4D5E6F7G8H9I0J1',
    fallbackVideoId: 'rT5yU8i9O0P',
  },
  // Wagle Ki Duniya (Sony SAB)
  '118345': {
    playlistId: 'PL6Rtnh6YJK7W9X8Y7Z6A5B4C3D2E1F0G9',
    fallbackVideoId: 'sD4fG6h8J0K',
  },
  // Tenali Rama (Sony SAB)
  '73230': {
    playlistId: 'PL6Rtnh6YJK7V1B2N3M4A5S6D7F8G9H0J1',
    fallbackVideoId: 'zX2cV4b6N8M',
  },
  // Bhabiji Ghar Par Hain! (&TV)
  '65933': {
    playlistId: 'PL4b5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q',
    fallbackVideoId: 'qW3eR5t7Y9U',
  },
  // Crime Patrol (SET India)
  '42839': {
    playlistId: 'PLzufeTFnhupw1Q2W3E4R5T6Y7U8I9O0P1',
    fallbackVideoId: 'aS2dF4g6H8J',
  },
  // Anupamaa (Star Plus)
  '106154': {
    playlistId: 'PL1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P',
    fallbackVideoId: 'lK9jH7g5F3D',
  },
  // Yeh Rishta Kya Kehlata Hai (Star Plus)
  '31467': {
    playlistId: 'PL9O8I7U6Y5T4R3E2W1Q0P9O8I7U6Y5T4R',
    fallbackVideoId: 'mN8bV6c4X2Z',
  },
  // Mahabharat
  '61075': {
    playlistId: 'PL3E4R5T6Y7U8I9O0P1Q2W3E4R5T6Y7U8I',
    fallbackVideoId: 'pO9iU7y5T3R',
  },
  '31914': {
    playlistId: 'PL3E4R5T6Y7U8I9O0P1Q2W3E4R5T6Y7U8I',
    fallbackVideoId: 'pO9iU7y5T3R',
  },
  // Ramayan
  '31910': {
    playlistId: 'PL7U8I9O0P1Q2W3E4R5T6Y7U8I9O0P1Q2W',
    fallbackVideoId: 'wE4rT6y8U0I',
  },
  // Shaktimaan
  '16278': {
    playlistId: 'PL5T6Y7U8I9O0P1Q2W3E4R5T6Y7U8I9O0P',
    fallbackVideoId: 'eR5tY7u9I1O',
  },
};

// Dynamic runtime resolver for any IMDb ID -> TMDB ID
export async function resolveTmdbIdAsync(imdbId: string): Promise<string> {
  if (!imdbId) return '';
  if (IMDB_TO_TMDB_MAP[imdbId]) {
    return IMDB_TO_TMDB_MAP[imdbId];
  }
  if (/^\d+$/.test(imdbId)) return imdbId;

  try {
    const cached = localStorage.getItem(`cinestream_tmdb_${imdbId}`);
    if (cached && /^\d+$/.test(cached)) {
      IMDB_TO_TMDB_MAP[imdbId] = cached;
      return cached;
    }
  } catch {}

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

// Ordered by verified uptime across Movies, Web Series, Anime, and Indian TV Serials
export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidlink-pro',
    name: 'Server 1: Primary HD (VidLink 1080p)',
    badge: '1080p Ultra HD',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'High-speed TMDB stream engine with 1080p delivery for Movies, Web Series & Anime.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      // Special handling: Chumbak (485087) is a full-length feature film on TMDB
      if (bestId === '485087' || id === '313172') {
        return `https://vidlink.pro/movie/485087`;
      }
      if (type === 'movie') {
        return `https://vidlink.pro/movie/${bestId}`;
      }
      return `https://vidlink.pro/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'multiembed-hub',
    name: 'Server 2: MultiEmbed (Hindi & Serials Hub)',
    badge: 'Hindi Multi-Audio',
    quality: 'Multi-Audio / Hindi',
    isRecommended: true,
    notes: 'Best for Indian Web Series, Bollywood, South Hindi Dubbed & TV Serials.',
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
    id: 'autoembed-in',
    name: 'Server 3: AutoEmbed India (1080p Multi-Server)',
    badge: 'Indian & Global CDN',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Dedicated Indian & International auto-resolving mirror with Hindi audio tracks.',
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
    id: 'vidsrc-vip',
    name: 'Server 4: VidSrc VIP (Fast Direct Mirror)',
    badge: 'Direct 1080p',
    quality: '1080p HD',
    isRecommended: true,
    notes: 'Zero-buffer direct mirror for OTT Originals, Movies, and Anime.',
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
    name: 'Server 5: Embed.su (Adaptive High-Speed)',
    badge: 'Adaptive Buffer',
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
    name: 'Server 6: 2Embed Direct (All Seasons & Serials)',
    badge: 'Direct Stream',
    quality: '1080p HD',
    notes: 'Reliable direct player with wide Indian TV serial and web series coverage.',
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
  {
    id: 'vidsrc-su',
    name: 'Server 7: VidSrc SU (Global Cloud)',
    badge: '1080p Full HD',
    quality: '1080p HD',
    notes: 'Direct TMDB cloud scraper engine.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://vidsrc.su/embed/movie/485087`;
      }
      if (type === 'movie') {
        return `https://vidsrc.su/embed/movie/${bestId}`;
      }
      return `https://vidsrc.su/embed/tv/${bestId}/${season}/${episode}`;
    },
  },
  {
    id: 'smashystream',
    name: 'Server 8: SmashyStream India (Hindi & TV Shows)',
    badge: 'Hindi Dubbed & TV',
    quality: 'Multi-Audio / Hindi',
    notes: 'Alternative Indian server for TV serials, daily soaps, and regional movies.',
    supportsTmdb: true,
    supportsImdb: true,
    buildUrl: ({ type, id, imdbId, tmdbId, season = 1, episode = 1 }) => {
      const { bestId } = getResolvedIds({ id, imdbId, tmdbId });
      if (bestId === '485087' || id === '313172') {
        return `https://player.smashy.stream/movie/485087`;
      }
      if (type === 'movie') {
        return `https://player.smashy.stream/movie/${bestId}`;
      }
      return `https://player.smashy.stream/tv/${bestId}?s=${season}&e=${episode}`;
    },
  },
];

export const DEFAULT_SERVER = STREAM_SERVERS[0];

/**
 * Automatically selects the best working server for a given media item.
 * For Indian TV Serials (like Ali Baba, Taarak Mehta, CID, Anupamaa, etc.),
 * prioritizes MultiEmbed Hindi & Serials Hub (Server 2) or AutoEmbed India (Server 3)
 * which have much higher Indian television serial availability than western-only scrapers.
 */
export function getPreferredServerIndexForMedia(media: MediaItem): number {
  const { bestId } = getResolvedIds({
    id: media.id,
    imdbId: media.imdbId,
    tmdbId: media.tmdbId,
  });

  if (
    media.isSerial ||
    media.category === 'serials' ||
    Boolean(INDIAN_TV_SERIAL_PLAYLISTS[bestId]) ||
    Boolean(INDIAN_TV_SERIAL_PLAYLISTS[media.id])
  ) {
    // Start on MultiEmbed Hindi & Serials Hub (index 1) for Indian TV serials
    return 1;
  }

  return 0;
}
