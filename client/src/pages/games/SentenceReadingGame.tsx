/**
 * SentenceReadingGame - Read short Quranic phrases word by word
 * 
 * Shows a short Quranic phrase (ayah or part of ayah).
 * The phrase is read aloud, highlighting each word in sequence.
 * Then the child must tap each word in the correct order (right-to-left).
 * 
 * Pedagogical approach:
 * - Phase 1: Listen & Watch — the phrase is read with word-by-word highlighting
 * - Phase 2: Your Turn — child taps words in correct order as they hear each one
 * - Uses familiar phrases from surahs the child has encountered
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speakArabic, playCorrectSound, playWrongSound, playCelebrationSound } from '@/lib/gameEngine';
import type { ArabicLetter } from '@/lib/curriculum';

interface SentenceReadingGameProps {
  letter: ArabicLetter;
  allLetters: ArabicLetter[];
  lessonLetters: ArabicLetter[];
  distractorLetters: ArabicLetter[];
  distractorCount: number;
  onComplete: (stars: number) => void;
  onSkip: () => void;
}

interface QuranicPhrase {
  words: string[];
  transliteration: string;
  meaning: string;
  surah: string;
  ayah: string;
}

// Short Quranic phrases organized by letter (using phrases that contain the letter)
const quranicPhrases: Record<number, QuranicPhrase[]> = {
  // Alif - Al-Fatiha phrases
  1: [
    {
      words: ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ'],
      transliteration: 'Bismillah ir-Rahman ir-Raheem',
      meaning: 'In the name of Allah, the Most Merciful, the Most Compassionate',
      surah: 'Al-Fatiha',
      ayah: '1:1',
    },
    {
      words: ['ٱلْحَمْدُ', 'لِلَّهِ', 'رَبِّ', 'ٱلْعَـٰلَمِينَ'],
      transliteration: 'Alhamdulillahi Rabbil Aalameen',
      meaning: 'All praise is for Allah, Lord of all worlds',
      surah: 'Al-Fatiha',
      ayah: '1:2',
    },
    {
      words: ['إِيَّاكَ', 'نَعْبُدُ', 'وَإِيَّاكَ', 'نَسْتَعِينُ'],
      transliteration: 'Iyyaka na\'budu wa iyyaka nasta\'een',
      meaning: 'You alone we worship, and You alone we ask for help',
      surah: 'Al-Fatiha',
      ayah: '1:5',
    },
  ],
  // Ba
  2: [
    {
      words: ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ'],
      transliteration: 'Bismillah ir-Rahman ir-Raheem',
      meaning: 'In the name of Allah, the Most Merciful, the Most Compassionate',
      surah: 'Al-Fatiha',
      ayah: '1:1',
    },
    {
      words: ['ذَٰلِكَ', 'ٱلْكِتَـٰبُ', 'لَا', 'رَيْبَ', 'فِيهِ'],
      transliteration: 'Dhalikal kitabu la rayba feeh',
      meaning: 'This is the Book in which there is no doubt',
      surah: 'Al-Baqarah',
      ayah: '2:2',
    },
  ],
  // Ta
  3: [
    {
      words: ['تَبَـٰرَكَ', 'ٱلَّذِى', 'بِيَدِهِ', 'ٱلْمُلْكُ'],
      transliteration: 'Tabarakal-ladhi biyadihil mulk',
      meaning: 'Blessed is He in whose hand is the dominion',
      surah: 'Al-Mulk',
      ayah: '67:1',
    },
  ],
  // Tha
  4: [
    {
      words: ['ٱلْحَمْدُ', 'لِلَّهِ', 'رَبِّ', 'ٱلْعَـٰلَمِينَ'],
      transliteration: 'Alhamdulillahi Rabbil Aalameen',
      meaning: 'All praise is for Allah, Lord of all worlds',
      surah: 'Al-Fatiha',
      ayah: '1:2',
    },
  ],
  // Jim
  5: [
    {
      words: ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ'],
      transliteration: 'Bismillah ir-Rahman ir-Raheem',
      meaning: 'In the name of Allah, the Most Merciful, the Most Compassionate',
      surah: 'Al-Fatiha',
      ayah: '1:1',
    },
  ],
  // Ha
  6: [
    {
      words: ['ٱلْحَمْدُ', 'لِلَّهِ', 'رَبِّ', 'ٱلْعَـٰلَمِينَ'],
      transliteration: 'Alhamdulillahi Rabbil Aalameen',
      meaning: 'All praise is for Allah, Lord of all worlds',
      surah: 'Al-Fatiha',
      ayah: '1:2',
    },
  ],
  // Kha
  7: [
    {
      words: ['خَلَقَ', 'ٱلْإِنسَـٰنَ', 'مِنْ', 'عَلَقٍ'],
      transliteration: 'Khalaqal insana min alaq',
      meaning: 'Created man from a clinging substance',
      surah: 'Al-Alaq',
      ayah: '96:2',
    },
  ],
  // Dal
  8: [
    {
      words: ['ٱهْدِنَا', 'ٱلصِّرَٰطَ', 'ٱلْمُسْتَقِيمَ'],
      transliteration: 'Ihdinas siratal mustaqeem',
      meaning: 'Guide us to the straight path',
      surah: 'Al-Fatiha',
      ayah: '1:6',
    },
  ],
  // Dhal
  9: [
    {
      words: ['ذَٰلِكَ', 'ٱلْكِتَـٰبُ', 'لَا', 'رَيْبَ', 'فِيهِ'],
      transliteration: 'Dhalikal kitabu la rayba feeh',
      meaning: 'This is the Book in which there is no doubt',
      surah: 'Al-Baqarah',
      ayah: '2:2',
    },
  ],
  // Ra
  10: [
    {
      words: ['ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ'],
      transliteration: 'Ar-Rahman ir-Raheem',
      meaning: 'The Most Merciful, the Most Compassionate',
      surah: 'Al-Fatiha',
      ayah: '1:3',
    },
    {
      words: ['رَبِّ', 'ٱلْعَـٰلَمِينَ'],
      transliteration: 'Rabbil Aalameen',
      meaning: 'Lord of all worlds',
      surah: 'Al-Fatiha',
      ayah: '1:2',
    },
  ],
  // Zay
  11: [
    {
      words: ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ'],
      transliteration: 'Bismillah ir-Rahman ir-Raheem',
      meaning: 'In the name of Allah, the Most Merciful, the Most Compassionate',
      surah: 'Al-Fatiha',
      ayah: '1:1',
    },
  ],
  // Sin
  12: [
    {
      words: ['ٱهْدِنَا', 'ٱلصِّرَٰطَ', 'ٱلْمُسْتَقِيمَ'],
      transliteration: 'Ihdinas siratal mustaqeem',
      meaning: 'Guide us to the straight path',
      surah: 'Al-Fatiha',
      ayah: '1:6',
    },
  ],
  // Shin
  13: [
    {
      words: ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ'],
      transliteration: 'Bismillah ir-Rahman ir-Raheem',
      meaning: 'In the name of Allah, the Most Merciful, the Most Compassionate',
      surah: 'Al-Fatiha',
      ayah: '1:1',
    },
  ],
  // Sad
  14: [
    {
      words: ['ٱهْدِنَا', 'ٱلصِّرَٰطَ', 'ٱلْمُسْتَقِيمَ'],
      transliteration: 'Ihdinas siratal mustaqeem',
      meaning: 'Guide us to the straight path',
      surah: 'Al-Fatiha',
      ayah: '1:6',
    },
  ],
  // Dad
  15: [
    {
      words: ['وَلَا', 'ٱلضَّآلِّينَ'],
      transliteration: 'Walad-daalleen',
      meaning: 'Nor of those who went astray',
      surah: 'Al-Fatiha',
      ayah: '1:7',
    },
  ],
  // Taa
  16: [
    {
      words: ['صِرَٰطَ', 'ٱلَّذِينَ', 'أَنْعَمْتَ', 'عَلَيْهِمْ'],
      transliteration: 'Siratal-ladhina an\'amta alayhim',
      meaning: 'The path of those You have blessed',
      surah: 'Al-Fatiha',
      ayah: '1:7',
    },
  ],
  // Dhaa
  17: [
    {
      words: ['وَلَا', 'ٱلضَّآلِّينَ'],
      transliteration: 'Walad-daalleen',
      meaning: 'Nor of those who went astray',
      surah: 'Al-Fatiha',
      ayah: '1:7',
    },
  ],
  // Ain
  18: [
    {
      words: ['إِيَّاكَ', 'نَعْبُدُ', 'وَإِيَّاكَ', 'نَسْتَعِينُ'],
      transliteration: 'Iyyaka na\'budu wa iyyaka nasta\'een',
      meaning: 'You alone we worship, and You alone we ask for help',
      surah: 'Al-Fatiha',
      ayah: '1:5',
    },
  ],
  // Ghain
  19: [
    {
      words: ['غَيْرِ', 'ٱلْمَغْضُوبِ', 'عَلَيْهِمْ'],
      transliteration: 'Ghayril maghdubi alayhim',
      meaning: 'Not of those who earned anger',
      surah: 'Al-Fatiha',
      ayah: '1:7',
    },
  ],
  // Fa
  20: [
    {
      words: ['فَصَلِّ', 'لِرَبِّكَ', 'وَٱنْحَرْ'],
      transliteration: 'Fasalli li-rabbika wanhar',
      meaning: 'So pray to your Lord and sacrifice',
      surah: 'Al-Kawthar',
      ayah: '108:2',
    },
  ],
  // Qaf
  21: [
    {
      words: ['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ'],
      transliteration: 'Qul huwa Allahu ahad',
      meaning: 'Say: He is Allah, the One',
      surah: 'Al-Ikhlas',
      ayah: '112:1',
    },
    {
      words: ['قُلْ', 'أَعُوذُ', 'بِرَبِّ', 'ٱلْفَلَقِ'],
      transliteration: 'Qul a\'udhu bi-rabbil falaq',
      meaning: 'Say: I seek refuge in the Lord of daybreak',
      surah: 'Al-Falaq',
      ayah: '113:1',
    },
  ],
  // Kaf
  22: [
    {
      words: ['إِنَّآ', 'أَعْطَيْنَـٰكَ', 'ٱلْكَوْثَرَ'],
      transliteration: 'Inna a\'taynakal kawthar',
      meaning: 'Indeed, We have granted you abundance',
      surah: 'Al-Kawthar',
      ayah: '108:1',
    },
  ],
  // Lam
  23: [
    {
      words: ['ٱلْحَمْدُ', 'لِلَّهِ', 'رَبِّ', 'ٱلْعَـٰلَمِينَ'],
      transliteration: 'Alhamdulillahi Rabbil Aalameen',
      meaning: 'All praise is for Allah, Lord of all worlds',
      surah: 'Al-Fatiha',
      ayah: '1:2',
    },
    {
      words: ['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ'],
      transliteration: 'Qul huwa Allahu ahad',
      meaning: 'Say: He is Allah, the One',
      surah: 'Al-Ikhlas',
      ayah: '112:1',
    },
  ],
  // Mim
  24: [
    {
      words: ['مَـٰلِكِ', 'يَوْمِ', 'ٱلدِّينِ'],
      transliteration: 'Maliki yawmid-deen',
      meaning: 'Master of the Day of Judgment',
      surah: 'Al-Fatiha',
      ayah: '1:4',
    },
  ],
  // Nun
  25: [
    {
      words: ['إِيَّاكَ', 'نَعْبُدُ', 'وَإِيَّاكَ', 'نَسْتَعِينُ'],
      transliteration: 'Iyyaka na\'budu wa iyyaka nasta\'een',
      meaning: 'You alone we worship, and You alone we ask for help',
      surah: 'Al-Fatiha',
      ayah: '1:5',
    },
  ],
  // Ha (light)
  26: [
    {
      words: ['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ'],
      transliteration: 'Qul huwa Allahu ahad',
      meaning: 'Say: He is Allah, the One',
      surah: 'Al-Ikhlas',
      ayah: '112:1',
    },
  ],
  // Waw
  27: [
    {
      words: ['وَإِيَّاكَ', 'نَسْتَعِينُ'],
      transliteration: 'Wa iyyaka nasta\'een',
      meaning: 'And You alone we ask for help',
      surah: 'Al-Fatiha',
      ayah: '1:5',
    },
    {
      words: ['وَلَمْ', 'يَكُن', 'لَّهُۥ', 'كُفُوًا', 'أَحَدٌ'],
      transliteration: 'Walam yakun lahu kufuwan ahad',
      meaning: 'And there is none comparable to Him',
      surah: 'Al-Ikhlas',
      ayah: '112:4',
    },
  ],
  // Ya
  28: [
    {
      words: ['مَـٰلِكِ', 'يَوْمِ', 'ٱلدِّينِ'],
      transliteration: 'Maliki yawmid-deen',
      meaning: 'Master of the Day of Judgment',
      surah: 'Al-Fatiha',
      ayah: '1:4',
    },
  ],
};

export default function SentenceReadingGame({ letter, onComplete, onSkip }: SentenceReadingGameProps) {
  const [phase, setPhase] = useState<'listen' | 'practice' | 'complete'>('listen');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [highlightedWord, setHighlightedWord] = useState(-1);
  const [nextExpectedWord, setNextExpectedWord] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  // Get phrases for this letter
  const phrases = useMemo(() => {
    return quranicPhrases[letter.id] || quranicPhrases[1]; // fallback to Al-Fatiha
  }, [letter.id]);

  const currentPhrase = phrases[phraseIndex % phrases.length];
  const totalPhrases = Math.min(phrases.length, 2); // max 2 phrases per session

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      playTimeoutRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Auto-play the phrase when entering listen phase
  useEffect(() => {
    if (phase === 'listen') {
      const timer = setTimeout(() => playPhrase(), 800);
      return () => clearTimeout(timer);
    }
  }, [phase, phraseIndex]);

  const playPhrase = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    setHighlightedWord(-1);

    // Clear any existing timeouts
    playTimeoutRef.current.forEach(t => clearTimeout(t));
    playTimeoutRef.current = [];

    // Highlight each word sequentially and speak it
    const wordDelay = 900; // ms between words
    currentPhrase.words.forEach((word, i) => {
      const timeout = setTimeout(() => {
        setHighlightedWord(i);
        speakArabic(word, 0.65);
      }, i * wordDelay);
      playTimeoutRef.current.push(timeout);
    });

    // After all words, reset
    const endTimeout = setTimeout(() => {
      setHighlightedWord(-1);
      setIsPlaying(false);
      setShowMeaning(true);
    }, currentPhrase.words.length * wordDelay + 500);
    playTimeoutRef.current.push(endTimeout);
  }, [currentPhrase, isPlaying]);

  const handleStartPractice = useCallback(() => {
    setPhase('practice');
    setNextExpectedWord(0);
    setShowMeaning(false);
    setHighlightedWord(-1);
  }, []);

  const handleWordTap = useCallback((wordIndex: number) => {
    if (phase !== 'practice') return;

    if (wordIndex === nextExpectedWord) {
      // Correct!
      playCorrectSound();
      setHighlightedWord(wordIndex);
      speakArabic(currentPhrase.words[wordIndex], 0.65);

      if (nextExpectedWord === currentPhrase.words.length - 1) {
        // Completed this phrase!
        setScore(prev => prev + 1);
        setTimeout(() => {
          if (phraseIndex < totalPhrases - 1) {
            // Next phrase
            setPhraseIndex(prev => prev + 1);
            setPhase('listen');
            setNextExpectedWord(0);
            setHighlightedWord(-1);
            setShowMeaning(false);
          } else {
            // All done!
            setPhase('complete');
            playCelebrationSound();
          }
        }, 1200);
      } else {
        setNextExpectedWord(prev => prev + 1);
      }
    } else {
      // Wrong word
      playWrongSound();
      setMistakes(prev => prev + 1);
      setWrongTap(wordIndex);
      setTimeout(() => setWrongTap(null), 600);
    }
  }, [phase, nextExpectedWord, currentPhrase, phraseIndex, totalPhrases]);

  // Complete screen
  if (phase === 'complete') {
    const moons = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quran Reader!</h2>
          <p className="text-gray-600 mb-2">You read {score} Quranic phrase{score > 1 ? 's' : ''} correctly!</p>
          <p className="text-sm text-gray-500 mb-6">
            {mistakes === 0 ? 'Perfect — no mistakes!' : `${mistakes} mistake${mistakes > 1 ? 's' : ''} — keep practicing!`}
          </p>
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

  return (
    <div className="flex flex-col items-center p-4 min-h-[60vh]">
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-800 mb-1">
        {phase === 'listen' ? 'Listen & Watch' : 'Your Turn!'}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {phase === 'listen'
          ? 'Watch each word light up as it\'s read'
          : 'Tap each word in order (right to left) →'}
      </p>

      {/* Phrase progress */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: totalPhrases }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: i <= phraseIndex ? letter.color : '#e5e7eb',
              opacity: i < phraseIndex ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {/* Surah reference */}
      <div className="mb-4">
        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
          📖 {currentPhrase.surah} ({currentPhrase.ayah})
        </span>
      </div>

      {/* Phrase display */}
      <motion.div
        key={phraseIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md border-2"
        style={{ borderColor: letter.color + '30' }}
      >
        {/* Arabic words */}
        <div
          className="flex flex-wrap justify-center gap-3 mb-4"
          style={{ direction: 'rtl' }}
        >
          {currentPhrase.words.map((word, i) => {
            const isHighlighted = highlightedWord === i;
            const isCompleted = phase === 'practice' && i < nextExpectedWord;
            const isNext = phase === 'practice' && i === nextExpectedWord;
            const isWrong = wrongTap === i;

            let bgColor = 'bg-gray-50';
            let borderColor = '#e5e7eb';
            let textColor = '#374151';
            let scale = 1;

            if (isHighlighted || isCompleted) {
              bgColor = 'bg-opacity-20';
              borderColor = letter.color;
              textColor = letter.color;
              scale = isHighlighted ? 1.05 : 1;
            } else if (isWrong) {
              bgColor = 'bg-red-50';
              borderColor = '#ef4444';
              textColor = '#ef4444';
              scale = 0.95;
            } else if (isNext && phase === 'practice') {
              borderColor = letter.color + '60';
            }

            return (
              <motion.button
                key={i}
                animate={{ scale }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => handleWordTap(i)}
                disabled={phase === 'listen'}
                className={`${bgColor} rounded-xl px-4 py-3 border-2 transition-all relative`}
                style={{
                  borderColor,
                  fontFamily: 'Amiri, serif',
                  cursor: phase === 'practice' ? 'pointer' : 'default',
                }}
              >
                <span
                  className="text-2xl sm:text-3xl font-bold"
                  style={{ color: textColor }}
                >
                  {word}
                </span>
                {isCompleted && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ✓
                  </motion.span>
                )}
                {isWrong && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ✗
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Transliteration */}
        <p className="text-center text-sm text-gray-400 italic mb-2">
          {currentPhrase.transliteration}
        </p>

        {/* Meaning (shown after listening) */}
        <AnimatePresence>
          {showMeaning && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-gray-600 font-medium"
            >
              "{currentPhrase.meaning}"
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-col items-center gap-3">
        {phase === 'listen' && (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={playPhrase}
              disabled={isPlaying}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold shadow-md disabled:opacity-50"
              style={{ backgroundColor: letter.color }}
            >
              <span className="text-xl">🔊</span>
              {isPlaying ? 'Listening...' : 'Hear Again'}
            </motion.button>

            {showMeaning && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartPractice}
                className="px-8 py-3 rounded-full bg-green-500 text-white font-bold text-lg shadow-lg"
              >
                Now You Try! →
              </motion.button>
            )}
          </>
        )}

        {phase === 'practice' && (
          <div className="text-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                speakArabic(currentPhrase.words[nextExpectedWord], 0.65);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-full border-2 text-sm font-medium"
              style={{ borderColor: letter.color, color: letter.color }}
            >
              <span>🔊</span> Hear next word
            </motion.button>
            <p className="text-xs text-gray-400 mt-2">
              Word {nextExpectedWord + 1} of {currentPhrase.words.length}
            </p>
          </div>
        )}
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Skip →
      </button>
    </div>
  );
}
