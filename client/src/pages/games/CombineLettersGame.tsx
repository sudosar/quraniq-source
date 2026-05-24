/**
 * Combine Letters Game - Blend Letter Sounds Together
 * 
 * Design: Celestial Garden theme
 * 
 * PEDAGOGY:
 * Phase 1 (Teaching): Show two letters combining with harakaat
 *   - e.g., بَ + ا = بَا (baa)
 *   - Animate the letters coming together
 *   - Play each letter sound, then the blended sound
 * 
 * Phase 2 (Quiz): Play a blended sound (e.g., "baa")
 *   - Show 3 options of letter combinations
 *   - Child picks the correct blend
 *   - Only uses letters the child has already learned
 * 
 * Progression:
 *   - Start with simple CV (consonant + vowel) combinations
 *   - Use the current letter + previously learned letters
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

// Simple haraka for blending
interface BlendHaraka {
  name: string;
  symbol: string;
  sound: string;
  color: string;
}

const BLEND_HARAKAAT: BlendHaraka[] = [
  { name: 'Fatha', symbol: '\u064E', sound: 'a', color: '#E53E3E' },
  { name: 'Kasra', symbol: '\u0650', sound: 'i', color: '#2B6CB0' },
  { name: 'Damma', symbol: '\u064F', sound: 'u', color: '#38A169' },
];

// A blend combination: consonant + haraka + optional long vowel
interface BlendCard {
  consonant: ArabicLetter;
  haraka: BlendHaraka;
  longVowel: string | null; // ا for fatha, ي for kasra, و for damma (or null for short)
  display: string;          // The combined Arabic text
  transliteration: string;  // e.g., "baa", "bi", "bu"
  pronunciation: string;    // What to speak
  isLong: boolean;
}

type GamePhase = 'teaching' | 'quiz';

const TEACHING_CARDS = 3;
const QUIZ_ROUNDS = 4;

export default function CombineLettersGame({ letter, distractorLetters, onComplete }: Props) {
  const [phase, setPhase] = useState<GamePhase>('teaching');
  const [teachingStep, setTeachingStep] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showBlend, setShowBlend] = useState(false);
  const [teachingAutoPlay, setTeachingAutoPlay] = useState(false);

  // Long vowels map
  const longVowelMap: Record<string, string> = {
    'a': 'ا',  // Alif for long "aa"
    'i': 'ي',  // Ya for long "ee"
    'u': 'و',  // Waw for long "oo"
  };

  // Build teaching blends: show the current letter with each haraka + long vowel
  const teachingBlends = useMemo((): BlendCard[] => {
    return BLEND_HARAKAAT.map(h => {
      const longV = longVowelMap[h.sound];
      const display = letter.letter + h.symbol + longV;
      const baseSound = letter.transliteration.replace(/[aeiou].*$/i, '');
      
      return {
        consonant: letter,
        haraka: h,
        longVowel: longV,
        display,
        transliteration: baseSound + h.sound + h.sound, // e.g., "baa"
        pronunciation: display,
        isLong: true,
      };
    });
  }, [letter]);

  // Build quiz rounds
  const quizRounds = useMemo(() => {
    const rounds: { target: BlendCard; options: (BlendCard & { isCorrect: boolean })[] }[] = [];
    
    // Available consonants: current letter + distractors
    const availableLetters = [letter, ...distractorLetters.slice(0, 3)];
    
    for (let i = 0; i < QUIZ_ROUNDS; i++) {
      const targetHaraka = BLEND_HARAKAAT[i % 3];
      const longV = longVowelMap[targetHaraka.sound];
      const baseSound = letter.transliteration.replace(/[aeiou].*$/i, '');
      
      const target: BlendCard = {
        consonant: letter,
        haraka: targetHaraka,
        longVowel: longV,
        display: letter.letter + targetHaraka.symbol + longV,
        transliteration: baseSound + targetHaraka.sound + targetHaraka.sound,
        pronunciation: letter.letter + targetHaraka.symbol + longV,
        isLong: true,
      };

      // Generate distractors
      let distractors: (BlendCard & { isCorrect: boolean })[] = [];
      
      if (distractorLetters.length >= 2) {
        // Use different letters with the same haraka
        const otherLetters = shuffleArray(distractorLetters).slice(0, 2);
        distractors = otherLetters.map(d => {
          const dBase = d.transliteration.replace(/[aeiou].*$/i, '');
          return {
            consonant: d,
            haraka: targetHaraka,
            longVowel: longV,
            display: d.letter + targetHaraka.symbol + longV,
            transliteration: dBase + targetHaraka.sound + targetHaraka.sound,
            pronunciation: d.letter + targetHaraka.symbol + longV,
            isLong: true,
            isCorrect: false,
          };
        });
      } else {
        // Use same letter with different harakaat
        const otherHarakaat = shuffleArray(BLEND_HARAKAAT.filter(h => h.name !== targetHaraka.name)).slice(0, 2);
        distractors = otherHarakaat.map(h => {
          const lv = longVowelMap[h.sound];
          return {
            consonant: letter,
            haraka: h,
            longVowel: lv,
            display: letter.letter + h.symbol + lv,
            transliteration: baseSound + h.sound + h.sound,
            pronunciation: letter.letter + h.symbol + lv,
            isLong: true,
            isCorrect: false,
          };
        });
      }

      rounds.push({
        target,
        options: shuffleArray([{ ...target, isCorrect: true }, ...distractors]),
      });
    }
    
    return rounds;
  }, [letter, distractorLetters]);

  const currentQuizRound = quizRounds[currentRound];

  // Teaching auto-play
  useEffect(() => {
    if (phase === 'teaching' && teachingAutoPlay) {
      const timer = setTimeout(() => {
        speakArabicIfAllowed(teachingBlends[teachingStep].pronunciation, 0.5);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, teachingStep, teachingAutoPlay, teachingBlends]);

  // Quiz auto-play
  useEffect(() => {
    if (phase === 'quiz' && currentQuizRound && !showResult && selected === null) {
      const timer = setTimeout(() => {
        speakArabicIfAllowed(currentQuizRound.target.pronunciation, 0.5);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, currentRound, currentQuizRound, showResult, selected]);

  // Blend animation trigger
  useEffect(() => {
    if (phase === 'teaching') {
      setShowBlend(false);
      const timer = setTimeout(() => setShowBlend(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, teachingStep]);

  const playBlendSound = useCallback((blend: BlendCard) => {
    setIsSpeaking(true);
    speakArabic(blend.pronunciation, 0.5);
    setTimeout(() => setIsSpeaking(false), 1500);
  }, []);

  const playQuizSound = useCallback(() => {
    if (!currentQuizRound) return;
    setIsSpeaking(true);
    speakArabic(currentQuizRound.target.pronunciation, 0.5);
    setTimeout(() => setIsSpeaking(false), 1500);
  }, [currentQuizRound]);

  const handleTeachingNext = useCallback(() => {
    setTeachingAutoPlay(true);
    if (teachingStep < TEACHING_CARDS - 1) {
      setTeachingStep(prev => prev + 1);
    } else {
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
    const blend = teachingBlends[teachingStep];
    
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-6 relative">
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-gray-700 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Combine Letters!
          </h3>
          <p className="text-sm text-gray-500">
            Watch how letters blend together to make sounds
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {teachingBlends.map((b, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i === teachingStep ? 'w-4 h-4' : ''
              }`}
              style={{ 
                backgroundColor: i === teachingStep ? b.haraka.color : i < teachingStep ? '#10B981' : '#e5e7eb'
              }}
            />
          ))}
        </div>

        {/* Blend animation card */}
        <motion.div
          className="bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm border-2 relative overflow-hidden"
          style={{ borderColor: blend.haraka.color + '40' }}
        >
          {/* Haraka badge */}
          <div className="mb-4">
            <span 
              className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: blend.haraka.color }}
            >
              {blend.haraka.name} + Long Vowel
            </span>
          </div>

          {/* Letter combination animation */}
          <div className="flex items-center justify-center gap-2 mb-4" style={{ minHeight: '6rem' }}>
            {!showBlend ? (
              <>
                {/* Separate letters */}
                <motion.span
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="arabic-text font-bold"
                  style={{ 
                    fontSize: '3.5rem', 
                    color: blend.haraka.color,
                    fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                  }}
                >
                  {blend.consonant.letter + blend.haraka.symbol}
                </motion.span>
                
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl text-gray-400 font-bold"
                >
                  +
                </motion.span>
                
                <motion.span
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="arabic-text font-bold"
                  style={{ 
                    fontSize: '3.5rem', 
                    color: '#666',
                    fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                  }}
                >
                  {blend.longVowel}
                </motion.span>
              </>
            ) : (
              <>
                {/* Combined result */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <motion.span
                    className="arabic-text font-bold block"
                    style={{ 
                      fontSize: '5rem', 
                      lineHeight: 1.3,
                      color: blend.haraka.color,
                      fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                    }}
                    animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.4, repeat: isSpeaking ? 2 : 0 }}
                  >
                    {blend.display}
                  </motion.span>
                </motion.div>
              </>
            )}
          </div>

          {/* = sign and transliteration */}
          <AnimatePresence>
            {showBlend && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-2xl font-bold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                  = "{blend.transliteration}"
                </p>
                
                {/* Sound button */}
                <motion.button
                  onClick={() => playBlendSound(blend)}
                  className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center mx-auto"
                  style={{ backgroundColor: blend.haraka.color }}
                  whileTap={{ scale: 0.9 }}
                  animate={isSpeaking ? { scale: [1, 1.15, 1] } : {}}
                  transition={isSpeaking ? { duration: 0.3, repeat: 3 } : {}}
                >
                  <span className="text-2xl">🔊</span>
                </motion.button>
                <p className="text-xs text-gray-400 mt-2">Tap to hear the blend</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Next button */}
        <motion.button
          onClick={handleTeachingNext}
          className="mt-6 px-8 py-3 rounded-full text-white font-bold text-lg shadow-lg"
          style={{ backgroundColor: blend.haraka.color }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          {teachingStep < TEACHING_CARDS - 1 ? 'Next Blend →' : "Let's Practice! 🎯"}
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
        Which letters make this sound?
      </h3>
      <p className="text-sm text-gray-500 mb-5 text-center">
        Listen and find the matching blend!
      </p>
      
      {/* Speaker button */}
      <motion.button
        onClick={playQuizSound}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-xl flex items-center justify-center mx-auto mb-2"
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
              {/* Combined letters */}
              <span 
                className="arabic-text font-bold block mb-1"
                style={{ 
                  fontSize: '2.5rem', 
                  lineHeight: 1.4,
                  color: option.haraka.color,
                  fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                }}
              >
                {option.display}
              </span>
              
              {/* Transliteration hint */}
              <span className="text-xs text-gray-500 font-medium">
                {option.transliteration}
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
                {score >= 3 ? 'Great blending!' : "Let's try again!"}
              </p>
              <p className="text-gray-500 mt-1">{score}/{QUIZ_ROUNDS} correct</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
