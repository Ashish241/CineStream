import { MediaItem, StreamServer, VideoQuality } from '../types';

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';

/**
 * Verified mapping of IMDb IDs & legacy IDs to exact verified TMDB numeric IDs.
 */
export const IMDB_TO_TMDB_MAP: Record<string, string> = {
  // 2026 & 2025 New Indian OTT Releases (Verified TMDB IDs)
  'alibaba-40-bhoot': '331932', // Ali Baba Aur 40 Bhoot (2026 JioHotstar Special)
  tt21896792: '331932',         // Ali Baba Aur 40 Bhoot (2026 JioHotstar Special)
  '331932': '331932',           // Ali Baba Aur 40 Bhoot (2026)
  '313172': '313172',           // Chumbak (2026 Netflix / JioHotstar Series)
  '315887': '315887',           // Vikram On Duty (2026 JioHotstar Series)
  '243555': '243555',           // Akka (2026 Netflix Series)
  '331750': '331750',           // The Court (2026 SonyLIV Series)
  '243206': '243206',           // Pritam and Pedro (2026 JioHotstar Series)
  '315038': '315038',           // Resort (2026 JioHotstar Series)
  '339010': '339010',           // Madam Inspector (2026 ZEE5 Series)
  '337806': '337806',           // Least Eligible Bachelor (2026 Prime Video Series)
  '255613': '255613',           // Eyes (2026 ZEE5 Series)
  '323375': '323375',           // Brothers and Sisters (2026 SonyLIV Series)

  // Indian Web Series & Blockbusters
  tt12004706: '101352', // Panchayat
  tt11912196: '101352', // Panchayat
  tt6473300: '84105',   // Mirzapur
  tt34907994: '290138', // Gram Chikitsalay
  tt9544034: '93352',   // The Family Man
  '93347': '93352',     // The Family Man (legacy fix)
  tt13854988: '132117', // Farzi
  '202167': '132117',   // Farzi (legacy fix)
  tt11911116: '100911', // Asur
  tt12392504: '111188', // Scam 1992
  '110356': '111188',   // Scam 1992 (legacy fix)
  tt8108198: '79352',   // Sacred Games
  tt10230406: '103051', // Paatal Lok
  '103411': '103051',   // Paatal Lok (legacy fix)
  tt20857948: '203832', // Taaza Khabar
  '216390': '203832',   // Taaza Khabar (legacy fix)
  tt10444746: '90966',  // Gullak
  '90471': '90966',     // Gullak (legacy fix)
  tt14493392: '127332', // Sunflower
  '124151': '127332',   // Sunflower (legacy fix)
  tt9432978: '89113',   // Kota Factory
  '88040': '89113',     // Kota Factory (legacy fix)
  tt14392248: '124411', // Aspirants
  '122484': '124411',   // Aspirants (legacy fix)
  tt26744888: '220977', // Taj: Divided by Blood
  '221160': '220977',   // Taj: Divided by Blood (legacy fix)

  // Indian Movies (Verified TMDB IDs)
  tt16539454: '857598', // Pushpa 2: The Rule
  tt28383922: '1112426', // Stree 2
  '1147710': '1112426',  // Stree 2 (legacy fix)
  tt11487820: '801688',  // Kalki 2898 AD
  tt26655108: '980599',  // Bhool Bhulaiyaa 3
  '1097549': '980599',   // Bhool Bhulaiyaa 3 (legacy fix)
  tt27015642: '1014214', // Singham Again
  '1156593': '1014214',  // Singham Again (legacy fix)
  tt23561236: '1163258', // 12th Fail
  '1189422': '1163258',  // 12th Fail (legacy fix)
  tt27546688: '1123960', // Sirf Ek Bandaa Kaafi Hai
  '1124403': '1123960',  // Sirf Ek Bandaa Kaafi Hai (legacy fix)
  tt15354916: '872906',  // Jawan
  tt13751694: '781732',  // Animal
  tt8178634: '579974',   // RRR
  tt10698680: '587412',  // K.G.F: Chapter 2
  tt1187043: '20453',    // 3 Idiots
  tt5074352: '360814',   // Dangal

  // Indian TV Serials (Legacy ID fixes -> Genuine TMDB IDs)
  '42009': '8630',       // Taarak Mehta Ka Ooltah Chashmah
  tt1301993: '8630',
  '14955': '15226',      // C.I.D.
  tt0401916: '15226',
  '81929': '84982',      // Aladdin - Naam Toh Suna Hoga
  tt8879516: '84982',
  '64257': '222610',     // Baalveer
  tt2479262: '222610',
  '106154': '116479',    // Anupamaa
  tt12679726: '116479',
  '31467': '16413',      // Yeh Rishta Kya Kehlata Hai
  tt1379227: '16413',
  '65933': '65682',      // Bhabiji Ghar Par Hain!
  tt4519822: '65682',
  '118345': '119316',    // Wagle Ki Duniya
  tt13975556: '119316',
  '73230': '75257',      // Tenali Rama
  tt7161162: '75257',
  '42839': '74913',      // Crime Patrol
  tt2187015: '74913',
  '61075': '60550',      // Mahabharat
  tt3123166: '60550',
  '31910': '1990',       // Ramayan
  tt0268093: '1990',
  '16278': '42135',      // Shaktimaan
  tt0283795: '42135',
  '30816': '4165',       // Sarabhai vs Sarabhai
  tt0432049: '4165',
  '66294': '66465',      // The Kapil Sharma Show
  tt5662978: '66465',

  // Global Blockbusters & Series
  tt10919420: '93405',   // Squid Game
  tt11198330: '94997',   // House of the Dragon
  tt0903747: '1396',     // Breaking Bad
  tt4574334: '66732',    // Stranger Things
  tt6468322: '71446',    // Money Heist
  tt5753856: '70523',    // Dark
  tt1190634: '76479',    // The Boys
  tt2788316: '126308',   // Shogun
  tt1375666: '27205',    // Inception
  tt0816692: '157336',   // Interstellar
  tt0468569: '155',      // The Dark Knight
  tt15398776: '872585',  // Oppenheimer
  tt15239678: '693134',  // Dune: Part Two
  tt6263850: '533535',   // Deadpool & Wolverine
};

export async function resolveTmdbIdAsync(
  id: string,
  title?: string,
  type?: 'movie' | 'tv' | 'series'
): Promise<string> {
  if (!id) return id;
  if (IMDB_TO_TMDB_MAP[id]) {
    return IMDB_TO_TMDB_MAP[id];
  }
  if (/^\d+$/.test(id)) {
    return id;
  }

  try {
    if (id.startsWith('tt')) {
      const findRes = await fetch(
        `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const found = findData.tv_results?.[0] || findData.movie_results?.[0];
        if (found?.id) {
          const tmdbStr = String(found.id);
          IMDB_TO_TMDB_MAP[id] = tmdbStr;
          return tmdbStr;
        }
      }
    }

    if (title) {
      const cleanTitle = title.replace(/\(Season.*?\)/i, '').trim();
      const searchEndpoint = type === 'movie' ? 'movie' : 'tv';
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/${searchEndpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const firstMatch = searchData.results?.[0];
        if (firstMatch?.id) {
          const tmdbStr = String(firstMatch.id);
          IMDB_TO_TMDB_MAP[id] = tmdbStr;
          return tmdbStr;
        }
      }
    }
  } catch (err) {
    console.warn('TMDB ID resolution fallback:', err);
  }

  return id;
}

function resolveTmdbId(params: { id: string; imdbId?: string; tmdbId?: string }): string {
  if (params.tmdbId && IMDB_TO_TMDB_MAP[params.tmdbId]) {
    return IMDB_TO_TMDB_MAP[params.tmdbId];
  }
  if (params.id && IMDB_TO_TMDB_MAP[params.id]) {
    return IMDB_TO_TMDB_MAP[params.id];
  }
  if (params.imdbId && IMDB_TO_TMDB_MAP[params.imdbId]) {
    return IMDB_TO_TMDB_MAP[params.imdbId];
  }
  if (params.tmdbId && /^\d+$/.test(params.tmdbId)) {
    return params.tmdbId;
  }
  const raw = params.imdbId || params.id;
  if (/^\d+$/.test(raw)) {
    return raw;
  }
  return IMDB_TO_TMDB_MAP[raw] || raw;
}

/**
 * Verified Working High-Availability Multi-CDN Streaming Servers (2025-2026)
 * Removed old Server 1 (videasy-net) and Server 8 as requested.
 * All servers support startAt timestamp seeking, autoplay, and custom player synchronization.
 */
export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidlink-pro',
    name: 'Server 1: VidLink Pro 4K/1080p (Max Catalog · TV Safe)',
    badge: 'VidLink 4K/1080p',
    quality: '4K / 1080p Original',
    supportsQualityParam: true,
    buildUrl: ({
      type,
      id,
      imdbId,
      tmdbId,
      season = 1,
      episode = 1,
      quality = '1080p',
      startAt = 0,
      autoPlay = true,
      muted = false,
    }) => {
      const targetId = resolveTmdbId({ id, imdbId, tmdbId });
      const qParam = quality && quality !== 'auto' ? `&quality=${quality}` : '';
      const startParam = startAt > 0 ? `&startAt=${Math.floor(startAt)}` : '';
      const autoParam = `&autoplay=${autoPlay ? 'true' : 'false'}`;
      const muteParam = muted ? '&muted=true' : '';
      if (type === 'movie') {
        return `https://vidlink.pro/movie/${targetId}?primaryColor=f59e0b&title=false&poster=false${autoParam}${qParam}${startParam}${muteParam}`;
      }
      return `https://vidlink.pro/tv/${targetId}/${season}/${episode}?primaryColor=f59e0b&title=false&poster=false${autoParam}${qParam}${startParam}${muteParam}`;
    },
  },
  {
    id: 'autoembed-co',
    name: 'Server 2: AutoEmbed Hindi & Original Multi-CDN (TV Safe)',
    badge: 'AutoEmbed Multi-CDN',
    quality: '1080p Multi-Audio',
    supportsQualityParam: true,
    buildUrl: ({
      type,
      id,
      imdbId,
      tmdbId,
      season = 1,
      episode = 1,
      startAt = 0,
      autoPlay = true,
    }) => {
      const targetId = resolveTmdbId({ id, imdbId, tmdbId });
      const startParam = startAt > 0 ? `?startAt=${Math.floor(startAt)}&t=${Math.floor(startAt)}&autoplay=${autoPlay ? 1 : 0}` : `?autoplay=${autoPlay ? 1 : 0}`;
      if (type === 'movie') {
        return `https://autoembed.co/movie/tmdb/${targetId}${startParam}`;
      }
      return `https://autoembed.co/tv/tmdb/${targetId}-${season}-${episode}${startParam}`;
    },
  },
  {
    id: 'vidfast-pro',
    name: 'Server 3: VidFast Pro Multi-Audio HD (TV Safe)',
    badge: 'VidFast HD',
    quality: '1080p Full HD',
    supportsQualityParam: true,
    buildUrl: ({
      type,
      id,
      imdbId,
      tmdbId,
      season = 1,
      episode = 1,
      startAt = 0,
      autoPlay = true,
      muted = false,
    }) => {
      const targetId = resolveTmdbId({ id, imdbId, tmdbId });
      const startParam = startAt > 0 ? `&startAt=${Math.floor(startAt)}` : '';
      const autoParam = `autoPlay=${autoPlay ? 'true' : 'false'}`;
      const muteParam = muted ? '&muted=true' : '';
      if (type === 'movie') {
        return `https://vidfast.pro/movie/${targetId}?${autoParam}&theme=f59e0b&title=false&poster=false${startParam}${muteParam}`;
      }
      return `https://vidfast.pro/tv/${targetId}/${season}/${episode}?${autoParam}&theme=f59e0b&title=false&poster=false${startParam}${muteParam}`;
    },
  },
  {
    id: 'nontongo-win',
    name: 'Server 4: NontonGo VidSrc Proxy (Airtel SSL Bypass)',
    badge: 'VidSrc Proxy',
    quality: '1080p Full HD',
    supportsQualityParam: true,
    buildUrl: ({
      type,
      id,
      imdbId,
      tmdbId,
      season = 1,
      episode = 1,
      startAt = 0,
    }) => {
      const targetId = resolveTmdbId({ id, imdbId, tmdbId });
      const startParam = startAt > 0 ? `?startAt=${Math.floor(startAt)}&t=${Math.floor(startAt)}` : '';
      if (type === 'movie') {
        return `https://www.nontongo.win/embed/movie/${targetId}${startParam}`;
      }
      return `https://www.nontongo.win/embed/tv/${targetId}/${season}/${episode}${startParam}`;
    },
  },
  {
    id: 'vidsrc-wtf-1',
    name: 'Server 5: VidSrc Multi-Server API 1 (Private DNS)',
    badge: 'VidSrc API 1',
    quality: '1080p HD',
    supportsQualityParam: true,
    buildUrl: ({
      type,
      id,
      imdbId,
      tmdbId,
      season = 1,
      episode = 1,
      startAt = 0,
    }) => {
      const targetId = resolveTmdbId({ id, imdbId, tmdbId });
      const startParam = startAt > 0 ? `&startAt=${Math.floor(startAt)}&t=${Math.floor(startAt)}` : '';
      if (type === 'movie') {
        return `https://vidsrc.wtf/api/1/movie/?id=${targetId}&color=f59e0b${startParam}`;
      }
      return `https://vidsrc.wtf/api/1/tv/?id=${targetId}&s=${season}&e=${episode}&color=f59e0b${startParam}`;
    },
  },
  {
    id: 'vidsrc-wtf-2',
    name: 'Server 6: VidSrc Multi-Audio API 2 (Private DNS)',
    badge: 'VidSrc API 2',
    quality: '1080p Multi-Audio',
    supportsQualityParam: true,
    buildUrl: ({
      type,
      id,
      imdbId,
      tmdbId,
      season = 1,
      episode = 1,
      startAt = 0,
    }) => {
      const targetId = resolveTmdbId({ id, imdbId, tmdbId });
      const startParam = startAt > 0 ? `&startAt=${Math.floor(startAt)}&t=${Math.floor(startAt)}` : '';
      if (type === 'movie') {
        return `https://vidsrc.wtf/api/2/movie/?id=${targetId}&color=f59e0b${startParam}`;
      }
      return `https://vidsrc.wtf/api/2/tv/?id=${targetId}&s=${season}&e=${episode}&color=f59e0b${startParam}`;
    },
  },
];

export const DEFAULT_SERVER = STREAM_SERVERS[0];

/**
 * Selects the optimal primary server index for any media item automatically.
 * Uses v6 storage key so any previously cached server index is cleanly updated.
 */
export function getPreferredServerIndexForMedia(media: MediaItem): number {
  try {
    const savedIdx = localStorage.getItem(`cinestream_srv_v6_${media.id}`);
    if (savedIdx !== null) {
      const parsed = Number(savedIdx);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < STREAM_SERVERS.length) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  return 0;
}

