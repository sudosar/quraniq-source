/**
 * FindInWordGame - Spot the target letter in Quranic words
 * 
 * PEDAGOGY:
 * - Child sees a Quranic word rendered as CONNECTED Arabic text
 * - On hover/touch, the hovered letter grows bigger with a highlight
 *   AND shows its correct positional form (not always isolated)
 * - Child must tap the specific letter they're looking for
 * - After finding the letter, a LETTER FORM GUIDE appears showing
 *   isolated/initial/medial/final forms with the ACTIVE form highlighted
 * - A REPLAY WORD animation highlights each letter sequentially
 *   to teach right-to-left reading flow
 * 
 * TECHNICAL APPROACH:
 * - Inline <span> elements preserve Arabic ligatures
 * - normalizeArabicLetter handles Alif variants for matching
 * - getPositionInWord() determines if a grapheme is initial/medial/final
 * - Letter form guide highlights the specific shape used in the current word
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArabicLetter } from '@/lib/curriculum';
import { getLetterForms, formLabels, arabicLetterForms } from '@/lib/letterForms';
import { speakArabic, speakArabicIfAllowed, playCorrectSound, playWrongSound } from '@/lib/gameEngine';
import LetterTracing from '@/components/LetterTracing';

interface Props {
  letter: ArabicLetter;
  allLetters: ArabicLetter[];
  lessonLetters: ArabicLetter[];
  distractorLetters: ArabicLetter[];
  distractorCount: number;
  onComplete: (stars: number) => void;
  onSkip: () => void;
}

// Split Arabic word into grapheme clusters
function splitIntoGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ar', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).map(s => s.segment);
  }
  return Array.from(text);
}

/**
 * Normalize Arabic letter for comparison.
 */
function normalizeArabicLetter(char: string): string {
  let stripped = char.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A]/g, '');
  stripped = stripped.replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, '\u0627');
  stripped = stripped.replace(/\u0629/g, '\u062A');
  stripped = stripped.replace(/\u0649/g, '\u064A');
  return stripped;
}

function graphemeContainsLetter(grapheme: string, targetLetter: string): boolean {
  const normalizedGrapheme = normalizeArabicLetter(grapheme);
  const normalizedTarget = normalizeArabicLetter(targetLetter);
  return normalizedGrapheme.includes(normalizedTarget);
}

// Non-connecting letters: these don't connect to the letter AFTER them (to the left in RTL)
const NON_CONNECTING = new Set(['ا', 'أ', 'إ', 'آ', 'ٱ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ة']);

/**
 * Determine the positional form of a grapheme within a word.
 * In Arabic, a letter's form depends on:
 * - Whether the PREVIOUS letter connects to it (from the right)
 * - Whether THIS letter connects to the next (to the left)
 */
type PositionalForm = 'isolated' | 'initial' | 'medial' | 'final';

function getPositionInWord(graphemes: string[], index: number): PositionalForm {
  const total = graphemes.length;
  if (total === 1) return 'isolated';
  
  // Check if the previous letter (to the right in RTL = index - 1 in array) connects to this one
  // A letter connects to the right if the letter before it is NOT a non-connecting letter
  const prevGrapheme = index > 0 ? graphemes[index - 1] : null;
  const prevBase = prevGrapheme ? normalizeArabicLetter(prevGrapheme) : null;
  const prevConnectsToLeft = prevBase ? !NON_CONNECTING.has(prevBase) : false;
  
  // Check if THIS letter connects to the next (to the left in RTL = index + 1 in array)
  const currentBase = normalizeArabicLetter(graphemes[index]);
  const thisConnectsToLeft = !NON_CONNECTING.has(currentBase);
  
  const hasNext = index < total - 1;
  
  // Connected from right (previous connects to us) AND connects to left (we connect to next)
  const connectedFromRight = prevConnectsToLeft;
  const connectsToLeft = thisConnectsToLeft && hasNext;
  
  if (connectedFromRight && connectsToLeft) return 'medial';
  if (connectedFromRight && !connectsToLeft) return 'final';
  if (!connectedFromRight && connectsToLeft) return 'initial';
  return 'isolated';
}

export default function FindInWordGame({ letter, onComplete }: Props) {
  const [wordIndex, setWordIndex] = useState(0);
  const [found, setFound] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [showFormGuide, setShowFormGuide] = useState(false);
  const [showTracing, setShowTracing] = useState(false);
  const [replayHighlight, setReplayHighlight] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const replayTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const quranicWords = letter.quranicWords || [];
  const currentWord = quranicWords[wordIndex];
  const letterForms = getLetterForms(letter.letter);

  const graphemes = useMemo(() => {
    if (!currentWord) return [];
    return splitIntoGraphemes(currentWord.word);
  }, [currentWord]);

  // Determine the positional form of the target letter in the current word
  const targetPositionInWord = useMemo((): PositionalForm => {
    if (!currentWord || graphemes.length === 0) return 'isolated';
    
    // Find the first grapheme that matches the target letter
    for (let i = 0; i < graphemes.length; i++) {
      if (graphemeContainsLetter(graphemes[i], letter.letter)) {
        return getPositionInWord(graphemes, i);
      }
    }
    return 'isolated';
  }, [currentWord, graphemes, letter.letter]);

  // Get the correct positional form display for hover tooltip
  const getHoverFormDisplay = useCallback((index: number): { form: string; label: string } | null => {
    if (!letterForms) return null;
    const position = getPositionInWord(graphemes, index);
    const formChar = letterForms[position];
    const label = formLabels[position].en;
    return { form: formChar, label };
  }, [graphemes, letterForms]);

  useEffect(() => {
    if (currentWord) {
      const timer = setTimeout(() => {
        speakArabicIfAllowed(currentWord.word, 0.6);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [wordIndex, currentWord]);

  // Reset state when word changes
  useEffect(() => {
    setFound(false);
    setHoveredIndex(null);
    setWrongIndex(null);
    setInteracting(false);
    setShowFormGuide(false);
    setShowTracing(false);
    setReplayHighlight(null);
    setIsReplaying(false);
    // Clear any pending replay timeouts
    replayTimeoutRef.current.forEach(t => clearTimeout(t));
    replayTimeoutRef.current = [];
  }, [wordIndex]);

  // Cleanup replay timeouts on unmount
  useEffect(() => {
    return () => {
      replayTimeoutRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const handleLetterTap = useCallback((grapheme: string, index: number) => {
    if (found || isReplaying) return;
    
    const isCorrect = graphemeContainsLetter(grapheme, letter.letter);
    
    if (isCorrect) {
      setFound(true);
      setScore(prev => prev + 1);
      setHoveredIndex(index);
      playCorrectSound();
      
      // Show the letter form guide after a brief celebration
      setTimeout(() => {
        setShowFormGuide(true);
      }, 800);
    } else {
      setWrongIndex(index);
      setMistakes(prev => prev + 1);
      playWrongSound();
      setTimeout(() => setWrongIndex(null), 600);
    }
  }, [found, isReplaying, letter.letter]);

  // Advance to next word (called from form guide or after replay)
  const advanceToNext = useCallback(() => {
    setShowFormGuide(false);
    if (wordIndex < quranicWords.length - 1) {
      setWordIndex(prev => prev + 1);
    } else {
      const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
      onComplete(stars);
    }
  }, [wordIndex, quranicWords.length, mistakes, onComplete]);

  // Replay word animation — highlights each letter from right to left
  const startReplay = useCallback(() => {
    if (!currentWord || isReplaying) return;
    
    setIsReplaying(true);
    setShowFormGuide(false);
    setHoveredIndex(null);
    
    // Clear previous timeouts
    replayTimeoutRef.current.forEach(t => clearTimeout(t));
    replayTimeoutRef.current = [];
    
    // Speak the word
    speakArabic(currentWord.word, 0.5);
    
    // Highlight each grapheme sequentially (RTL order = array order since text is RTL)
    graphemes.forEach((_, i) => {
      const timeout = setTimeout(() => {
        setReplayHighlight(i);
      }, i * 500 + 200);
      replayTimeoutRef.current.push(timeout);
    });
    
    // Clear highlight and finish
    const finishTimeout = setTimeout(() => {
      setReplayHighlight(null);
      setIsReplaying(false);
      // Show form guide again if letter was found
      if (found) {
        setShowFormGuide(true);
      }
    }, graphemes.length * 500 + 600);
    replayTimeoutRef.current.push(finishTimeout);
  }, [currentWord, isReplaying, found, graphemes]);

  // Touch handling for mobile
  const handleTouchStart = useCallback((index: number) => {
    if (isReplaying) return;
    setInteracting(true);
    setHoveredIndex(index);
  }, [isReplaying]);

  const handleTouchEnd = useCallback((grapheme: string, index: number) => {
    if (isReplaying) return;
    handleLetterTap(grapheme, index);
    setTimeout(() => {
      if (!found) setHoveredIndex(null);
      setInteracting(false);
    }, 300);
  }, [handleLetterTap, found, isReplaying]);

  if (!currentWord) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">No Quranic words available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 gap-4">
      {/* Progress dots */}
      <div className="flex gap-2">
        {quranicWords.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < wordIndex ? 'bg-teal-500' :
              i === wordIndex ? 'bg-amber-500 scale-125' :
              'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Instruction */}
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-600 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
          Find the letter <span className="text-3xl font-bold arabic-text" style={{ color: letter.color }}>{letter.letter}</span> in this word!
        </p>
        <p className="text-sm text-gray-400">
          {isReplaying ? 'Watch each letter light up!' :
           interacting ? 'Now tap the letter!' : 
           'Touch each letter to see it bigger'}
        </p>
      </div>

      {/* Target letter reminder — shows the CORRECT positional form used in this word */}
      <motion.div
        animate={{ scale: found ? 1 : [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: found ? 0 : Infinity }}
        className="flex flex-col items-center gap-1"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: letter.color + '20', border: `3px solid ${letter.color}` }}
        >
          <span className="text-2xl font-bold arabic-text" style={{ color: letter.color, fontFamily: '"Amiri", "Noto Naskh Arabic", serif' }}>
            {letterForms ? letterForms[targetPositionInWord] : letter.letter}
          </span>
        </div>
        <span className="text-[10px] font-medium text-gray-400">
          {formLabels[targetPositionInWord].en} form
        </span>
      </motion.div>

      {/* Quranic Word Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wordIndex}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="bg-white rounded-3xl shadow-xl border-2 border-amber-100 p-5 max-w-md w-full"
        >
          {/* The Arabic word — connected text with tappable graphemes */}
          <div 
            ref={containerRef}
            className="text-center mb-3 relative"
            dir="rtl"
            style={{ 
              minHeight: '4.5rem',
              fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
              fontSize: '3.5rem',
              lineHeight: 1.8,
            }}
          >
            {graphemes.map((grapheme, i) => {
              const isTarget = graphemeContainsLetter(grapheme, letter.letter);
              const isHovered = hoveredIndex === i;
              const isWrong = wrongIndex === i;
              const isFound = found && isTarget;
              const isReplayActive = replayHighlight === i;
              const hoverFormInfo = isHovered && !found ? getHoverFormDisplay(i) : null;
              
              return (
                <span
                  key={i}
                  onMouseEnter={() => !found && !isReplaying && setHoveredIndex(i)}
                  onMouseLeave={() => !found && !interacting && !isReplaying && setHoveredIndex(null)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleTouchStart(i);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleTouchEnd(grapheme, i);
                  }}
                  onClick={() => handleLetterTap(grapheme, i)}
                  style={{
                    display: 'inline',
                    position: 'relative',
                    cursor: found ? 'default' : 'pointer',
                    userSelect: 'none',
                    transform: isReplayActive ? 'scale(1.35) translateY(-4px)' :
                               isHovered ? 'scale(1.4) translateY(-4px)' : 
                               isFound ? 'scale(1.3)' : 'scale(1)',
                    transformOrigin: 'center bottom',
                    transition: 'transform 0.25s ease, color 0.2s ease, background-color 0.25s ease, box-shadow 0.25s ease',
                    ...(isHovered || isFound || isWrong || isReplayActive ? {
                      display: 'inline-block',
                      borderRadius: '8px',
                      padding: '0 4px',
                      zIndex: 10,
                    } : {}),
                    color: isFound ? '#059669' : isReplayActive ? '#0D7377' : isWrong ? '#DC2626' : '#1f2937',
                    backgroundColor: isFound ? '#D1FAE5' : 
                                     isReplayActive ? '#E0F7FA' :
                                     isHovered ? '#FEF3C7' : 
                                     isWrong ? '#FEE2E2' : 'transparent',
                    boxShadow: isFound ? '0 0 0 3px #34D399' : 
                               isReplayActive ? '0 0 0 3px #0D9488, 0 4px 16px rgba(13,115,119,0.25)' :
                               isHovered ? '0 0 0 2px #FCD34D, 0 4px 12px rgba(0,0,0,0.1)' : 
                               isWrong ? '0 0 0 2px #F87171' : 'none',
                  }}
                >
                  {grapheme}
                  {/* Hover tooltip showing the positional form name */}
                  {isHovered && !found && !isReplaying && hoverFormInfo && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.6rem',
                        fontFamily: 'var(--font-body)',
                        color: '#6B7280',
                        backgroundColor: '#FFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                        zIndex: 20,
                        direction: 'ltr',
                      }}
                    >
                      {hoverFormInfo.label}
                    </span>
                  )}
                  {isFound && !isReplaying && (
                    <span style={{ position: 'absolute', top: '-8px', right: '-8px', fontSize: '0.8rem' }}>
                      ✅
                    </span>
                  )}
                  {isWrong && (
                    <span style={{ position: 'absolute', top: '-8px', right: '-8px', fontSize: '0.8rem' }}>
                      ❌
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Letter Form Guide — shown after finding the letter, with ACTIVE form highlighted */}
          <AnimatePresence>
            {showFormGuide && letterForms && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 mb-3 border border-teal-100">
                  <p className="text-sm font-semibold text-teal-700 text-center mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    ✨ {letter.name} has different shapes!
                  </p>
                  <div className="flex justify-center gap-2">
                    {(['isolated', 'initial', 'medial', 'final'] as const).map((form) => {
                      const isActiveForm = form === targetPositionInWord;
                      return (
                        <motion.div
                          key={form}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={isActiveForm 
                            ? { scale: [0, 1.2, 1], opacity: 1 }
                            : { scale: 1, opacity: 1 }
                          }
                          transition={{ delay: form === 'isolated' ? 0.1 : form === 'initial' ? 0.25 : form === 'medial' ? 0.4 : 0.55, type: 'spring', stiffness: 300 }}
                          className="flex flex-col items-center relative"
                        >
                          {/* Arrow pointing to active form */}
                          {isActiveForm && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: [0, -4, 0] }}
                              transition={{ delay: 0.7, duration: 1.2, repeat: Infinity }}
                              className="absolute -top-5 text-center"
                              style={{ fontSize: '0.9rem' }}
                            >
                              👇
                            </motion.div>
                          )}
                          <motion.div 
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-1"
                            animate={isActiveForm ? {
                              boxShadow: [
                                `0 0 0px ${letter.color}40, 0 4px 8px rgba(0,0,0,0.1)`,
                                `0 0 20px ${letter.color}60, 0 4px 12px rgba(0,0,0,0.15)`,
                                `0 0 0px ${letter.color}40, 0 4px 8px rgba(0,0,0,0.1)`,
                              ]
                            } : {}}
                            transition={isActiveForm ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                            style={{ 
                              backgroundColor: isActiveForm ? letter.color + '20' : 'white',
                              border: isActiveForm 
                                ? `3px solid ${letter.color}` 
                                : `2px solid ${letter.color}20`,
                              boxShadow: isActiveForm 
                                ? `0 0 12px ${letter.color}40, 0 4px 8px rgba(0,0,0,0.1)` 
                                : '0 1px 3px rgba(0,0,0,0.05)',
                              transform: isActiveForm ? 'scale(1.15)' : 'scale(0.9)',
                              opacity: isActiveForm ? 1 : 0.5,
                            }}
                          >
                            <span 
                              className="arabic-text"
                              style={{ 
                                fontSize: isActiveForm ? '2rem' : '1.3rem',
                                color: isActiveForm ? letter.color : '#BBB',
                                fontWeight: isActiveForm ? 700 : 400,
                                fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                              }}
                            >
                              {letterForms[form]}
                            </span>
                          </motion.div>
                          <span 
                            className="text-[10px] font-medium"
                            style={{ 
                              color: isActiveForm ? letter.color : '#9CA3AF',
                              fontWeight: isActiveForm ? 700 : 400,
                            }}
                          >
                            {formLabels[form].en}
                            {isActiveForm && ' ✓'}
                          </span>
                          <span 
                            className="text-[10px] arabic-text" 
                            style={{ 
                              fontFamily: '"Amiri", serif',
                              color: isActiveForm ? letter.color : '#D1D5DB',
                            }}
                          >
                            {formLabels[form].ar}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  {/* Explanation of which form is used */}
                  <p className="text-xs text-center text-teal-600 mt-3 font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                    In this word, {letter.name} uses its <strong>{formLabels[targetPositionInWord].en}</strong> shape
                  </p>
                </div>

                {/* Action buttons after form guide */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowFormGuide(false); setShowTracing(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 rounded-full border border-purple-200 text-sm font-medium"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span>✍️</span>
                    Trace It
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startReplay}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 rounded-full border border-teal-200 text-sm font-medium"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span>▶️</span>
                    Replay Word
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={advanceToNext}
                    className="flex items-center gap-1.5 px-5 py-2 text-white rounded-full text-sm font-semibold shadow-md"
                    style={{ fontFamily: 'var(--font-body)', backgroundColor: letter.color }}
                  >
                    {wordIndex < quranicWords.length - 1 ? 'Next Word →' : 'Finish! 🎉'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trace the Shape mini-game */}
          <AnimatePresence>
            {showTracing && letterForms && (
              <LetterTracing
                letterForm={letterForms[targetPositionInWord]}
                formLabel={formLabels[targetPositionInWord].en}
                letterName={letter.name}
                letterColor={letter.color}
                onComplete={() => {
                  setShowTracing(false);
                  advanceToNext();
                }}
                onSkip={() => {
                  setShowTracing(false);
                  advanceToNext();
                }}
              />
            )}
          </AnimatePresence>

          {/* Found celebration (brief, before form guide appears) */}
          <AnimatePresence>
            {found && !showFormGuide && !isReplaying && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center mb-3"
              >
                <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'var(--font-heading)' }}>
                  ✨ You found {letter.name}!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replay animation indicator */}
          <AnimatePresence>
            {isReplaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mb-3"
              >
                <p className="text-sm font-semibold text-teal-600" style={{ fontFamily: 'var(--font-heading)' }}>
                  🔤 Follow each letter...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint prompt (before finding) */}
          {!found && !interacting && !isReplaying && (
            <motion.div
              className="text-center mb-3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <p className="text-sm text-amber-500 font-medium">
                👆 Touch each letter to make it bigger, then tap {letter.name}!
              </p>
            </motion.div>
          )}

          {/* Word info */}
          <div className="text-center border-t border-amber-50 pt-3">
            <p className="text-sm text-gray-400 mb-1">From Surah {currentWord.surah}</p>
            <p className="text-lg font-semibold text-teal-700" style={{ fontFamily: 'var(--font-heading)' }}>
              "{currentWord.meaning}"
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Listen button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => speakArabic(currentWord.word, 0.6)}
        className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className="text-xl">🔊</span>
        Hear the word
      </motion.button>

      {/* Score */}
      <p className="text-sm text-gray-400">
        Found {score}/{quranicWords.length} words
      </p>
    </div>
  );
}
