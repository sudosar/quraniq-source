/**
 * Harakat Game - Teach Letter Recitation with Diacritics
 * 
 * Design: Celestial Garden theme
 * 
 * PEDAGOGY:
 * Level 1 (Basic): Fatha, Kasra, Damma
 *   - Teaching: Show the letter with each haraka (بَ = "ba", بِ = "bi", بُ = "bu")
 *   - Quiz: Play sound, child picks correct letter+haraka from 3 options
 * 
 * Level 2 (Advanced): Sukoon + Tanween (fathatain, kasratain, dammatain)
 *   - Teaching: Show sukoon (بْ = no vowel), tanween forms
 *   - Quiz: Same format with advanced diacritics
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
  sound: string;      // Phonetic suffix
  color: string;
  description: string; // Brief explanation for kids
}

const BASIC_HARAKAAT: Haraka[] = [
  { name: 'Fatha', nameAr: 'فَتْحَة', symbol: '\u064E', sound: 'a', color: '#E53E3E', description: 'Opens the mouth — "ah" sound' },
  { name: 'Kasra', nameAr: 'كَسْرَة', symbol: '\u0650', sound: 'i', color: '#2B6CB0', description: 'Lowers the jaw — "ee" sound' },
  { name: 'Damma', nameAr: 'ضَمَّة', symbol: '\u064F', sound: 'u', color: '#38A169', description: 'Rounds the lips — "oo" sound' },
];

const ADVANCED_HARAKAAT: Haraka[] = [
  { name: 'Sukoon', nameAr: 'سُكُون', symbol: '\u0652', sound: '', color: '#6B46C1', description: 'No vowel — letter stops' },
  { name: 'Fathatain', nameAr: 'فَتْحَتَين', symbol: '\u064B', sound: 'an', color: '#D69E2E', description: 'Double fatha — "an" ending' },
  { name: 'Kasratain', nameAr: 'كَسْرَتَين', symbol: '\u064D', sound: 'in', color: '#3182CE', description: 'Double kasra — "in" ending' },
  { name: 'Dammatain', nameAr: 'ضَمَّتَين', symbol: '\u064C', sound: 'un', color: '#2F855A', description: 'Double damma — "un" ending' },
];

interface QuizOption {
  letterWithHaraka: string;
  letterObj: ArabicLetter;
  haraka: Haraka;
  isCorrect: boolean;
}

interface QuizRound {
  target: { letterObj: ArabicLetter; haraka: Haraka; letterWithHaraka: string };
  options: QuizOption[];
  spokenText: string;
}

type GamePhase = 'level-select' | 'teaching' | 'quiz' | 'level-complete';

const QUIZ_ROUNDS = 4;

export default function HarakatGame({ letter, distractorLetters, onComplete }: Props) {
  const [level, setLevel] = useState<'basic' | 'advanced'>('basic');
  const [phase, setPhase] = useState<GamePhase>('teaching'); // Start directly with basic teaching
  const [teachingStep, setTeachingStep] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [teachingAutoPlay, setTeachingAutoPlay] = useState(false);
  const [basicCompleted, setBasicCompleted] = useState(false);

  const currentHarakaat = level === 'basic' ? BASIC_HARAKAAT : ADVANCED_HARAKAAT;

  // Build the letter+haraka display
  const getLetterWithHaraka = (letterChar: string, haraka: Haraka) => {
    return letterChar + haraka.symbol;
  };

  // Get the pronunciation text for speech synthesis
  const getPronunciation = (letterObj: ArabicLetter, haraka: Haraka) => {
    return letterObj.letter + haraka.symbol;
  };

  // Teaching data
  const teachingCards = useMemo(() => {
    return currentHarakaat.map(h => ({
      haraka: h,
      letterWithHaraka: getLetterWithHaraka(letter.letter, h),
      pronunciation: getPronunciation(letter, h),
      transliteration: h.sound 
        ? letter.transliteration.replace(/[aeiou].*$/i, '') + h.sound
        : letter.transliteration.replace(/[aeiou].*$/i, '') + ' (stop)',
    }));
  }, [letter, currentHarakaat]);

  // Build quiz rounds
  const quizRounds = useMemo(() => {
    const rounds: QuizRound[] = [];
    const harakaat = currentHarakaat;
    
    for (let i = 0; i < QUIZ_ROUNDS; i++) {
      const targetHaraka = harakaat[i % harakaat.length];
      
      // For basic: 3 options (same letter, different harakaat)
      // For advanced: 3-4 options depending on available harakaat
      const roundType = (i < harakaat.length || distractorLetters.length === 0) ? 'same-letter' : 'different-letters';
      
      if (roundType === 'same-letter') {
        const targetOption: QuizOption = {
          letterWithHaraka: getLetterWithHaraka(letter.letter, targetHaraka),
          letterObj: letter,
          haraka: targetHaraka,
          isCorrect: true,
        };
        
        const distractorHarakaat = harakaat.filter(h => h.name !== targetHaraka.name);
        const selectedDistractors = shuffleArray(distractorHarakaat).slice(0, 2);
        const distractorOptions: QuizOption[] = selectedDistractors.map(h => ({
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
  }, [letter, distractorLetters, currentHarakaat]);

  const currentQuizRound = quizRounds[currentRound];

  // Teaching phase: auto-play sound
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
    if (teachingStep < currentHarakaat.length - 1) {
      setTeachingStep(prev => prev + 1);
    } else {
      setPhase('quiz');
    }
  }, [teachingStep, currentHarakaat.length]);

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
          if (level === 'basic') {
            // Show level complete, offer advanced
            setTimeout(() => {
              setBasicCompleted(true);
              setPhase('level-complete');
              setShowResult(false);
            }, 1500);
          } else {
            // All done
            setTimeout(() => onComplete(finalScore >= 4 ? 2 : 1), 1500);
          }
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
  }, [selected, currentQuizRound, currentRound, score, onComplete, level]);

  const startAdvancedLevel = useCallback(() => {
    setLevel('advanced');
    setPhase('teaching');
    setTeachingStep(0);
    setTeachingAutoPlay(false);
    setCurrentRound(0);
    setSelected(null);
    setIsCorrect(null);
    setScore(0);
    setShowResult(false);
  }, []);

  const finishAfterBasic = useCallback(() => {
    onComplete(2);
  }, [onComplete]);

  // ============ LEVEL COMPLETE (between basic and advanced) ============
  if (phase === 'level-complete') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <span className="text-6xl block mb-4">🌟</span>
          <h3 className="text-2xl font-bold text-gray-700 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Basic Sounds Mastered!
          </h3>
          <p className="text-gray-500 mb-2">
            You learned Fatha, Kasra & Damma for {letter.name}!
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Ready for advanced sounds? (Sukoon & Tanween)
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <motion.button
              onClick={startAdvancedLevel}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-lg shadow-lg"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              Learn Sukoon & Tanween ✨
            </motion.button>
            
            <motion.button
              onClick={finishAfterBasic}
              className="px-6 py-3 rounded-full bg-gray-100 text-gray-600 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Continue to next game →
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ TEACHING PHASE ============
  if (phase === 'teaching') {
    const card = teachingCards[teachingStep];
    const isAdvanced = level === 'advanced';
    
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-6 relative">
        {/* Level badge */}
        {isAdvanced && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold"
          >
            ⭐ Advanced
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-gray-700 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {isAdvanced ? `Advanced Sounds of ${letter.name}` : `Learn the Sounds of ${letter.name}`}
          </h3>
          <p className="text-sm text-gray-500">
            {isAdvanced ? 'These marks change the ending sound!' : 'Each mark changes how the letter sounds!'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
          {currentHarakaat.map((h, i) => (
            <div
              key={h.name}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
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
            key={`${level}-${teachingStep}`}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm border-2"
            style={{ borderColor: card.haraka.color + '40' }}
          >
            {/* Haraka name */}
            <div className="mb-3">
              <span 
                className="inline-block px-4 py-1 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: card.haraka.color }}
              >
                {card.haraka.name} ({card.haraka.nameAr})
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 mb-3 italic">
              {card.haraka.description}
            </p>

            {/* Letter with haraka — BIG */}
            <motion.div
              className="mb-4"
              animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
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
              className="mt-4 w-16 h-16 rounded-full shadow-lg flex items-center justify-center mx-auto text-white"
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
          className="mt-6 px-8 py-3 rounded-full text-white font-bold text-lg shadow-lg"
          style={{ backgroundColor: card.haraka.color }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          {teachingStep < currentHarakaat.length - 1 ? 'Next Sound →' : "Let's Practice! 🎯"}
        </motion.button>
      </div>
    );
  }

  // ============ QUIZ PHASE ============
  if (!currentQuizRound) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-6 relative">
      {/* Level badge */}
      {level === 'advanced' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold"
        >
          ⭐ Advanced
        </motion.div>
      )}

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

      {/* Options */}
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
              key={`${level}-${currentRound}-${i}`}
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
