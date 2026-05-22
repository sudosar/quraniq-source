/**
 * Harakat Game - Teach Letter Recitation with Diacritics
 * 
 * Design: Celestial Garden theme
 * 
 * PEDAGOGY:
 * Phase 1 (Teaching): Show the letter with each haraka (fatha, kasra, damma)
 *   - Display: بَ = "ba", بِ = "bi", بُ = "bu"
 *   - Play the sound for each one so child hears the difference
 * 
 * Phase 2 (Quiz): Play a sound (e.g., "baa") and show 3 options
 *   - Options are the SAME letter with different harakaat
 *   - OR different letters (from previously learned) with the same haraka
 *   - Child must identify the correct letter+haraka combination
 * 
 * ONLY uses letters the child has already learned as distractors.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArabicLetter } from '@/lib/curriculum';
import { speakArabic, speakArabicIfAllowed, playCorrectSound, playWrongSound, shuffleArray } from '@/lib/gameEngine';

interface Props {
  letter: ArabicLetter;
  allLetters: ArabicLetter[];
  lessonLetters: ArabicLetter[];
  distractorLetters: ArabicLetter[];
  distractorCount: number;
  onComplete: (stars: number) => void;
  onSkip: () => void;
}

// Haraka types with their Unicode combining characters
interface Haraka {
  name: string;
  nameAr: string;
  symbol: string;     // Unicode combining character
  sound: string;      // Phonetic suffix (a, i, u)
  color: string;
}

const HARAKAAT: Haraka[] = [
  { name: 'Fatha', nameAr: 'فَتْحَة', symbol: '\u064E', sound: 'a', color: '#E53E3E' },   // َ
  { name: 'Kasra', nameAr: 'كَسْرَة', symbol: '\u0650', sound: 'i', color: '#2B6CB0' },   // ِ
  { name: 'Damma', nameAr: 'ضَمَّة', symbol: '\u064F', sound: 'u', color: '#38A169' },    // ُ
];

interface QuizOption {
  letterWithHaraka: string;  // e.g., "بَ"
  letterObj: ArabicLetter;
  haraka: Haraka;
  isCorrect: boolean;
}

interface QuizRound {
  target: { letterObj: ArabicLetter; haraka: Haraka; letterWithHaraka: string };
  options: QuizOption[];
  spokenText: string;  // What to speak aloud
}

type GamePhase = 'teaching' | 'quiz';

const QUIZ_ROUNDS = 4;

export default function HarakatGame({ letter, distractorLetters, onComplete }: Props) {
  const [phase, setPhase] = useState<GamePhase>('teaching');
  const [teachingStep, setTeachingStep] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [teachingAutoPlay, setTeachingAutoPlay] = useState(false);

  // Build the letter+haraka display
  const getLetterWithHaraka = (letterChar: string, haraka: Haraka) => {
    return letterChar + haraka.symbol;
  };

  // Get the pronunciation text for speech synthesis
  const getPronunciation = (letterObj: ArabicLetter, haraka: Haraka) => {
    // Speak the letter with the haraka attached
    return letterObj.letter + haraka.symbol;
  };

  // Teaching data: show current letter with all 3 harakaat
  const teachingCards = useMemo(() => {
    return HARAKAAT.map(h => ({
      haraka: h,
      letterWithHaraka: getLetterWithHaraka(letter.letter, h),
      pronunciation: getPronunciation(letter, h),
      transliteration: letter.transliteration.replace(/[aeiou].*$/i, '') + h.sound,
    }));
  }, [letter]);

  // Build quiz rounds
  const quizRounds = useMemo(() => {
    const rounds: QuizRound[] = [];
    
    for (let i = 0; i < QUIZ_ROUNDS; i++) {
      const targetHaraka = HARAKAAT[i % 3]; // Cycle through fatha, kasra, damma
      
      // Decide round type: same letter different harakaat, or different letters same haraka
      const roundType = i < 3 ? 'same-letter' : 'different-letters';
      
      if (roundType === 'same-letter' || distractorLetters.length === 0) {
        // Show the same letter with 3 different harakaat
        const targetOption: QuizOption = {
          letterWithHaraka: getLetterWithHaraka(letter.letter, targetHaraka),
          letterObj: letter,
          haraka: targetHaraka,
          isCorrect: true,
        };
        
        const distractorHarakaat = HARAKAAT.filter(h => h.name !== targetHaraka.name);
        const distractorOptions: QuizOption[] = distractorHarakaat.map(h => ({
          letterWithHaraka: getLetterWithHaraka(letter.letter, h),
          letterObj: letter,
          haraka: h,
          isCorrect: false,
        }));
        
        rounds.push({
          target: { letterObj: letter, haraka: targetHaraka, letterWithHaraka: getLetterWithHaraka(letter.letter, targetHaraka) },
          options: shuffleArray([targetOption, ...distractorOptions]),
          spokenText: getPronunciation(letter, targetHaraka),
        });
      } else {
        // Show different letters with the same haraka — child must pick the right letter
        const targetOption: QuizOption = {
          letterWithHaraka: getLetterWithHaraka(letter.letter, targetHaraka),
          letterObj: letter,
          haraka: targetHaraka,
          isCorrect: true,
        };
        
        const otherLetters = shuffleArray(distractorLetters).slice(0, 2);
        const distractorOptions: QuizOption[] = otherLetters.map(d => ({
          letterWithHaraka: getLetterWithHaraka(d.letter, targetHaraka),
          letterObj: d,
          haraka: targetHaraka,
          isCorrect: false,
        }));
        
        rounds.push({
          target: { letterObj: letter, haraka: targetHaraka, letterWithHaraka: getLetterWithHaraka(letter.letter, targetHaraka) },
          options: shuffleArray([targetOption, ...distractorOptions]),
          spokenText: getPronunciation(letter, targetHaraka),
        });
      }
    }
    
    return rounds;
  }, [letter, distractorLetters]);

  const currentQuizRound = quizRounds[currentRound];

  // Teaching phase: auto-play sound for each haraka
  useEffect(() => {
    if (phase === 'teaching' && teachingAutoPlay) {
      const timer = setTimeout(() => {
        speakArabicIfAllowed(teachingCards[teachingStep].pronunciation, 0.6);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, teachingStep, teachingAutoPlay, teachingCards]);

  // Quiz phase: auto-play sound for current round
  useEffect(() => {
    if (phase === 'quiz' && currentQuizRound && !showResult && selected === null) {
      const timer = setTimeout(() => {
        speakArabicIfAllowed(currentQuizRound.spokenText, 0.6);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, currentRound, currentQuizRound, showResult, selected]);

  const playTeachingSound = useCallback((idx: number) => {
    setIsSpeaking(true);
    speakArabic(teachingCards[idx].pronunciation, 0.6);
    setTimeout(() => setIsSpeaking(false), 1200);
  }, [teachingCards]);

  const playQuizSound = useCallback(() => {
    if (!currentQuizRound) return;
    setIsSpeaking(true);
    speakArabic(currentQuizRound.spokenText, 0.6);
    setTimeout(() => setIsSpeaking(false), 1200);
  }, [currentQuizRound]);

  const handleTeachingNext = useCallback(() => {
    setTeachingAutoPlay(true);
    if (teachingStep < 2) {
      setTeachingStep(prev => prev + 1);
    } else {
      // Move to quiz phase
      setPhase('quiz');
    }
  }, [teachingStep]);

  const handleQuizSelect = useCallback((optionIndex: number) => {
    if (selected !== null || !currentQuizRound) return;
    
    const option = currentQuizRound.options[optionIndex];
    const correct = option.isCorrect;
    
    setSelected(optionIndex);
    setIsCorrect(correct);
    
    if (correct) {
      playCorrectSound();
      setScore(prev => prev + 1);
    } else {
      playWrongSound();
    }

    setTimeout(() => {
      if (currentRound < QUIZ_ROUNDS - 1) {
        setCurrentRound(prev => prev + 1);
        setSelected(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
        const finalScore = correct ? score + 1 : score;
        if (finalScore >= 3) {
          setTimeout(() => onComplete(finalScore >= 4 ? 2 : 1), 1500);
        } else {
          // Retry
          setTimeout(() => {
            setCurrentRound(0);
            setSelected(null);
            setIsCorrect(null);
            setScore(0);
            setShowResult(false);
          }, 2000);
        }
      }
    }, 1500);
  }, [selected, currentQuizRound, currentRound, score, onComplete]);

  // ============ TEACHING PHASE ============
  if (phase === 'teaching') {
    const card = teachingCards[teachingStep];
    
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-6 relative">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-700 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Learn the Sounds of {letter.name}
          </h3>
          <p className="text-sm text-gray-500">
            Each mark changes how the letter sounds!
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {HARAKAAT.map((h, i) => (
            <div
              key={h.name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                i === teachingStep 
                  ? 'bg-white shadow-lg scale-110 border-2' 
                  : i < teachingStep 
                    ? 'bg-gray-100 opacity-60' 
                    : 'bg-gray-50 opacity-40'
              }`}
              style={{ borderColor: i === teachingStep ? h.color : 'transparent' }}
            >
              <span className="text-xs font-bold" style={{ color: h.color }}>{h.name}</span>
              {i < teachingStep && <span className="text-xs">✓</span>}
            </div>
          ))}
        </div>

        {/* Main teaching card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={teachingStep}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm border-2"
            style={{ borderColor: card.haraka.color + '40' }}
          >
            {/* Haraka name */}
            <div className="mb-4">
              <span 
                className="inline-block px-4 py-1 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: card.haraka.color }}
              >
                {card.haraka.name} ({card.haraka.nameAr})
              </span>
            </div>

            {/* Letter with haraka — BIG */}
            <motion.div
              className="mb-4"
              animate={isSpeaking && teachingStep === teachingStep ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.4, repeat: isSpeaking ? 2 : 0 }}
            >
              <span 
                className="arabic-text font-bold block"
                style={{ 
                  fontSize: '5rem', 
                  lineHeight: 1.4,
                  color: card.haraka.color,
                  fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                }}
              >
                {card.letterWithHaraka}
              </span>
            </motion.div>

            {/* Transliteration */}
            <p className="text-2xl font-bold text-gray-700 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              = "{card.transliteration}"
            </p>

            {/* Sound button */}
            <motion.button
              onClick={() => playTeachingSound(teachingStep)}
              className="mt-4 w-16 h-16 rounded-full shadow-lg flex items-center justify-center mx-auto"
              style={{ backgroundColor: card.haraka.color }}
              whileTap={{ scale: 0.9 }}
              animate={isSpeaking ? { scale: [1, 1.15, 1] } : {}}
              transition={isSpeaking ? { duration: 0.3, repeat: 3 } : {}}
            >
              <span className="text-3xl">🔊</span>
            </motion.button>
            <p className="text-xs text-gray-400 mt-2">Tap to hear</p>
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        <motion.button
          onClick={handleTeachingNext}
          className="mt-8 px-8 py-3 rounded-full text-white font-bold text-lg shadow-lg"
          style={{ backgroundColor: card.haraka.color }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          {teachingStep < 2 ? 'Next Sound →' : "Let's Practice! 🎯"}
        </motion.button>
      </div>
    );
  }

  // ============ QUIZ PHASE ============
  if (!currentQuizRound) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-6 relative">
      {/* Round indicator */}
      <div className="flex items-center gap-2 mb-4">
        {Array.from({ length: QUIZ_ROUNDS }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < currentRound ? 'bg-teal-500' :
              i === currentRound ? 'w-4 h-4 bg-amber-500' :
              'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <h3 className="text-lg font-bold text-gray-700 mb-2 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
        Which one makes this sound?
      </h3>
      <p className="text-sm text-gray-500 mb-5 text-center">
        Listen carefully to the haraka!
      </p>
      
      {/* Speaker button */}
      <motion.button
        onClick={playQuizSound}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-xl flex items-center justify-center mx-auto mb-2"
        whileTap={{ scale: 0.9 }}
        animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
        transition={isSpeaking ? { duration: 0.3, repeat: 3 } : {}}
      >
        <span className="text-3xl">🔊</span>
      </motion.button>
      <p className="text-xs text-gray-400 mb-6">Tap to hear again</p>

      {/* Options — 3 choices */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        {currentQuizRound.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrectOption = option.isCorrect;
          const showFeedback = selected !== null;
          
          let borderColor = '#e5e7eb';
          let bgColor = '#ffffff';
          if (showFeedback && isCorrectOption) { borderColor = '#10B981'; bgColor = '#ECFDF5'; }
          else if (showFeedback && isSelected && !isCorrect) { borderColor = '#EF4444'; bgColor = '#FEF2F2'; }

          return (
            <motion.button
              key={`${currentRound}-${i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: isSelected && !isCorrect ? [0, -6, 6, -6, 6, 0] : 0,
              }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleQuizSelect(i)}
              className="p-4 rounded-2xl shadow-md transition-all relative flex flex-col items-center"
              style={{ 
                border: `3px solid ${borderColor}`,
                backgroundColor: bgColor,
              }}
              whileTap={selected === null ? { scale: 0.93 } : {}}
              disabled={selected !== null}
            >
              {/* Letter with haraka */}
              <span 
                className="arabic-text font-bold block mb-1"
                style={{ 
                  fontSize: '2.8rem', 
                  lineHeight: 1.4,
                  color: option.haraka.color,
                  fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                }}
              >
                {option.letterWithHaraka}
              </span>
              
              {/* Letter name (for different-letter rounds) */}
              {option.letterObj.id !== letter.id && (
                <span className="text-xs text-gray-500 block">{option.letterObj.name}</span>
              )}
              
              {/* Haraka name */}
              <span 
                className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: option.haraka.color + '20', color: option.haraka.color }}
              >
                {option.haraka.name}
              </span>

              {/* Feedback icon */}
              {showFeedback && isSelected && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 text-xl"
                >
                  {isCorrect ? '✅' : '❌'}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Score */}
      <p className="text-sm text-gray-400 mt-5">
        Score: {score}/{QUIZ_ROUNDS}
      </p>

      {/* Result overlay */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20 rounded-3xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
              className="text-center"
            >
              <span className="text-5xl block mb-3">{score >= 3 ? '🎉' : '💪'}</span>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: score >= 3 ? '#0D7377' : '#666' }}>
                {score >= 3 ? 'Great listening!' : "Let's try again!"}
              </p>
              <p className="text-gray-500 mt-1">{score}/{QUIZ_ROUNDS} correct</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
