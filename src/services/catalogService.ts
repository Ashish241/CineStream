import { Episode, MediaItem, MediaType } from '../types';
import {
  ALL_TIME_CLASSICS,
  ANIME_COLLECTION,
  BOLLYWOOD_SPECIALS,
  HERO_FEATURED_ITEMS,
  NEW_2026_RELEASES,
  TRENDING_MOVIES,
  TRENDING_SERIES,
} from '../data/curatedCatalog';
import { IMDB_TO_TMDB_MAP } from '../data/servers';

import { containsDevanagari, convertHindiToEnglish } from '../utils/hindiTransliteration';

// Cinemeta Stremio open catalog endpoints (free, CORS-enabled, no API key needed)
const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

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

    // Check alias list (e.g. 'पंचायत', 'mirjapur', 'gramchitshalay', '40 bhoot', 'ali baba', 'panchayat 4', etc.)
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
 * Searches movies and web series by title or IMDb ID
 */
export async function searchCatalog(query: string): Promise<MediaItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // If query is an IMDb ID (e.g. tt1234567), directly query details or return direct stub
  if (/^tt\d+$/i.test(cleanQuery)) {
    try {
      const details = await fetchMediaDetails('movie', cleanQuery);
      if (details?.media) return [details.media];
    } catch {
      // ignore
    }
  }

  // Detect Hindi and transliterate to English for global databases (TMDB/Cinemeta)
  const isHindi = containsDevanagari(cleanQuery);
  const englishQuery = isHindi ? convertHindiToEnglish(cleanQuery) : cleanQuery;

  // Check local curated items first with phonetic / alias matching (check both Hindi and English forms)
  const localMatches = searchLocalCatalog(cleanQuery);
  const englishLocalMatches = isHindi && englishQuery !== cleanQuery ? searchLocalCatalog(englishQuery) : [];

  const initialMatchesMap = new Map<string, MediaItem>();
  localMatches.forEach((m) => initialMatchesMap.set(m.id, m));
  englishLocalMatches.forEach((m) => initialMatchesMap.set(m.id, m));

  try {
    // Search TMDB using the English / Romanized query (which TMDB indexes best)
    const encodedEnglish = encodeURIComponent(englishQuery);
    const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';

    // Concurrently query live TMDB API and Cinemeta for complete real-time global coverage
    const [tmdbRes, movieRes, seriesRes] = await Promise.allSettled([
      fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodedEnglish}&include_adult=false`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(`${CINEMETA_BASE}/catalog/movie/top/search=${encodedEnglish}.json`, {
        headers: { Accept: 'application/json' },
      }).then((r) => (r.ok ? (r.json() as Promise<CinemetaCatalogResponse>) : null)),
      fetch(`${CINEMETA_BASE}/catalog/series/top/search=${encodedEnglish}.json`, {
        headers: { Accept: 'application/json' },
      }).then((r) => (r.ok ? (r.json() as Promise<CinemetaCatalogResponse>) : null)),
    ]);

    const remoteItems: MediaItem[] = [];

    // Live TMDB Results (Instant automatic discovery of any newly released movie or TV series)
    if (tmdbRes.status === 'fulfilled' && tmdbRes.value?.results) {
      for (const item of tmdbRes.value.results) {
        if (!item.id || (item.media_type !== 'movie' && item.media_type !== 'tv')) continue;
        const isTv = item.media_type === 'tv';
        const title = isTv ? item.name : item.title;
        const date = isTv ? item.first_air_date : item.release_date;
        const year = date ? String(date).slice(0, 4) : '';
        const tmdbIdStr = String(item.id);

        remoteItems.push({
          id: tmdbIdStr,
          tmdbId: tmdbIdStr,
          imdbId: tmdbIdStr,
          title: title || 'Untitled',
          type: isTv ? 'tv' : 'movie',
          poster: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop',
          backdrop: item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
            : undefined,
          year,
          rating: item.vote_average ? String(item.vote_average.toFixed(1)) : '7.5',
          overview: item.overview || '',
          genres: [],
        });
      }
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
        remoteItems.push({
          id: s.id,
          imdbId: s.id,
          title: s.name || 'Untitled Series',
          type: 'tv',
          poster: s.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop',
          year: s.releaseInfo || '',
          rating: s.imdbRating || '',
          overview: s.description || '',
          genres: s.genres || [],
        });
      }
    }

    // Merge without duplicates (favoring local high-res curated items first)
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
    1: [
      { season: 1, episode: 1, title: 'The Orphan of Kabul', overview: 'Ali Baba takes care of five orphans in the streets of Kabul.' },
      { season: 1, episode: 2, title: 'The Forty Ghosts & Thieves', overview: 'Mysterious spirits and thieves spread havoc across the province.' },
      { season: 1, episode: 3, title: 'The Cave of Wonders', overview: 'Ali Baba discovers the mythical secret cave of treasures.' },
      { season: 1, episode: 4, title: 'Marjina\'s Quest', overview: 'Princess Marjina seeks refuge from dark evil forces.' },
      { season: 1, episode: 5, title: 'The Magic Talisman', overview: 'Ali discovers he is the destined hero of Kabul.' },
      { season: 1, episode: 6, title: 'The Beast Awakens', overview: 'A monstrous threat is unleashed against the city.' },
      { season: 1, episode: 7, title: 'Battle at the Bazaar', overview: 'Ali Baba defends the Kabul marketplace with his quick wits.' },
      { season: 1, episode: 8, title: 'The Shadow of Simurgh', overview: 'A legendary mystical creature guides Ali through deadly trials.' },
    ],
    2: [
      { season: 2, episode: 1, title: 'Ek Andaaz Andekha', overview: 'A new chapter begins with darker mystical adversaries and comical spirits.' },
      { season: 2, episode: 2, title: 'The Magic Flying Carpet', overview: 'Ali takes to the skies to protect the innocent.' },
      { season: 2, episode: 3, title: 'The Secret of Forty Phantoms', overview: 'Ali Baba uncovers the origin of the 40 phantom spirits.' },
      { season: 2, episode: 4, title: 'The Final Magic Showdown', overview: 'The grand victory of light, laughter, and courage.' },
    ],
  },
  // Sunflower (ZEE5)
  tt14493392: {
    1: [
      { season: 1, episode: 1, title: 'Murder at Sunflower', overview: 'Mr. Raj Kapoor is found dead in flat 1001, setting off a wild investigation.' },
      { season: 1, episode: 2, title: 'Suspects Galore', overview: 'Inspectors Digendra and Tambe interrogate eccentric residents.' },
      { season: 1, episode: 3, title: 'Sonu\'s Coconut Oil', overview: 'Sonu Singh behaves so abnormally that he becomes the prime suspect.' },
      { season: 1, episode: 4, title: 'The Red Bag', overview: 'A missing bag creates havoc among the neighbors.' },
      { season: 1, episode: 5, title: 'Society Politics', overview: 'The society chairman election interferes with police questioning.' },
      { season: 1, episode: 6, title: 'The Twist', overview: 'A surprising lead reveals hidden connections in the building.' },
      { season: 1, episode: 7, title: 'Cat and Mouse', overview: 'Sonu unknowingly outwits the detectives at every corner.' },
      { season: 1, episode: 8, title: 'The Climax', overview: 'The season ends on an unbelievable cliffhanger.' },
    ],
    2: [
      { season: 2, episode: 1, title: 'Sonu in Custody', overview: 'Sonu Singh faces interrogation while Rosie enters Sunflower society.' },
      { season: 2, episode: 2, title: 'Rosie\'s Secret', overview: 'Bar dancer Rosie reveals an unexpected will from Mr. Kapoor.' },
      { season: 2, episode: 3, title: 'The Maid\'s Testimony', overview: 'Household secrets blow the investigation wide open.' },
      { season: 2, episode: 4, title: 'The Poisonous Cocktail', overview: 'Forensic reports pinpoint the exact toxic concoction.' },
      { season: 2, episode: 5, title: 'Double Game', overview: 'Deceptions and romantic entanglements mislead the police force.' },
      { season: 2, episode: 6, title: 'Sunflower Season Finale', overview: 'The actual culprit is unveiled in an unexpected, hilarious resolution.' },
    ],
  },
};

/**
 * Fetches full metadata and episodes list for a series or movie
 */
export async function fetchMediaDetails(
  type: MediaType,
  imdbId: string
): Promise<{ media: MediaItem; episodes: Record<number, Episode[]> }> {
  const normType = type === 'movie' ? 'movie' : 'series';

  // Resolve both TMDB and IMDb ID
  const mappedTmdb = IMDB_TO_TMDB_MAP[imdbId];
  const matchedEpisodes =
    CURATED_SERIES_EPISODES[imdbId] ||
    (mappedTmdb ? CURATED_SERIES_EPISODES[mappedTmdb] : null) ||
    (imdbId === '101352' ? CURATED_SERIES_EPISODES['tt11912196'] : null) ||
    (imdbId === '84105' ? CURATED_SERIES_EPISODES['tt6473300'] : null) ||
    (imdbId === '290138' ? CURATED_SERIES_EPISODES['tt34907994'] : null) ||
    (imdbId === '331932' ? CURATED_SERIES_EPISODES['tt21896792'] : null) ||
    (imdbId === '124151' ? CURATED_SERIES_EPISODES['tt14493392'] : null);

  if (matchedEpisodes) {
    const local = [
      ...HERO_FEATURED_ITEMS,
      ...NEW_2026_RELEASES,
      ...TRENDING_SERIES,
      ...BOLLYWOOD_SPECIALS,
    ].find((m) => m.id === imdbId || m.imdbId === imdbId || m.tmdbId === imdbId);

    const media: MediaItem = local || {
      id: imdbId,
      imdbId,
      title: 'Series',
      type: 'tv',
      poster: '',
      year: '2024',
      rating: '8.5',
    };

    return { media, episodes: matchedEpisodes };
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
        if (v.season === 0) continue; // skip specials if preferred
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

      // Sort episodes within each season
      Object.keys(episodesMap).forEach((seasonStr) => {
        const s = Number(seasonStr);
        episodesMap[s].sort((a, b) => a.episode - b.episode);
      });
    }

    const seasonsCount = Object.keys(episodesMap).length;

    const media: MediaItem = {
      id: meta.id,
      imdbId: meta.id,
      title: meta.name,
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

    return { media, episodes: episodesMap };
  } catch (err) {
    // Try fetching live TMDB details if TMDB ID is available
    const numericTmdbId = /^\d+$/.test(imdbId) ? imdbId : IMDB_TO_TMDB_MAP[imdbId];
    if (numericTmdbId) {
      try {
        const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';
        const tmdbEndpoint = normType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(
          `https://api.themoviedb.org/3/${tmdbEndpoint}/${numericTmdbId}?api_key=${TMDB_KEY}&language=en-US`
        );
        if (tmdbRes.ok) {
          const tData = await tmdbRes.json();
          const isTv = normType !== 'movie';
          const releaseDate = isTv ? tData.first_air_date : tData.release_date;
          const year = releaseDate ? String(releaseDate).slice(0, 4) : '';
          const title = isTv ? tData.name : tData.title;
          const seasonsCount = isTv ? (tData.number_of_seasons || 1) : undefined;

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
            year: year || (tData.status === 'Ended' && releaseDate ? `${year}` : year),
            rating: tData.vote_average ? String(tData.vote_average.toFixed(1)) : '8.0',
            overview: tData.overview || '',
            genres: tData.genres?.map((g: { name: string }) => g.name) || [],
            totalSeasons: seasonsCount,
          };

          const episodesMap: Record<number, Episode[]> = {};
          if (isTv && seasonsCount) {
            for (let s = 1; s <= seasonsCount; s++) {
              episodesMap[s] = [];
              const epCount = tData.seasons?.find((sn: { season_number: number }) => sn.season_number === s)?.episode_count || 8;
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

    // Find in local catalog if available
    const local = [
      ...HERO_FEATURED_ITEMS,
      ...NEW_2026_RELEASES,
      ...ALL_TIME_CLASSICS,
      ...TRENDING_SERIES,
      ...TRENDING_MOVIES,
      ...BOLLYWOOD_SPECIALS,
      ...ANIME_COLLECTION,
    ].find((m) => m.id === imdbId || m.imdbId === imdbId || m.tmdbId === imdbId);

    const media: MediaItem = local || {
      id: imdbId,
      imdbId,
      title: `Title (${imdbId})`,
      type: normType === 'movie' ? 'movie' : 'tv',
      poster: '',
      year: '',
      rating: '',
    };

    // If TV show, generate at least 1-4 seasons with 8-10 episodes each as fallback
    const episodesMap: Record<number, Episode[]> = {};
    if (media.type === 'tv' || normType === 'series') {
      const seasons = media.totalSeasons || 4;
      for (let s = 1; s <= seasons; s++) {
        episodesMap[s] = [];
        for (let e = 1; e <= 8; e++) {
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
