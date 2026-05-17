/**
 * QuranIQ Kids - Quranic Qaida Curriculum Data
 * 
 * Design: Celestial Garden theme
 * Progressive learning from individual letters to connected reading
 * 
 * KEY PEDAGOGICAL PRINCIPLES:
 * 1. A child should NEVER be tested on letters they haven't learned yet.
 * 2. Distractors come ONLY from previously mastered letters.
 * 3. PHASE 1: Only teach words that START with the letter.
 *    Middle/end positions come much later (Phase 2) after mastery.
 * 4. For the very first letter, use visually distinct common letters as
 *    "shape distractors" — the child just needs to recognize the shape.
 */

export interface WordCard {
  word: string;         // Arabic word
  transliteration: string;
  meaning: string;
  emoji: string;        // visual representation for toddlers
  letterHighlightIndex: number[]; // indices of the target letter in the word
  position: 'beginning' | 'middle' | 'end'; // where the letter appears in the word
  quranicRef?: string;  // Surah reference if this word appears in the Quran (e.g., 'Al-Baqarah 2:70')
}

export interface QuranicWord {
  word: string;         // Arabic word from Quran
  surah: string;        // Surah name
  meaning: string;
  letterHighlightIndex: number[]; // indices of the target letter
}

export interface ArabicLetter {
  id: number;
  letter: string;
  name: string;
  nameAr: string;
  transliteration: string;
  sound: string;
  group: string;
  color: string;
  wordCards: WordCard[];       // Words featuring this letter — BEGINNING words FIRST
  quranicWords: QuranicWord[]; // Quranic words featuring this letter
}

export interface Lesson {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  level: number;
  type: 'letters' | 'harakat' | 'tanween' | 'madd' | 'sukoon' | 'practice';
  letters?: number[];
  unlockAfter?: number;
  icon: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  color: string;
  lessons: number[];
}

// All 28 Arabic Letters with word cards and Quranic words
// IMPORTANT: wordCards are ordered with "beginning" position FIRST.
// Games in Phase 1 should ONLY use beginning-position words.
export const arabicLetters: ArabicLetter[] = [
  {
    id: 1, letter: 'ا', name: 'Alif', nameAr: 'ألف', transliteration: 'a',
    sound: 'ah (like "a" in "father")', group: 'throat', color: '#0D7377',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'أسد', transliteration: 'Asad', meaning: 'Lion', emoji: '🦁', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Muddathir 74:51' },
      { word: 'أرنب', transliteration: 'Arnab', meaning: 'Rabbit', emoji: '🐰', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'أناناس', transliteration: 'Ananas', meaning: 'Pineapple', emoji: '🍍', letterHighlightIndex: [0], position: 'beginning' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'سماء', transliteration: 'Samaa', meaning: 'Sky', emoji: '🌤️', letterHighlightIndex: [3], position: 'end' },
      { word: 'قائد', transliteration: 'Qaaid', meaning: 'Leader', emoji: '👨‍✈️', letterHighlightIndex: [1], position: 'middle' },
    ],
    quranicWords: [
      { word: 'ٱللَّه', surah: 'Al-Fatiha', meaning: 'Allah (God)', letterHighlightIndex: [0] },
      { word: 'ٱلْحَمْدُ', surah: 'Al-Fatiha', meaning: 'All praise', letterHighlightIndex: [0] },
      { word: 'إِيَّاكَ', surah: 'Al-Fatiha', meaning: 'You alone', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 2, letter: 'ب', name: 'Ba', nameAr: 'باء', transliteration: 'b',
    sound: 'b (like "b" in "boy")', group: 'lips', color: '#F5A623',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'بقرة', transliteration: 'Baqara', meaning: 'Cow', emoji: '🐄', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Baqarah 2:67' },
      { word: 'بطة', transliteration: 'Batta', meaning: 'Duck', emoji: '🦆', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'بيت', transliteration: 'Bayt', meaning: 'House', emoji: '🏠', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Baqarah 2:125' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'كتاب', transliteration: 'Kitaab', meaning: 'Book', emoji: '📖', letterHighlightIndex: [3], position: 'end', quranicRef: 'Al-Baqarah 2:2' },
      { word: 'جبل', transliteration: 'Jabal', meaning: 'Mountain', emoji: '⛰️', letterHighlightIndex: [1], position: 'middle' },
    ],
    quranicWords: [
      { word: 'بِسْمِ', surah: 'Al-Fatiha', meaning: 'In the name of', letterHighlightIndex: [0] },
      { word: 'بِٱللَّهِ', surah: 'Al-Fatiha', meaning: 'of Allah', letterHighlightIndex: [0] },
      { word: 'بَعْدِ', surah: 'Al-Baqarah', meaning: 'After', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 3, letter: 'ت', name: 'Ta', nameAr: 'تاء', transliteration: 't',
    sound: 't (like "t" in "top")', group: 'tongue-tip', color: '#E8567F',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'تفاح', transliteration: 'Tuffah', meaning: 'Apple', emoji: '🍎', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'تمر', transliteration: 'Tamr', meaning: 'Dates', emoji: '🌴', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Maryam 19:25' },
      { word: 'تاج', transliteration: 'Taaj', meaning: 'Crown', emoji: '👑', letterHighlightIndex: [0], position: 'beginning' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'كتب', transliteration: 'Kutub', meaning: 'Books', emoji: '📚', letterHighlightIndex: [1], position: 'middle' },
      { word: 'بنت', transliteration: 'Bint', meaning: 'Girl', emoji: '👧', letterHighlightIndex: [2], position: 'end' },
    ],
    quranicWords: [
      { word: 'تَبَارَكَ', surah: 'Al-Mulk', meaning: 'Blessed is', letterHighlightIndex: [0] },
      { word: 'تَوَّابٌ', surah: 'Al-Baqarah', meaning: 'Accepting repentance', letterHighlightIndex: [0] },
      { word: 'تَعْبُدُونَ', surah: 'Al-Baqarah', meaning: 'You worship', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 4, letter: 'ث', name: 'Tha', nameAr: 'ثاء', transliteration: 'th',
    sound: 'th (like "th" in "think")', group: 'tongue-tip', color: '#6B8E23',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'ثعلب', transliteration: 'Thalab', meaning: 'Fox', emoji: '🦊', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'ثلج', transliteration: 'Thalj', meaning: 'Snow', emoji: '❄️', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'ثوب', transliteration: 'Thawb', meaning: 'Garment', emoji: '👔', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-A'raf 7:26" },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'أثاث', transliteration: 'Athaath', meaning: 'Furniture', emoji: '🪑', letterHighlightIndex: [1], position: 'middle' },
      { word: 'حديث', transliteration: 'Hadeeth', meaning: 'Speech', emoji: '💬', letterHighlightIndex: [3], position: 'end' },
    ],
    quranicWords: [
      { word: 'ثُمَّ', surah: 'Al-Baqarah', meaning: 'Then', letterHighlightIndex: [0] },
      { word: 'ثَمَرَات', surah: 'Al-Baqarah', meaning: 'Fruits', letterHighlightIndex: [0] },
      { word: 'ثَلَاثَة', surah: 'Al-Kahf', meaning: 'Three', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 5, letter: 'ج', name: 'Jeem', nameAr: 'جيم', transliteration: 'j',
    sound: 'j (like "j" in "jump")', group: 'middle-tongue', color: '#9B59B6',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'جمل', transliteration: 'Jamal', meaning: 'Camel', emoji: '🐪', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-A'raf 7:40" },
      { word: 'جزر', transliteration: 'Jazar', meaning: 'Carrot', emoji: '🥕', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'جبن', transliteration: 'Jubn', meaning: 'Cheese', emoji: '🧀', letterHighlightIndex: [0], position: 'beginning' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'نجم', transliteration: 'Najm', meaning: 'Star', emoji: '⭐', letterHighlightIndex: [1], position: 'middle' },
      { word: 'ثلج', transliteration: 'Thalj', meaning: 'Snow', emoji: '❄️', letterHighlightIndex: [2], position: 'end' },
    ],
    quranicWords: [
      { word: 'جَنَّة', surah: 'Al-Baqarah', meaning: 'Paradise', letterHighlightIndex: [0] },
      { word: 'جَعَلَ', surah: 'Al-Baqarah', meaning: 'He made', letterHighlightIndex: [0] },
      { word: 'جَاءَ', surah: 'An-Nasr', meaning: 'Came', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 6, letter: 'ح', name: 'Ha', nameAr: 'حاء', transliteration: 'ḥ',
    sound: 'h (breathy, from throat)', group: 'throat', color: '#3498DB',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'حصان', transliteration: 'Hisan', meaning: 'Horse', emoji: '🐴', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'حوت', transliteration: 'Hoot', meaning: 'Whale', emoji: '🐋', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'As-Saffat 37:142' },
      { word: 'حليب', transliteration: 'Haleeb', meaning: 'Milk', emoji: '🥛', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'An-Nahl 16:66' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'بحر', transliteration: 'Bahr', meaning: 'Sea', emoji: '🌊', letterHighlightIndex: [1], position: 'middle' },
      { word: 'ملح', transliteration: 'Milh', meaning: 'Salt', emoji: '🧂', letterHighlightIndex: [2], position: 'end' },
    ],
    quranicWords: [
      { word: 'حَمْدُ', surah: 'Al-Fatiha', meaning: 'Praise', letterHighlightIndex: [0] },
      { word: 'حَكِيم', surah: 'Al-Baqarah', meaning: 'Wise', letterHighlightIndex: [0] },
      { word: 'حَقّ', surah: 'Al-Baqarah', meaning: 'Truth', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 7, letter: 'خ', name: 'Kha', nameAr: 'خاء', transliteration: 'kh',
    sound: 'kh (like clearing throat gently)', group: 'throat', color: '#E67E22',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'خروف', transliteration: 'Kharoof', meaning: 'Sheep', emoji: '🐑', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-An'am 6:143" },
      { word: 'خبز', transliteration: 'Khubz', meaning: 'Bread', emoji: '🍞', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'خيمة', transliteration: 'Khayma', meaning: 'Tent', emoji: '⛺', letterHighlightIndex: [0], position: 'beginning' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'نخل', transliteration: 'Nakhl', meaning: 'Palm tree', emoji: '🌴', letterHighlightIndex: [1], position: 'middle' },
      { word: 'طبخ', transliteration: 'Tabkh', meaning: 'Cooking', emoji: '🍳', letterHighlightIndex: [2], position: 'end' },
    ],
    quranicWords: [
      { word: 'خَلَقَ', surah: 'Al-Alaq', meaning: 'Created', letterHighlightIndex: [0] },
      { word: 'خَيْر', surah: 'Al-Baqarah', meaning: 'Good', letterHighlightIndex: [0] },
      { word: 'خَاشِعِينَ', surah: 'Al-Baqarah', meaning: 'Humble ones', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 8, letter: 'د', name: 'Dal', nameAr: 'دال', transliteration: 'd',
    sound: 'd (like "d" in "door")', group: 'tongue-tip', color: '#1ABC9C',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'دب', transliteration: 'Dubb', meaning: 'Bear', emoji: '🐻', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'دجاجة', transliteration: 'Dajaaja', meaning: 'Chicken', emoji: '🐔', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'دلفين', transliteration: 'Dolfeen', meaning: 'Dolphin', emoji: '🐬', letterHighlightIndex: [0], position: 'beginning' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'مدرسة', transliteration: 'Madrasa', meaning: 'School', emoji: '🏫', letterHighlightIndex: [1], position: 'middle' },
      { word: 'أسد', transliteration: 'Asad', meaning: 'Lion', emoji: '🦁', letterHighlightIndex: [2], position: 'end', quranicRef: 'Al-Muddathir 74:51' },
    ],
    quranicWords: [
      { word: 'دِين', surah: 'Al-Fatiha', meaning: 'Religion/Way', letterHighlightIndex: [0] },
      { word: 'دُعَاء', surah: 'Al-Baqarah', meaning: 'Supplication', letterHighlightIndex: [0] },
      { word: 'دَرَجَات', surah: 'Al-Baqarah', meaning: 'Degrees', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 9, letter: 'ذ', name: 'Dhal', nameAr: 'ذال', transliteration: 'dh',
    sound: 'dh (like "th" in "this")', group: 'tongue-tip', color: '#F39C12',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'ذئب', transliteration: 'Dhiʾb', meaning: 'Wolf', emoji: '🐺', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Yusuf 12:13' },
      { word: 'ذرة', transliteration: 'Dhura', meaning: 'Corn', emoji: '🌽', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Az-Zalzalah 99:7' },
      { word: 'ذهب', transliteration: 'Dhahab', meaning: 'Gold', emoji: '🥇', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Kahf 18:31' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'لذيذ', transliteration: 'Ladheedh', meaning: 'Delicious', emoji: '😋', letterHighlightIndex: [1], position: 'middle' },
      { word: 'تلميذ', transliteration: 'Tilmeedh', meaning: 'Student', emoji: '👨‍🎓', letterHighlightIndex: [4], position: 'end' },
    ],
    quranicWords: [
      { word: 'ذَلِكَ', surah: 'Al-Baqarah', meaning: 'That', letterHighlightIndex: [0] },
      { word: 'ذِكْر', surah: 'Al-Baqarah', meaning: 'Remembrance', letterHighlightIndex: [0] },
      { word: 'ذُنُوب', surah: 'Aal-Imran', meaning: 'Sins', letterHighlightIndex: [0] },
    ],
  },
  {
    id: 10, letter: 'ر', name: 'Ra', nameAr: 'راء', transliteration: 'r',
    sound: 'r (rolled, like Spanish "r")', group: 'tongue-tip', color: '#E74C3C',
    wordCards: [
      // BEGINNING words — used in Phase 1
      { word: 'رمان', transliteration: 'Rumman', meaning: 'Pomegranate', emoji: '🍎', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Ar-Rahman 55:68' },
      { word: 'رجل', transliteration: 'Rajul', meaning: 'Man', emoji: '👨', letterHighlightIndex: [0], position: 'beginning' },
      { word: 'ريشة', transliteration: 'Reesha', meaning: 'Feather', emoji: '🪶', letterHighlightIndex: [0], position: 'beginning' },
      // MIDDLE/END words — used in Phase 2 (advanced)
      { word: 'شجرة', transliteration: 'Shajara', meaning: 'Tree', emoji: '🌳', letterHighlightIndex: [2], position: 'middle', quranicRef: 'Ibrahim 14:24' },
      { word: 'قمر', transliteration: 'Qamar', meaning: 'Moon', emoji: '🌙', letterHighlightIndex: [2], position: 'end', quranicRef: 'Al-Qamar 54:1' },
    ],
    quranicWords: [
      { word: 'رَبِّ', surah: 'Al-Fatiha', meaning: 'Lord', letterHighlightIndex: [0] },
      { word: 'رَحْمَن', surah: 'Al-Fatiha', meaning: 'Most Merciful', letterHighlightIndex: [0] },
      { word: 'رَحِيم', surah: 'Al-Fatiha', meaning: 'Most Compassionate', letterHighlightIndex: [0] },
    ],
  },
  // Letters 11-28 follow the same pattern — beginning words first
  { id: 11, letter: 'ز', name: 'Zay', nameAr: 'زاي', transliteration: 'z', sound: 'z (like "z" in "zoo")', group: 'tongue-tip', color: '#2ECC71', wordCards: [{ word: 'زرافة', transliteration: 'Zarafa', meaning: 'Giraffe', emoji: '🦒', letterHighlightIndex: [0], position: 'beginning' }, { word: 'زهرة', transliteration: 'Zahra', meaning: 'Flower', emoji: '🌸', letterHighlightIndex: [0], position: 'beginning' }, { word: 'زيتون', transliteration: 'Zaytoon', meaning: 'Olive', emoji: '🫒', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'At-Tin 95:1' }], quranicWords: [{ word: 'زَيْتُون', surah: 'At-Tin', meaning: 'Olive tree', letterHighlightIndex: [0] }] },
  { id: 12, letter: 'س', name: 'Seen', nameAr: 'سين', transliteration: 's', sound: 's (like "s" in "sun")', group: 'tongue-tip', color: '#16A085', wordCards: [{ word: 'سمكة', transliteration: 'Samaka', meaning: 'Fish', emoji: '🐟', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Kahf 18:63' }, { word: 'سيارة', transliteration: 'Sayyara', meaning: 'Car', emoji: '🚗', letterHighlightIndex: [0], position: 'beginning' }, { word: 'سلحفاة', transliteration: 'Sulahfa', meaning: 'Turtle', emoji: '🐢', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'سَلَام', surah: 'Al-Qadr', meaning: 'Peace', letterHighlightIndex: [0] }] },
  { id: 13, letter: 'ش', name: 'Sheen', nameAr: 'شين', transliteration: 'sh', sound: 'sh (like "sh" in "ship")', group: 'middle-tongue', color: '#8E44AD', wordCards: [{ word: 'شمس', transliteration: 'Shams', meaning: 'Sun', emoji: '☀️', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Ash-Shams 91:1' }, { word: 'شجرة', transliteration: 'Shajara', meaning: 'Tree', emoji: '🌳', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Ibrahim 14:24' }, { word: 'شاي', transliteration: 'Shay', meaning: 'Tea', emoji: '🍵', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'شَهْر', surah: 'Al-Baqarah', meaning: 'Month', letterHighlightIndex: [0] }] },
  { id: 14, letter: 'ص', name: 'Sad', nameAr: 'صاد', transliteration: 'ṣ', sound: 's (emphatic, heavy)', group: 'tongue-tip', color: '#D35400', wordCards: [{ word: 'صقر', transliteration: 'Saqr', meaning: 'Falcon', emoji: '🦅', letterHighlightIndex: [0], position: 'beginning' }, { word: 'صاروخ', transliteration: 'Saroukh', meaning: 'Rocket', emoji: '🚀', letterHighlightIndex: [0], position: 'beginning' }, { word: 'صندوق', transliteration: 'Sundooq', meaning: 'Box', emoji: '📦', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'صِرَاط', surah: 'Al-Fatiha', meaning: 'Path', letterHighlightIndex: [0] }] },
  { id: 15, letter: 'ض', name: 'Dad', nameAr: 'ضاد', transliteration: 'ḍ', sound: 'd (emphatic, heavy)', group: 'tongue-tip', color: '#C0392B', wordCards: [{ word: 'ضفدع', transliteration: 'Difda', meaning: 'Frog', emoji: '🐸', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-A'raf 7:133" }, { word: 'ضوء', transliteration: 'Dawʾ', meaning: 'Light', emoji: '💡', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Yunus 10:5' }, { word: 'ضباب', transliteration: 'Dabab', meaning: 'Fog', emoji: '🌫️', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'ضَلَال', surah: 'Al-Fatiha', meaning: 'Astray', letterHighlightIndex: [0] }] },
  { id: 16, letter: 'ط', name: 'Taa', nameAr: 'طاء', transliteration: 'ṭ', sound: 't (emphatic, heavy)', group: 'tongue-tip', color: '#27AE60', wordCards: [{ word: 'طائر', transliteration: 'Taair', meaning: 'Bird', emoji: '🐦', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Fil 105:3' }, { word: 'طبل', transliteration: 'Tabl', meaning: 'Drum', emoji: '🥁', letterHighlightIndex: [0], position: 'beginning' }, { word: 'طماطم', transliteration: 'Tamaatim', meaning: 'Tomato', emoji: '🍅', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'طَيْر', surah: 'Al-Fil', meaning: 'Birds', letterHighlightIndex: [0] }] },
  { id: 17, letter: 'ظ', name: 'Dhaa', nameAr: 'ظاء', transliteration: 'ẓ', sound: 'dh (emphatic, heavy)', group: 'tongue-tip', color: '#2980B9', wordCards: [{ word: 'ظرف', transliteration: 'Dharf', meaning: 'Envelope', emoji: '✉️', letterHighlightIndex: [0], position: 'beginning' }, { word: 'ظل', transliteration: 'Dhill', meaning: 'Shadow', emoji: '🌑', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Furqan 25:45' }, { word: 'ظبي', transliteration: 'Dhaby', meaning: 'Deer', emoji: '🦌', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'ظُلُمَات', surah: 'Al-Baqarah', meaning: 'Darkness', letterHighlightIndex: [0] }] },
  { id: 18, letter: 'ع', name: 'Ayn', nameAr: 'عين', transliteration: 'ʿ', sound: 'deep throat sound', group: 'throat', color: '#8E44AD', wordCards: [{ word: 'عنب', transliteration: 'Inab', meaning: 'Grapes', emoji: '🍇', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Abasa 80:28" }, { word: 'عصفور', transliteration: 'Usfoor', meaning: 'Sparrow', emoji: '🐦', letterHighlightIndex: [0], position: 'beginning' }, { word: 'عسل', transliteration: 'Asal', meaning: 'Honey', emoji: '🍯', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Muhammad 47:15' }], quranicWords: [{ word: 'عَلِيم', surah: 'Al-Baqarah', meaning: 'All-Knowing', letterHighlightIndex: [0] }] },
  { id: 19, letter: 'غ', name: 'Ghayn', nameAr: 'غين', transliteration: 'gh', sound: 'gh (gargling sound)', group: 'throat', color: '#D35400', wordCards: [{ word: 'غزال', transliteration: 'Ghazal', meaning: 'Gazelle', emoji: '🦌', letterHighlightIndex: [0], position: 'beginning' }, { word: 'غيمة', transliteration: 'Ghayma', meaning: 'Cloud', emoji: '☁️', letterHighlightIndex: [0], position: 'beginning' }, { word: 'غراب', transliteration: 'Ghurab', meaning: 'Crow', emoji: '🐦‍⬛', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-Ma'idah 5:31" }], quranicWords: [{ word: 'غَفُور', surah: 'Al-Baqarah', meaning: 'Forgiving', letterHighlightIndex: [0] }] },
  { id: 20, letter: 'ف', name: 'Fa', nameAr: 'فاء', transliteration: 'f', sound: 'f (like "f" in "fish")', group: 'lips', color: '#16A085', wordCards: [{ word: 'فيل', transliteration: 'Feel', meaning: 'Elephant', emoji: '🐘', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Fil 105:1' }, { word: 'فراشة', transliteration: 'Farasha', meaning: 'Butterfly', emoji: '🦋', letterHighlightIndex: [0], position: 'beginning' }, { word: 'فراولة', transliteration: 'Farawla', meaning: 'Strawberry', emoji: '🍓', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'فَلَق', surah: 'Al-Falaq', meaning: 'Daybreak', letterHighlightIndex: [0] }] },
  { id: 21, letter: 'ق', name: 'Qaf', nameAr: 'قاف', transliteration: 'q', sound: 'q (deep back of throat)', group: 'back-tongue', color: '#C0392B', wordCards: [{ word: 'قطة', transliteration: 'Qitta', meaning: 'Cat', emoji: '🐱', letterHighlightIndex: [0], position: 'beginning' }, { word: 'قمر', transliteration: 'Qamar', meaning: 'Moon', emoji: '🌙', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Qamar 54:1' }, { word: 'قلم', transliteration: 'Qalam', meaning: 'Pen', emoji: '✏️', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Qalam 68:1' }], quranicWords: [{ word: 'قُلْ', surah: 'Al-Ikhlas', meaning: 'Say', letterHighlightIndex: [0] }] },
  { id: 22, letter: 'ك', name: 'Kaf', nameAr: 'كاف', transliteration: 'k', sound: 'k (like "k" in "kite")', group: 'back-tongue', color: '#2ECC71', wordCards: [{ word: 'كلب', transliteration: 'Kalb', meaning: 'Dog', emoji: '🐕', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Kahf 18:18' }, { word: 'كتاب', transliteration: 'Kitaab', meaning: 'Book', emoji: '📖', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Baqarah 2:2' }, { word: 'كرة', transliteration: 'Kura', meaning: 'Ball', emoji: '⚽', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'كَوْثَر', surah: 'Al-Kawthar', meaning: 'Abundance', letterHighlightIndex: [0] }] },
  { id: 23, letter: 'ل', name: 'Lam', nameAr: 'لام', transliteration: 'l', sound: 'l (like "l" in "light")', group: 'tongue-tip', color: '#E74C3C', wordCards: [{ word: 'ليمون', transliteration: 'Laymoon', meaning: 'Lemon', emoji: '🍋', letterHighlightIndex: [0], position: 'beginning' }, { word: 'لعبة', transliteration: 'Luʿba', meaning: 'Toy', emoji: '🧸', letterHighlightIndex: [0], position: 'beginning' }, { word: 'لحم', transliteration: 'Lahm', meaning: 'Meat', emoji: '🥩', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Hujurat 49:12' }], quranicWords: [{ word: 'لَهُ', surah: 'Al-Ikhlas', meaning: 'For Him', letterHighlightIndex: [0] }] },
  { id: 24, letter: 'م', name: 'Meem', nameAr: 'ميم', transliteration: 'm', sound: 'm (like "m" in "moon")', group: 'lips', color: '#9B59B6', wordCards: [{ word: 'موز', transliteration: 'Mawz', meaning: 'Banana', emoji: '🍌', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-Waqi'ah 56:29" }, { word: 'مفتاح', transliteration: 'Miftah', meaning: 'Key', emoji: '🔑', letterHighlightIndex: [0], position: 'beginning', quranicRef: "Al-An'am 6:59" }, { word: 'ماء', transliteration: 'Maa', meaning: 'Water', emoji: '💧', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Anbiya 21:30' }], quranicWords: [{ word: 'مَالِك', surah: 'Al-Fatiha', meaning: 'Master/Owner', letterHighlightIndex: [0] }] },
  { id: 25, letter: 'ن', name: 'Noon', nameAr: 'نون', transliteration: 'n', sound: 'n (like "n" in "noon")', group: 'tongue-tip', color: '#F39C12', wordCards: [{ word: 'نحلة', transliteration: 'Nahla', meaning: 'Bee', emoji: '🐝', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'An-Nahl 16:68' }, { word: 'نجمة', transliteration: 'Najma', meaning: 'Star', emoji: '⭐', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'An-Najm 53:1' }, { word: 'نمر', transliteration: 'Namir', meaning: 'Tiger', emoji: '🐯', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'نَاس', surah: 'An-Nas', meaning: 'Mankind', letterHighlightIndex: [0] }] },
  { id: 26, letter: 'ه', name: 'Ha', nameAr: 'هاء', transliteration: 'h', sound: 'h (like "h" in "hat")', group: 'throat', color: '#1ABC9C', wordCards: [{ word: 'هلال', transliteration: 'Hilal', meaning: 'Crescent', emoji: '🌙', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Baqarah 2:189' }, { word: 'هدية', transliteration: 'Hadiyya', meaning: 'Gift', emoji: '🎁', letterHighlightIndex: [0], position: 'beginning' }, { word: 'هرة', transliteration: 'Hirra', meaning: 'Cat', emoji: '🐈', letterHighlightIndex: [0], position: 'beginning' }], quranicWords: [{ word: 'هُوَ', surah: 'Al-Ikhlas', meaning: 'He (is)', letterHighlightIndex: [0] }] },
  { id: 27, letter: 'و', name: 'Waw', nameAr: 'واو', transliteration: 'w', sound: 'w (like "w" in "water")', group: 'lips', color: '#3498DB', wordCards: [{ word: 'وردة', transliteration: 'Warda', meaning: 'Rose', emoji: '🌹', letterHighlightIndex: [0], position: 'beginning' }, { word: 'وجه', transliteration: 'Wajh', meaning: 'Face', emoji: '😊', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Baqarah 2:272' }, { word: 'ولد', transliteration: 'Walad', meaning: 'Boy', emoji: '👦', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Maryam 19:19' }], quranicWords: [{ word: 'وَالْعَصْر', surah: 'Al-Asr', meaning: 'By time', letterHighlightIndex: [0] }] },
  { id: 28, letter: 'ي', name: 'Ya', nameAr: 'ياء', transliteration: 'y', sound: 'y (like "y" in "yes")', group: 'middle-tongue', color: '#E67E22', wordCards: [{ word: 'يد', transliteration: 'Yad', meaning: 'Hand', emoji: '✋', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'Al-Fath 48:10' }, { word: 'يمامة', transliteration: 'Yamama', meaning: 'Dove', emoji: '🕊️', letterHighlightIndex: [0], position: 'beginning' }, { word: 'يقطين', transliteration: 'Yaqteen', meaning: 'Pumpkin', emoji: '🎃', letterHighlightIndex: [0], position: 'beginning', quranicRef: 'As-Saffat 37:146' }], quranicWords: [{ word: 'يَوْم', surah: 'Al-Fatiha', meaning: 'Day', letterHighlightIndex: [0] }] },
];

/**
 * Helper: Get only "beginning" word cards for a letter.
 * Used in Phase 1 games (DragToMatch, WordCards, etc.)
 */
export function getBeginningWords(letter: ArabicLetter): WordCard[] {
  return letter.wordCards.filter(w => w.position === 'beginning');
}

/**
 * Helper: Get beginning word cards from OTHER letters (for distractors).
 * These are pictures that DON'T start with the current letter.
 */
export function getDistractorPictures(
  currentLetter: ArabicLetter,
  distractorLetters: ArabicLetter[],
  count: number
): WordCard[] {
  const pool: WordCard[] = [];
  for (const dl of distractorLetters) {
    const beginningWords = getBeginningWords(dl);
    pool.push(...beginningWords);
  }
  // Shuffle and return requested count
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Lessons structure
export const lessons: Lesson[] = [
  { id: 1, title: 'First Letters', titleAr: 'الحروف الأولى', description: 'Learn Alif, Ba, Ta', level: 1, type: 'letters', letters: [1, 2, 3, 4, 5], icon: '✨' },
  { id: 2, title: 'More Letters', titleAr: 'حروف أخرى', description: 'Learn Ha, Kha, Dal, Dhal, Ra', level: 1, type: 'letters', letters: [6, 7, 8, 9, 10], unlockAfter: 1, icon: '🌟' },
  { id: 3, title: 'Sun Letters', titleAr: 'الحروف الشمسية', description: 'Learn Zay, Seen, Sheen, Sad, Dad', level: 2, type: 'letters', letters: [11, 12, 13, 14, 15], unlockAfter: 2, icon: '☀️' },
  { id: 4, title: 'Moon Letters', titleAr: 'الحروف القمرية', description: 'Learn Taa, Dhaa, Ayn, Ghayn, Fa', level: 2, type: 'letters', letters: [16, 17, 18, 19, 20], unlockAfter: 3, icon: '🌙' },
  { id: 5, title: 'Final Letters', titleAr: 'الحروف الأخيرة', description: 'Learn Qaf, Kaf, Lam, Meem, Noon, Ha, Waw, Ya', level: 3, type: 'letters', letters: [21, 22, 23, 24, 25, 26, 27, 28], unlockAfter: 4, icon: '🎓' },
  { id: 6, title: 'Practice Words', titleAr: 'تمرين الكلمات', description: 'Read simple Quranic words', level: 4, type: 'practice', unlockAfter: 5, icon: '📖' },
];

// Levels structure
export const levels: Level[] = [
  { id: 1, title: 'Seedling', description: 'Plant the seeds of knowledge', color: '#4CAF50', lessons: [1, 2] },
  { id: 2, title: 'Sprout', description: 'Watch your knowledge grow', color: '#FF9800', lessons: [3, 4] },
  { id: 3, title: 'Blossom', description: 'Your garden is blooming', color: '#9C27B0', lessons: [5] },
  { id: 4, title: 'Harvest', description: 'Reap the fruits of learning', color: '#F44336', lessons: [6] },
];

// Helper: Get letters for a specific lesson
export function getLettersForLesson(lessonId: number): ArabicLetter[] {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson || !lesson.letters) return [];
  return lesson.letters.map(id => arabicLetters.find(l => l.id === id)).filter(Boolean) as ArabicLetter[];
}

// Helper: Check if a lesson is unlocked
export function isLessonUnlocked(lessonId: number, completedLessons: number[]): boolean {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return false;
  if (!lesson.unlockAfter) return true;
  return completedLessons.includes(lesson.unlockAfter);
}

/**
 * PROGRESSIVE DISTRACTOR LOGIC
 * 
 * Returns ONLY letters the child has already learned (completed in previous lessons + 
 * earlier in the current lesson). Never returns letters the child hasn't seen yet.
 */
export function getProgressiveDistractors(
  currentLetter: ArabicLetter,
  lessonId: number,
  letterIndexInLesson: number,
  completedLessons: number[],
  count: number
): ArabicLetter[] {
  const learnedLetters: ArabicLetter[] = [];
  
  // Add letters from all completed lessons
  for (const completedLessonId of completedLessons) {
    const lessonLetters = getLettersForLesson(completedLessonId);
    learnedLetters.push(...lessonLetters);
  }
  
  // Add letters from the current lesson that come BEFORE the current letter
  const currentLessonLetters = getLettersForLesson(lessonId);
  for (let i = 0; i < letterIndexInLesson; i++) {
    if (currentLessonLetters[i] && !learnedLetters.find(l => l.id === currentLessonLetters[i].id)) {
      learnedLetters.push(currentLessonLetters[i]);
    }
  }
  
  // Remove the current letter from the pool
  const pool = learnedLetters.filter(l => l.id !== currentLetter.id);
  
  // Shuffle and return requested count
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Determines if the current letter is the FIRST letter the child is learning.
 * If true, games should NOT use any distractors — only reinforce the single letter.
 */
export function isFirstLetterEver(
  lessonId: number,
  letterIndexInLesson: number,
  completedLessons: number[]
): boolean {
  return lessonId === 1 && letterIndexInLesson === 0 && completedLessons.length === 0;
}

/**
 * Returns the count of previously learned letters available as distractors.
 */
export function getAvailableDistractorCount(
  currentLetter: ArabicLetter,
  lessonId: number,
  letterIndexInLesson: number,
  completedLessons: number[]
): number {
  return getProgressiveDistractors(currentLetter, lessonId, letterIndexInLesson, completedLessons, 100).length;
}

/**
 * SHAPE DISTRACTORS for the very first letter.
 * These are visually distinct common letters used ONLY as visual distractors
 * so the child learns to distinguish shapes. They are NOT being "taught" yet.
 */
export const SHAPE_DISTRACTORS = ['و', 'م', 'ن', 'ل', 'ك', 'ه'];

// Practice words for Level 6
export const practiceWords = [
  { word: 'بِسْمِ', transliteration: 'bismi', meaning: 'In the name of' },
  { word: 'اللَّهِ', transliteration: 'Allahi', meaning: 'Allah (God)' },
  { word: 'كِتَاب', transliteration: 'kitab', meaning: 'Book' },
  { word: 'قَلَم', transliteration: 'qalam', meaning: 'Pen' },
  { word: 'نُور', transliteration: 'noor', meaning: 'Light' },
  { word: 'سَلَام', transliteration: 'salaam', meaning: 'Peace' },
];
