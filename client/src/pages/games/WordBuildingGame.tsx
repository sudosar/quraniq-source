/**
 * WordBuildingGame - Build Quranic words from syllable blends
 * 
 * Shows how 3-4 syllable blends combine to form complete Quranic words.
 * E.g., بِسْمِ = بِ + سْ + مِ
 * 
 * Phase 1: Teaching — animate syllables coming together
 * Phase 2: Quiz — given a word, pick the correct syllable sequence
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speakArabic, playCorrectSound, playWrongSound, playCelebrationSound, shuffleArray } from '@/lib/gameEngine';
import type { ArabicLetter } from '@/lib/curriculum';

interface WordBuildingGameProps {
  letter: ArabicLetter;
  allLetters: ArabicLetter[];
  lessonLetters: ArabicLetter[];
  distractorLetters: ArabicLetter[];
  distractorCount: number;
  onComplete: (stars: number) => void;
  onSkip: () => void;
}

// Quranic words broken into syllables for each letter
// Each entry: { word, syllables (with harakat), translitSyllables, meaning, surah }
interface BuildableWord {
  word: string;
  syllables: string[];
  translitSyllables: string[];
  meaning: string;
  surah: string;
}

// Pre-defined Quranic words broken into syllables for each letter
const quranicBuildWords: Record<number, BuildableWord[]> = {
  // Alif
  1: [
    { word: 'ٱلْحَمْدُ', syllables: ['ٱلْ', 'حَمْ', 'دُ'], translitSyllables: ['al', 'ham', 'du'], meaning: 'All praise', surah: 'Al-Fatiha 1:2' },
    { word: 'أَحَدٌ', syllables: ['أَ', 'حَ', 'دٌ'], translitSyllables: ['a', 'ha', 'dun'], meaning: 'One', surah: 'Al-Ikhlas 112:1' },
    { word: 'أَعُوذُ', syllables: ['أَ', 'عُو', 'ذُ'], translitSyllables: ['a', 'oo', 'dhu'], meaning: 'I seek refuge', surah: 'Al-Falaq 113:1' },
  ],
  // Ba
  2: [
    { word: 'بِسْمِ', syllables: ['بِ', 'سْ', 'مِ'], translitSyllables: ['bi', 's', 'mi'], meaning: 'In the name of', surah: 'Al-Fatiha 1:1' },
    { word: 'بَصِيرٌ', syllables: ['بَ', 'صِي', 'رٌ'], translitSyllables: ['ba', 'see', 'run'], meaning: 'All-Seeing', surah: 'Al-Baqarah 2:96' },
    { word: 'بَرَكَاتٌ', syllables: ['بَ', 'رَ', 'كَا', 'تٌ'], translitSyllables: ['ba', 'ra', 'kaa', 'tun'], meaning: 'Blessings', surah: 'Hud 11:73' },
  ],
  // Ta
  3: [
    { word: 'تَبَارَكَ', syllables: ['تَ', 'بَا', 'رَ', 'كَ'], translitSyllables: ['ta', 'baa', 'ra', 'ka'], meaning: 'Blessed is', surah: 'Al-Mulk 67:1' },
    { word: 'تَوَّابٌ', syllables: ['تَوْ', 'وَا', 'بٌ'], translitSyllables: ['taw', 'waa', 'bun'], meaning: 'Accepting repentance', surah: 'Al-Baqarah 2:37' },
    { word: 'تَعْبُدُ', syllables: ['تَعْ', 'بُ', 'دُ'], translitSyllables: ['ta', 'bu', 'du'], meaning: 'You worship', surah: 'Al-Fatiha 1:5' },
  ],
  // Tha
  4: [
    { word: 'ثَمَرَاتٍ', syllables: ['ثَ', 'مَ', 'رَا', 'تٍ'], translitSyllables: ['tha', 'ma', 'raa', 'tin'], meaning: 'Fruits', surah: 'Al-Baqarah 2:22' },
    { word: 'ثَلَاثَةٍ', syllables: ['ثَ', 'لَا', 'ثَ', 'ةٍ'], translitSyllables: ['tha', 'laa', 'tha', 'tin'], meaning: 'Three', surah: 'Al-Kahf 18:22' },
  ],
  // Jim
  5: [
    { word: 'جَنَّاتٍ', syllables: ['جَنْ', 'نَا', 'تٍ'], translitSyllables: ['jan', 'naa', 'tin'], meaning: 'Gardens', surah: 'Al-Baqarah 2:25' },
    { word: 'جَمِيعًا', syllables: ['جَ', 'مِي', 'عًا'], translitSyllables: ['ja', 'mee', 'an'], meaning: 'All together', surah: 'Al-Baqarah 2:29' },
  ],
  // Ha
  6: [
    { word: 'حَكِيمٌ', syllables: ['حَ', 'كِي', 'مٌ'], translitSyllables: ['ha', 'kee', 'mun'], meaning: 'All-Wise', surah: 'Al-Baqarah 2:32' },
    { word: 'حَسَنَةً', syllables: ['حَ', 'سَ', 'نَ', 'ةً'], translitSyllables: ['ha', 'sa', 'na', 'tan'], meaning: 'Good deed', surah: 'Al-Baqarah 2:201' },
  ],
  // Kha
  7: [
    { word: 'خَلَقَ', syllables: ['خَ', 'لَ', 'قَ'], translitSyllables: ['kha', 'la', 'qa'], meaning: 'He created', surah: 'Al-Alaq 96:1' },
    { word: 'خَبِيرٌ', syllables: ['خَ', 'بِي', 'رٌ'], translitSyllables: ['kha', 'bee', 'run'], meaning: 'All-Aware', surah: 'Al-Baqarah 2:234' },
  ],
  // Dal
  8: [
    { word: 'دَرَجَاتٍ', syllables: ['دَ', 'رَ', 'جَا', 'تٍ'], translitSyllables: ['da', 'ra', 'jaa', 'tin'], meaning: 'Degrees', surah: 'Al-Baqarah 2:253' },
  ],
  // Dhal
  9: [
    { word: 'ذَلِكَ', syllables: ['ذَ', 'لِ', 'كَ'], translitSyllables: ['dha', 'li', 'ka'], meaning: 'That', surah: 'Al-Baqarah 2:2' },
  ],
  // Ra
  10: [
    { word: 'رَحْمَنِ', syllables: ['رَحْ', 'مَ', 'نِ'], translitSyllables: ['rah', 'ma', 'ni'], meaning: 'Most Merciful', surah: 'Al-Fatiha 1:3' },
    { word: 'رَبِّ', syllables: ['رَبْ', 'بِ'], translitSyllables: ['rab', 'bi'], meaning: 'Lord of', surah: 'Al-Fatiha 1:2' },
  ],
  // Zay
  11: [
    { word: 'زَكَاةَ', syllables: ['زَ', 'كَا', 'ةَ'], translitSyllables: ['za', 'kaa', 'ta'], meaning: 'Charity', surah: 'Al-Baqarah 2:43' },
  ],
  // Sin
  12: [
    { word: 'سَمِيعٌ', syllables: ['سَ', 'مِي', 'عٌ'], translitSyllables: ['sa', 'mee', 'un'], meaning: 'All-Hearing', surah: 'Al-Baqarah 2:127' },
    { word: 'سَلَامٌ', syllables: ['سَ', 'لَا', 'مٌ'], translitSyllables: ['sa', 'laa', 'mun'], meaning: 'Peace', surah: 'Ya-Sin 36:58' },
  ],
  // Shin
  13: [
    { word: 'شَهِيدٌ', syllables: ['شَ', 'هِي', 'دٌ'], translitSyllables: ['sha', 'hee', 'dun'], meaning: 'Witness', surah: 'Al-Baqarah 2:143' },
  ],
  // Sad
  14: [
    { word: 'صَلَاةَ', syllables: ['صَ', 'لَا', 'ةَ'], translitSyllables: ['sa', 'laa', 'ta'], meaning: 'Prayer', surah: 'Al-Baqarah 2:43' },
    { word: 'صِرَاطَ', syllables: ['صِ', 'رَا', 'طَ'], translitSyllables: ['si', 'raa', 'ta'], meaning: 'Path', surah: 'Al-Fatiha 1:6' },
  ],
  // Dad
  15: [
    { word: 'ضَلَالَةٍ', syllables: ['ضَ', 'لَا', 'لَ', 'ةٍ'], translitSyllables: ['da', 'laa', 'la', 'tin'], meaning: 'Misguidance', surah: 'Al-Baqarah 2:16' },
  ],
  // Taa
  16: [
    { word: 'طَيِّبَاتِ', syllables: ['طَيْ', 'يِ', 'بَا', 'تِ'], translitSyllables: ['tay', 'yi', 'baa', 'ti'], meaning: 'Good things', surah: 'Al-Baqarah 2:57' },
  ],
  // Dhaa
  17: [
    { word: 'ظُلُمَاتٍ', syllables: ['ظُ', 'لُ', 'مَا', 'تٍ'], translitSyllables: ['dhu', 'lu', 'maa', 'tin'], meaning: 'Darkness', surah: 'Al-Baqarah 2:17' },
  ],
  // Ain
  18: [
    { word: 'عَلِيمٌ', syllables: ['عَ', 'لِي', 'مٌ'], translitSyllables: ['a', 'lee', 'mun'], meaning: 'All-Knowing', surah: 'Al-Baqarah 2:29' },
    { word: 'عَظِيمٌ', syllables: ['عَ', 'ظِي', 'مٌ'], translitSyllables: ['a', 'dhee', 'mun'], meaning: 'Great', surah: 'Al-Baqarah 2:7' },
  ],
  // Ghain
  19: [
    { word: 'غَفُورٌ', syllables: ['غَ', 'فُو', 'رٌ'], translitSyllables: ['gha', 'foo', 'run'], meaning: 'Most Forgiving', surah: 'Al-Baqarah 2:173' },
  ],
  // Fa
  20: [
    { word: 'فَضْلٍ', syllables: ['فَضْ', 'لٍ'], translitSyllables: ['fad', 'lin'], meaning: 'Bounty', surah: 'Al-Baqarah 2:64' },
  ],
  // Qaf
  21: [
    { word: 'قَدِيرٌ', syllables: ['قَ', 'دِي', 'رٌ'], translitSyllables: ['qa', 'dee', 'run'], meaning: 'All-Powerful', surah: 'Al-Baqarah 2:20' },
    { word: 'قُرْآنَ', syllables: ['قُرْ', 'آ', 'نَ'], translitSyllables: ['qur', 'aa', 'na'], meaning: 'Quran', surah: 'Al-Baqarah 2:185' },
  ],
  // Kaf
  22: [
    { word: 'كَبِيرٌ', syllables: ['كَ', 'بِي', 'رٌ'], translitSyllables: ['ka', 'bee', 'run'], meaning: 'Great', surah: 'Al-Baqarah 2:217' },
    { word: 'كِتَابَ', syllables: ['كِ', 'تَا', 'بَ'], translitSyllables: ['ki', 'taa', 'ba'], meaning: 'Book', surah: 'Al-Baqarah 2:2' },
  ],
  // Lam
  23: [
    { word: 'لَطِيفٌ', syllables: ['لَ', 'طِي', 'فٌ'], translitSyllables: ['la', 'tee', 'fun'], meaning: 'Subtle/Kind', surah: 'Al-Mulk 67:14' },
  ],
  // Mim
  24: [
    { word: 'مُسْلِمٌ', syllables: ['مُسْ', 'لِ', 'مٌ'], translitSyllables: ['mus', 'li', 'mun'], meaning: 'Muslim', surah: 'Al-Baqarah 2:128' },
    { word: 'مَلَائِكَةَ', syllables: ['مَ', 'لَا', 'ئِ', 'كَ', 'ةَ'], translitSyllables: ['ma', 'laa', 'i', 'ka', 'ta'], meaning: 'Angels', surah: 'Al-Baqarah 2:30' },
  ],
  // Nun
  25: [
    { word: 'نَصِيرٌ', syllables: ['نَ', 'صِي', 'رٌ'], translitSyllables: ['na', 'see', 'run'], meaning: 'Helper', surah: 'Al-Baqarah 2:107' },
    { word: 'نِعْمَةَ', syllables: ['نِعْ', 'مَ', 'ةَ'], translitSyllables: ['ni', 'ma', 'ta'], meaning: 'Blessing', surah: 'Al-Baqarah 2:211' },
  ],
  // Ha (light)
  26: [
    { word: 'هُدًى', syllables: ['هُ', 'دًى'], translitSyllables: ['hu', 'dan'], meaning: 'Guidance', surah: 'Al-Baqarah 2:2' },
  ],
  // Waw
  27: [
    { word: 'وَاسِعٌ', syllables: ['وَا', 'سِ', 'عٌ'], translitSyllables: ['waa', 'si', 'un'], meaning: 'All-Encompassing', surah: 'Al-Baqarah 2:115' },
  ],
  // Ya
  28: [
    { word: 'يَقِينٌ', syllables: ['يَ', 'قِي', 'نٌ'], translitSyllables: ['ya', 'qee', 'nun'], meaning: 'Certainty', surah: 'Al-Baqarah 2:4' },
  ],
};

export default function WordBuildingGame({ letter, onComplete, onSkip }: WordBuildingGameProps) {
  const [phase, setPhase] = useState<'teach' | 'quiz' | 'complete'>('teach');
  const [wordIndex, setWordIndex] = useState(0);
  const [animStep, setAnimStep] = useState(0); // 0 = show syllables separate, 1+ = animate combining
  const [quizRound, setQuizRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const totalQuizRounds = 3;

  // Get buildable words for this letter
  const buildWords = useMemo(() => {
    return quranicBuildWords[letter.id] || [
      // Fallback: create a simple word from the letter's quranic words
      {
        word: letter.quranicWords[0]?.word || letter.letter,
        syllables: [letter.letter + 'َ'],
        translitSyllables: [letter.transliteration + 'a'],
        meaning: letter.quranicWords[0]?.meaning || letter.name,
        surah: letter.quranicWords[0]?.surah || 'Quran',
      }
    ];
  }, [letter]);

  const currentWord = buildWords[wordIndex % buildWords.length];

  // Teaching phase: animate syllables combining
  useEffect(() => {
    if (phase !== 'teach') return;
    setAnimStep(0);
    const timer = setTimeout(() => setAnimStep(1), 1500);
    return () => clearTimeout(timer);
  }, [wordIndex, phase]);

  const handleNextWord = useCallback(() => {
    if (wordIndex < buildWords.length - 1) {
      setWordIndex(prev => prev + 1);
      setAnimStep(0);
    } else {
      setPhase('quiz');
      setQuizRound(0);
      setScore(0);
    }
  }, [wordIndex, buildWords.length]);

  // Quiz: generate options (correct syllable sequence + 2 wrong ones)
  const quizOptions = useMemo(() => {
    if (phase !== 'quiz') return [];
    const correctWord = buildWords[quizRound % buildWords.length];
    
    // Generate wrong options by shuffling syllables or using other words
    const wrongOptions: BuildableWord[] = [];
    
    // Option 1: shuffle the syllables of the correct word
    const shuffledSyllables = [...correctWord.syllables];
    // Ensure it's actually different
    for (let attempt = 0; attempt < 10; attempt++) {
      const shuffled = shuffleArray([...correctWord.syllables]);
      if (shuffled.join('') !== correctWord.syllables.join('')) {
        wrongOptions.push({
          ...correctWord,
          syllables: shuffled,
          translitSyllables: shuffleArray([...correctWord.translitSyllables]),
        });
        break;
      }
    }
    if (wrongOptions.length === 0) {
      // If can't shuffle differently, reverse
      wrongOptions.push({
        ...correctWord,
        syllables: [...correctWord.syllables].reverse(),
        translitSyllables: [...correctWord.translitSyllables].reverse(),
      });
    }
    
    // Option 2: use syllables from a different word
    const otherWords = buildWords.filter((_, i) => i !== quizRound % buildWords.length);
    if (otherWords.length > 0) {
      const otherWord = otherWords[Math.floor(Math.random() * otherWords.length)];
      wrongOptions.push(otherWord);
    } else {
      // Reverse the correct word's syllables
      wrongOptions.push({
        ...correctWord,
        syllables: [...correctWord.syllables].reverse(),
        translitSyllables: [...correctWord.translitSyllables].reverse(),
      });
    }
    
    // Combine correct + wrong and shuffle
    const options = [correctWord, ...wrongOptions.slice(0, 2)];
    return shuffleArray(options);
  }, [phase, quizRound, buildWords]);

  const currentQuizWord = buildWords[quizRound % buildWords.length];

  const handleQuizAnswer = useCallback((optionIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    
    const selected = quizOptions[optionIndex];
    const correct = selected.syllables.join('') === currentQuizWord.syllables.join('');
    setIsCorrect(correct);
    
    if (correct) {
      playCorrectSound();
      setScore(prev => prev + 1);
    } else {
      playWrongSound();
    }
    
    // Advance after delay
    setTimeout(() => {
      if (quizRound < totalQuizRounds - 1) {
        setQuizRound(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setPhase('complete');
        playCelebrationSound();
      }
    }, 1500);
  }, [selectedAnswer, quizOptions, currentQuizWord, quizRound, totalQuizRounds]);

  const handleSpeakWord = useCallback(() => {
    speakArabic(currentWord.word, 0.7);
  }, [currentWord]);

  const handleSpeakSyllable = useCallback((syllable: string) => {
    speakArabic(syllable, 0.6);
  }, []);

  // Complete screen
  if (phase === 'complete') {
    const moons = score >= 3 ? 3 : score >= 2 ? 2 : 1;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        >
          <div className="text-5xl mb-4">
            {Array.from({ length: moons }).map((_, i) => (
              <span key={i}>🌙</span>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Word Builder!</h2>
          <p className="text-gray-600 mb-2">You built {score}/{totalQuizRounds} words correctly!</p>
          <p className="text-sm text-gray-500 mb-6">You're learning to read Quranic words!</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onComplete(moons)}
            className="px-8 py-3 rounded-full text-white font-bold text-lg shadow-lg"
            style={{ backgroundColor: letter.color }}
          >
            Continue →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Quiz phase
  if (phase === 'quiz') {
    return (
      <div className="flex flex-col items-center p-4 min-h-[60vh]">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Build the Word!</h2>
        <p className="text-sm text-gray-500 mb-4">Which syllables make this word?</p>
        
        {/* Progress dots */}
        <div className="flex gap-2 mb-4">
          {Array.from({ length: totalQuizRounds }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                backgroundColor: i < quizRound ? letter.color : i === quizRound ? letter.color : '#e5e7eb',
                opacity: i < quizRound ? 0.5 : 1,
              }}
            />
          ))}
        </div>

        {/* Target word */}
        <motion.div
          key={quizRound}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-6 mb-6 text-center border-2"
          style={{ borderColor: letter.color + '40' }}
        >
          <p className="text-4xl font-bold mb-2" style={{ fontFamily: 'Amiri, serif', direction: 'rtl' }}>
            {currentQuizWord.word}
          </p>
          <p className="text-sm text-gray-500">"{currentQuizWord.meaning}"</p>
          <p className="text-xs text-gray-400 mt-1">📖 {currentQuizWord.surah}</p>
          <button
            onClick={() => speakArabic(currentQuizWord.word, 0.7)}
            className="mt-2 text-2xl hover:scale-110 transition-transform"
          >
            🔊
          </button>
        </motion.div>

        {/* Options */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {quizOptions.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isThisCorrect = option.syllables.join('') === currentQuizWord.syllables.join('');
            let bgColor = 'bg-white';
            let borderColor = '#e5e7eb';
            
            if (selectedAnswer !== null) {
              if (isThisCorrect) {
                bgColor = 'bg-green-50';
                borderColor = '#22c55e';
              } else if (isSelected && !isCorrect) {
                bgColor = 'bg-red-50';
                borderColor = '#ef4444';
              }
            }
            
            return (
              <motion.button
                key={idx}
                whileTap={selectedAnswer === null ? { scale: 0.97 } : {}}
                onClick={() => handleQuizAnswer(idx)}
                className={`${bgColor} rounded-xl p-4 border-2 transition-all text-center`}
                style={{ borderColor, direction: 'rtl' }}
                disabled={selectedAnswer !== null}
              >
                <div className="flex items-center justify-center gap-2 text-2xl" style={{ fontFamily: 'Amiri, serif' }}>
                  {option.syllables.map((syl, i) => (
                    <span key={i}>
                      {syl}
                      {i < option.syllables.length - 1 && (
                        <span className="text-gray-300 text-lg mx-1">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-400">
                  {option.translitSyllables.map((t, i) => (
                    <span key={i}>
                      {t}
                      {i < option.translitSyllables.length - 1 && ' + '}
                    </span>
                  ))}
                </div>
                {selectedAnswer !== null && isThisCorrect && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-block mt-1 text-green-600 text-sm font-bold"
                  >
                    ✓ Correct!
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4">Score: {score}/{totalQuizRounds}</p>
      </div>
    );
  }

  // Teaching phase
  return (
    <div className="flex flex-col items-center p-4 min-h-[60vh]">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Build a Word!</h2>
      <p className="text-sm text-gray-500 mb-4">Watch how syllables combine to make a Quranic word</p>
      
      {/* Word progress dots */}
      <div className="flex gap-2 mb-6">
        {buildWords.map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: i <= wordIndex ? letter.color : '#e5e7eb',
              opacity: i < wordIndex ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {/* Teaching card */}
      <motion.div
        key={wordIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm border-2"
        style={{ borderColor: letter.color + '30' }}
      >
        {/* Surah reference */}
        <div className="text-center mb-3">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            📖 {currentWord.surah}
          </span>
        </div>

        {/* Syllables separated */}
        <AnimatePresence mode="wait">
          {animStep === 0 ? (
            <motion.div
              key="separated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 mb-4 flex-wrap"
              style={{ direction: 'rtl' }}
            >
              {currentWord.syllables.map((syl, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.3 }}
                  onClick={() => handleSpeakSyllable(syl)}
                  className="bg-gray-50 border-2 rounded-xl px-4 py-3 text-3xl hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: 'Amiri, serif', borderColor: letter.color + '60' }}
                >
                  {syl}
                  <div className="text-xs text-gray-400 mt-1">{currentWord.translitSyllables[i]}</div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="combined"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-4"
            >
              {/* Combined word */}
              <motion.p
                className="text-5xl font-bold mb-2"
                style={{ fontFamily: 'Amiri, serif', color: letter.color, direction: 'rtl' }}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {currentWord.word}
              </motion.p>
              
              {/* Syllable breakdown below */}
              <div className="flex items-center justify-center gap-1 text-lg text-gray-500" style={{ direction: 'rtl', fontFamily: 'Amiri, serif' }}>
                {currentWord.syllables.map((syl, i) => (
                  <span key={i}>
                    <span className="text-gray-700">{syl}</span>
                    {i < currentWord.syllables.length - 1 && <span className="text-gray-300 mx-1">+</span>}
                  </span>
                ))}
              </div>
              
              {/* Transliteration */}
              <p className="text-sm text-gray-400 mt-2">
                = "{currentWord.translitSyllables.join('-')}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meaning */}
        <div className="text-center mt-3">
          <p className="text-lg font-semibold text-gray-700">"{currentWord.meaning}"</p>
        </div>

        {/* Hear button */}
        <div className="text-center mt-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeakWord}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md mx-auto"
            style={{ backgroundColor: letter.color + '20' }}
          >
            🔊
          </motion.button>
          <p className="text-xs text-gray-400 mt-1">Tap to hear</p>
        </div>
      </motion.div>

      {/* Next button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleNextWord}
        className="mt-6 px-8 py-3 rounded-full text-white font-bold text-lg shadow-lg"
        style={{ backgroundColor: letter.color }}
      >
        {wordIndex < buildWords.length - 1 ? 'Next Word →' : "Let's Practice! →"}
      </motion.button>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Skip →
      </button>
    </div>
  );
}
