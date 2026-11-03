/**
 * Hindi / Devanagari to English Phonetic Transliteration & Movie Title Normalizer
 * Converts spoken or typed Hindi (Devanagari script) into searchable English/Romanized titles.
 */

// Comprehensive dictionary of Hindi movies, popular series, and common streaming terms
const HINDI_TITLE_DICTIONARY: Record<string, string> = {
  // Web Series
  'पंचायत': 'Panchayat',
  'पंचायत 4': 'Panchayat Season 4',
  'पंचायत 3': 'Panchayat Season 3',
  'पंचायत सीजन 4': 'Panchayat Season 4',
  'पंचायत सीजन 3': 'Panchayat Season 3',
  'मिर्जापुर': 'Mirzapur',
  'मिर्ज़ापुर': 'Mirzapur',
  'मिर्जापुर 3': 'Mirzapur Season 3',
  'मिर्ज़ापुर 3': 'Mirzapur Season 3',
  'अली बाबा': 'Ali Baba Dastaan E Kabul',
  'अली बाबा और 40 भूत': 'Ali Baba Dastaan E Kabul',
  'अलीबाबा और चालीस भूत': 'Ali Baba Dastaan E Kabul',
  'अलीबाबा': 'Ali Baba Dastaan E Kabul',
  '40 भूत': 'Ali Baba Dastaan E Kabul',
  'चालीस भूत': 'Ali Baba Dastaan E Kabul',
  'चुंबक': 'Chumbak',
  'ग्राम चिकित्सालय': 'Gram Chikitsalay',
  'ग्राम चिकत्सलय': 'Gram Chikitsalay',
  'ग्राम चिकित्‍सालय': 'Gram Chikitsalay',
  'सनफ्लावर': 'Sunflower',
  'सनफ्लॉवर': 'Sunflower',
  'गुल्लक': 'Gullak',
  'गुल्लक 4': 'Gullak Season 4',
  'सैक्रेड गेम्स': 'Sacred Games',
  'पाताल लोक': 'Paatal Lok',
  'असुर': 'Asur',
  'असुर 2': 'Asur 2',
  'फर्जी': 'Farzi',
  'द फैमिली मैन': 'The Family Man',
  'फैमिली मैन': 'The Family Man',
  'स्कैम 1992': 'Scam 1992',
  'स्कैम': 'Scam 1992',
  'कोटा फैक्ट्री': 'Kota Factory',
  'स्पेशल ऑप्स': 'Special Ops',
  'तांडव': 'Tandav',
  'क्रिमिनल जस्टिस': 'Criminal Justice',
  'अपहरण': 'Apharan',
  'रंगबाज': 'Rangbaaz',
  'भौकाल': 'Bhaukaal',
  'भोकाल': 'Bhaukaal',
  'दिल्ली क्राइम': 'Delhi Crime',
  'ब्रीद': 'Breathe',
  'आर्या': 'Aarya',
  'राणा नायडू': 'Rana Naidu',
  'रॉकेट बॉयज': 'Rocket Boys',
  'ताजा खबर': 'Taaza Khabar',
  'महारानी': 'Maharani',
  'जामताड़ा': 'Jamtara',
  'चाचा विधायक हैं हमारे': 'Chacha Vidhayak Hain Humare',
  'पिचर्स': 'TVF Pitchers',
  'ट्रिपलिंग': 'TVF Tripling',
  'एस्पिरेंट्स': 'Aspirants',
  'संदीप भैया': 'Sandeep Bhaiya',
  'एसके सर': 'SK Sir Ki Class',
  'हॉस्टल डेज': 'Hostel Daze',
  'कॉलेज रोमांस': 'College Romance',
  'फ्लैम्स': 'Flames',
  'तारक मेहता': 'Taarak Mehta Ka Ooltah Chashmah',
  'तारक मेहता का उल्टा चश्मा': 'Taarak Mehta Ka Ooltah Chashmah',
  'सीआईडी': 'CID',
  'क्राइम पेट्रोल': 'Crime Patrol',
  'अनुपमा': 'Anupamaa',

  // Movies
  'स्त्री': 'Stree',
  'स्त्री 2': 'Stree 2',
  'स्त्री २': 'Stree 2',
  'स्त्री दो': 'Stree 2',
  'पुष्पा': 'Pushpa The Rise',
  'पुष्पा 2': 'Pushpa 2 The Rule',
  'पुष्पा २': 'Pushpa 2 The Rule',
  'पुष्पा दो': 'Pushpa 2 The Rule',
  'पुष्पा द रूल': 'Pushpa 2 The Rule',
  'जवान': 'Jawan',
  'पठान': 'Pathaan',
  'डंकी': 'Dunki',
  'एनिमल': 'Animal',
  'कल्कि': 'Kalki 2898 AD',
  'कल्की': 'Kalki 2898 AD',
  'कल्कि 2898 एडी': 'Kalki 2898 AD',
  '12वीं फेल': '12th Fail',
  'बारहवीं फेल': '12th Fail',
  '12 फेल': '12th Fail',
  'गदर': 'Gadar',
  'गदर 2': 'Gadar 2',
  'गदर २': 'Gadar 2',
  'सिंघम': 'Singham',
  'सिंघम अगेन': 'Singham Again',
  'सिंघम 3': 'Singham Again',
  'भूल भुलैया': 'Bhool Bhulaiyaa',
  'भूल भुलैया 2': 'Bhool Bhulaiyaa 2',
  'भूल भुलैया 3': 'Bhool Bhulaiyaa 3',
  'भूल भुलैया ३': 'Bhool Bhulaiyaa 3',
  'शैतान': 'Shaitaan',
  'फाइटर': 'Fighter',
  'तेरी बातों में ऐसा उलझा जिया': 'Teri Baaton Mein Aisa Uljha Jiya',
  'आर्टिकल 370': 'Article 370',
  'क्रू': 'Crew',
  'चंदू चैंपियन': 'Chandu Champion',
  'किल': 'Kill',
  'महाराजा': 'Maharaja',
  'सरफिरा': 'Sarfira',
  'वेदा': 'Vedaa',
  'देवरा': 'Devara',
  'जिगरा': 'Jigra',
  'मैदान': 'Maidaan',
  'बड़े मियां छोटे मियां': 'Bade Miyan Chote Miyan',
  'योद्धा': 'Yodha',
  'दृश्यम': 'Drishyam',
  'दृश्यम 2': 'Drishyam 2',
  'केजीएफ': 'KGF Chapter 2',
  'केजीएफ 2': 'KGF Chapter 2',
  'के जी एफ': 'KGF Chapter 2',
  'आरआरआर': 'RRR',
  'आर आर आर': 'RRR',
  'बाहुबली': 'Baahubali',
  'बाहुबली 2': 'Baahubali 2',
  'दंगल': 'Dangal',
  'शोले': 'Sholay',
  'कंतारा': 'Kantara',
  'कांतारा': 'Kantara',
  'ब्रह्मास्त्र': 'Brahmastra',
  'विक्रम': 'Vikram',
  'लियो': 'Leo',
  'जेलर': 'Jailer',
  'सालार': 'Salaar',
  'हनुमान': 'Hanu-Man',
  'गैंग्स ऑफ वासेपुर': 'Gangs of Wasseypur',
  'थ्री इडियट्स': '3 Idiots',
  '3 इडियट्स': '3 Idiots',
  'तारे जमीन पर': 'Taare Zameen Par',
  'जिंदगी ना मिलेगी दोबारा': 'Zindagi Na Milegi Dobara',
  'कबीर सिंह': 'Kabir Singh',
  'उरी': 'Uri The Surgical Strike',
  'शेरशाह': 'Shershaah',
  'सूर्यवंशम': 'Sooryavansham',
  'हेरा फेरी': 'Hera Pheri',
  'फिर हेरा फेरी': 'Phir Hera Pheri',
  'वेलकम': 'Welcome',
  'धमाल': 'Dhamaal',
  'गोलमाल': 'Golmaal',

  // Common keywords spoken in Hindi
  'मूवी': 'Movie',
  'फिल्म': 'Movie',
  'पिक्चर': 'Movie',
  'सीरीज': 'Series',
  'वेब सीरीज': 'Web Series',
  'सीजन': 'Season',
  'भाग': 'Part',
  'एपिसोड': 'Episode',
  'नया': 'New',
  'नई': 'New',
};

// Check if string contains Devanagari characters
export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

// Map Devanagari numerals to standard digits
function replaceDevanagariDigits(text: string): string {
  const digits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return text.replace(/[०-९]/g, (d) => digits[d] || d);
}

// Algorithmic phonetic transliterator for general Devanagari text
const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};

const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy', 'श्र': 'shr',
  'ड़': 'r', 'ढ़': 'rh', 'ज़': 'z', 'फ़': 'f', 'क़': 'q', 'ख़': 'kh', 'ग़': 'gh',
};

export function phoneticTransliterate(devanagari: string): string {
  const normalized = replaceDevanagariDigits(devanagari);
  let result = '';
  const len = normalized.length;

  for (let i = 0; i < len; i++) {
    const char = normalized[i];
    const nextChar = i + 1 < len ? normalized[i + 1] : '';

    // Independent vowels
    if (VOWELS[char]) {
      result += VOWELS[char];
      continue;
    }

    // Matras (dependent vowels)
    if (MATRAS[char]) {
      result += MATRAS[char];
      continue;
    }

    // Anusvara (ं) and Chandrabindu (ँ)
    if (char === 'ं' || char === 'ँ') {
      result += 'n';
      continue;
    }

    // Virama (्) - suppresses inherent vowel 'a'
    if (char === '्') {
      continue;
    }

    // Nukta (़)
    if (char === '़') {
      continue;
    }

    // Consonants
    if (CONSONANTS[char]) {
      const latin = CONSONANTS[char];
      // Check if followed by virama (halant)
      if (nextChar === '्') {
        result += latin;
      }
      // Check if followed by a matra
      else if (MATRAS[nextChar]) {
        result += latin;
      }
      // Check if end of word or string (inherent 'a' is suppressed in modern Hindi schwa deletion)
      else if (i === len - 1 || nextChar === ' ' || nextChar === '-' || nextChar === '_') {
        result += latin;
      }
      // Otherwise add inherent vowel 'a'
      else {
        result += latin + 'a';
      }
      continue;
    }

    // Keep numbers, spaces, and punctuation as is
    result += char;
  }

  // Capitalize words cleanly
  return result
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

/**
 * Main converter: Given Hindi/Devanagari text, returns the best English/Romanized search query.
 */
export function convertHindiToEnglish(rawText: string): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();

  // If already purely Latin/numbers, return as is
  if (!containsDevanagari(trimmed)) {
    return trimmed;
  }

  // 1. Direct exact dictionary match
  const lowerClean = replaceDevanagariDigits(trimmed);
  if (HINDI_TITLE_DICTIONARY[lowerClean]) {
    return HINDI_TITLE_DICTIONARY[lowerClean];
  }

  // 2. Partial dictionary matching (e.g. "पंचायत सीजन 4", "मिर्जापुर 3", "स्त्री दो")
  let converted = lowerClean;
  for (const [hindi, english] of Object.entries(HINDI_TITLE_DICTIONARY)) {
    if (converted.includes(hindi)) {
      converted = converted.replace(new RegExp(hindi, 'g'), ` ${english} `);
    }
  }

  // 3. If there are still Devanagari characters remaining, run phonetic transliterator on those segments
  const tokens = converted.split(/\s+/).filter(Boolean);
  const resultTokens = tokens.map((token) => {
    if (containsDevanagari(token)) {
      const transliterated = phoneticTransliterate(token);
      return transliterated || token;
    }
    return token;
  });

  const finalResult = resultTokens.join(' ').replace(/\s+/g, ' ').trim();

  // Capitalize properly
  return finalResult || trimmed;
}
