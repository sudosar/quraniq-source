/**
 * DragToMatchGame - Match the letter to the picture that STARTS with it
 * 
 * PEDAGOGY:
 * - Shows the current letter in a big card
 * - Shows 3 pictures: 1 correct (starts with this letter) + 2 distractors
 * - Distractors are ALWAYS from OTHER letters' "starts with" words
 *   (NOT from the same letter's other word cards — that's confusing!)
 * - Arabic word is shown on each card with the TARGET LETTER highlighted
 *   in its correct positional form (initial since all words start with it)
 * 
 * For the FIRST letter (no previously learned letters):
 * - Uses pictures from the NEXT few letters as visual distractors
 *   (child hasn't learned them yet, but can still distinguish pictures)
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArabicLetter, getBeginningWords, arabicLetters } from '@/lib/curriculum';
import { getLetterForms, formLabels } from '@/lib/letterForms';
import { playCorrectSound, playWrongSound, speakArabic, shuffleArray } from '@/lib/gameEngine';

interface Props {
  letter: ArabicLetter;
  allLetters: ArabicLetter[];
  lessonLetters: ArabicLetter[];
  distractorLetters: ArabicLetter[];
  distractorCount: number;
  onComplete: (stars: number) => void;
  onSkip: () => void;
}

interface PictureTarget {
  word: string;
  meaning: string;
  emoji: string;
  letterId: number;
  isCorrect: boolean;
}

// Split Arabic word into grapheme clusters
function splitIntoGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ar', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).map(s => s.segment);
  }
  return Array.from(text);
}

// Normalize Arabic letter for comparison
function normalizeArabicLetter(char: string): string {
  let stripped = char.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A]/g, '');
  stripped = stripped.replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, '\u0627');
  stripped = stripped.replace(/\u0629/g, '\u062A');
  stripped = stripped.replace(/\u0649/g, '\u064A');
  return stripped;
}

// Non-connecting letters
const NON_CONNECTING = new Set(['ا', 'أ', 'إ', 'آ', 'ٱ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ة']);

type PositionalForm = 'isolated' | 'initial' | 'medial' | 'final';

function getPositionInWord(graphemes: string[], index: number): PositionalForm {
  const total = graphemes.length;
  if (total === 1) return 'isolated';
  
  const prevGrapheme = index > 0 ? graphemes[index - 1] : null;
  const prevBase = prevGrapheme ? normalizeArabicLetter(prevGrapheme) : null;
  const prevConnectsToLeft = prevBase ? !NON_CONNECTING.has(prevBase) : false;
  
  const currentBase = normalizeArabicLetter(graphemes[index]);
  const thisConnectsToLeft = !NON_CONNECTING.has(currentBase);
  
  const hasNext = index < total - 1;
  const connectedFromRight = prevConnectsToLeft;
  const connectsToLeft = thisConnectsToLeft && hasNext;
  
  if (connectedFromRight && connectsToLeft) return 'medial';
  if (connectedFromRight && !connectsToLeft) return 'final';
  if (!connectedFromRight && connectsToLeft) return 'initial';
  return 'isolated';
}

/**
 * Render an Arabic word with the target letter highlighted in its positional form
 */
function HighlightedArabicWord({ word, targetLetter, letterColor }: { word: string; targetLetter: string; letterColor: string }) {
  const graphemes = useMemo(() => splitIntoGraphemes(word), [word]);
  const normalizedTarget = useMemo(() => normalizeArabicLetter(targetLetter), [targetLetter]);
  const letterFormsData = getLetterForms(targetLetter);
  
  // Find the first matching grapheme and its position
  const matchInfo = useMemo(() => {
    for (let i = 0; i < graphemes.length; i++) {
      const normalizedG = normalizeArabicLetter(graphemes[i]);
      if (normalizedG.includes(normalizedTarget)) {
        const position = getPositionInWord(graphemes, i);
        return { index: i, position };
      }
    }
    return null;
  }, [graphemes, normalizedTarget]);

  return (
    <span 
      className="arabic-text block text-center" 
      dir="rtl" 
      style={{ fontFamily: '"Amiri", "Noto Naskh Arabic", serif', fontSize: '1.8rem', lineHeight: 1.6 }}
    >
      {graphemes.map((g, i) => {
        const normalizedG = normalizeArabicLetter(g);
        const isTarget = normalizedG.includes(normalizedTarget);
        return (
          <span
            key={i}
            style={{
              color: isTarget ? letterColor : '#1f2937',
              fontWeight: isTarget ? 700 : 400,
              textDecoration: isTarget ? 'underline' : 'none',
              textDecorationColor: isTarget ? letterColor + '60' : 'transparent',
              textUnderlineOffset: '3px',
            }}
          >
            {g}
          </span>
        );
      })}
      {/* Show the positional form label for the correct answer */}
      {matchInfo && letterFormsData && (
        <span 
          className="block text-center mt-0.5"
          style={{ 
            fontSize: '0.7rem', 
            color: letterColor, 
            fontFamily: 'var(--font-body)',
            direction: 'ltr',
            fontWeight: 600,
          }}
        >
          {formLabels[matchInfo.position].en} form
        </span>
      )}
    </span>
  );
}

export default function DragToMatchGame({ letter, distractorLetters, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [matched, setMatched] = useState(false);
  const [wrongTarget, setWrongTarget] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState(0);
  
  const targetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const beginningWords = useMemo(() => getBeginningWords(letter), [letter]);
  const totalRounds = Math.min(3, beginningWords.length);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  
  // Build picture targets — correct answer from current letter, distractors from OTHER letters
  const targets = useMemo(() => {
    const rounds: PictureTarget[][] = [];
    
    for (let r = 0; r < totalRounds; r++) {
      const correctCard = beginningWords[r % beginningWords.length];
      const correct: PictureTarget = {
        word: correctCard.word,
        meaning: correctCard.meaning,
        emoji: correctCard.emoji,
        letterId: letter.id,
        isCorrect: true,
      };
      
      const distractors: PictureTarget[] = [];
      
      // Get distractor pictures from OTHER letters' beginning words
      if (distractorLetters.length > 0) {
        const shuffled = shuffleArray(distractorLetters);
        for (const dl of shuffled) {
          if (distractors.length >= 2) break;
          const dlWords = getBeginningWords(dl);
          if (dlWords.length > 0) {
            const dCard = dlWords[Math.floor(Math.random() * dlWords.length)];
            distractors.push({
              word: dCard.word,
              meaning: dCard.meaning,
              emoji: dCard.emoji,
              letterId: dl.id,
              isCorrect: false,
            });
          }
        }
      }
      
      // If still not enough, use OTHER letters
      if (distractors.length < 2) {
        const otherLetters = shuffleArray(
          arabicLetters.filter(l => l.id !== letter.id && !distractorLetters.find(d => d.id === l.id))
        );
        for (const ol of otherLetters) {
          if (distractors.length >= 2) break;
          const olWords = getBeginningWords(ol);
          if (olWords.length > 0) {
            const card = olWords[Math.floor(Math.random() * olWords.length)];
            if (!distractors.find(d => d.emoji === card.emoji) && card.emoji !== correct.emoji) {
              distractors.push({
                word: card.word,
                meaning: card.meaning,
                emoji: card.emoji,
                letterId: ol.id,
                isCorrect: false,
              });
            }
          }
        }
      }
      
      rounds.push(shuffleArray([correct, ...distractors.slice(0, 2)]));
    }
    
    return rounds;
  }, [letter, beginningWords, distractorLetters, totalRounds]);
  
  const currentTargets = targets[round] || targets[0];
  
  // Handle drag end - check if dropped on a target
  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const dropX = info.point.x;
    const dropY = info.point.y;
    
    let hitTarget: PictureTarget | null = null;
    let hitIndex = -1;
    
    targetRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      if (dropX >= rect.left - 30 && dropX <= rect.right + 30 && 
          dropY >= rect.top - 30 && dropY <= rect.bottom + 30) {
        hitTarget = currentTargets[idx];
        hitIndex = idx;
      }
    });
    
    if (hitTarget !== null) {
      const hit = hitTarget as PictureTarget;
      if (hit.isCorrect) {
        handleCorrect(hit);
      } else {
        setWrongTarget(hitIndex);
        playWrongSound();
        setTimeout(() => setWrongTarget(null), 800);
        setShowHint(true);
      }
    }
  }, [currentTargets]);

  const handleCorrect = useCallback((target: PictureTarget) => {
    setMatched(true);
    playCorrectSound();
    speakArabic(target.word);
    setScore(prev => prev + 1);
    
    setTimeout(() => {
      if (round < totalRounds - 1) {
        setRound(prev => prev + 1);
        setMatched(false);
        setShowHint(false);
      } else {
        onComplete(2);
      }
    }, 1500);
  }, [round, totalRounds, onComplete]);
  
  // Also support TAP on target as alternative
  const handleTargetTap = useCallback((target: PictureTarget, idx: number) => {
    if (matched || isDragging) return;
    
    if (target.isCorrect) {
      handleCorrect(target);
    } else {
      setWrongTarget(idx);
      playWrongSound();
      setTimeout(() => setWrongTarget(null), 800);
      setShowHint(true);
    }
  }, [matched, isDragging, handleCorrect]);

  return (
    <div ref={dragConstraintsRef} className="h-full flex flex-col items-center justify-between py-4 px-4 select-none overflow-hidden relative">
      {/* Instruction */}
      <div className="text-center mb-2 z-10">
        <h2 className="text-lg font-bold text-gray-700" style={{ fontFamily: 'var(--font-heading)' }}>
          Match the letter to its picture!
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Which picture starts with <span className="font-bold arabic-text text-xl" style={{ color: letter.color }}>{letter.letter}</span>?
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${
              i < round ? 'bg-teal-500' : i === round ? 'bg-amber-500 scale-125' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>
      
      {/* Draggable letter */}
      <div className="relative mb-6 z-50">
        <motion.div
          key={`letter-${round}`}
          drag
          dragSnapToOrigin
          dragElastic={0.5}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.3, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          whileTap={{ scale: 1.1 }}
          className={`w-28 h-28 rounded-3xl flex items-center justify-center shadow-xl border-4 cursor-grab active:cursor-grabbing ${
            matched ? 'bg-green-100 border-green-400' : 'bg-white border-amber-300'
          }`}
          style={{ touchAction: 'none' }}
        >
          <span className="text-6xl arabic-text font-bold select-none pointer-events-none" style={{ color: letter.color }}>
            {letter.letter}
          </span>
        </motion.div>
        
        {!matched && !isDragging && (
          <motion.div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl text-amber-400"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            👇
          </motion.div>
        )}
      </div>
      
      {/* Picture targets — always 3, distractors from OTHER letters */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
        <AnimatePresence mode="wait">
          {currentTargets.map((target, idx) => (
            <motion.div
              key={`${round}-${idx}`}
              ref={el => { targetRefs.current[idx] = el; }}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: wrongTarget === idx ? [1, 0.9, 1.05, 1] : matched && target.isCorrect ? 1.1 : 1,
              }}
              transition={{ delay: idx * 0.15, type: 'spring' }}
              onClick={() => handleTargetTap(target, idx)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-3xl border-4 transition-colors min-h-[160px] ${
                matched && target.isCorrect ? 'bg-green-50 border-green-400 shadow-xl' :
                wrongTarget === idx ? 'bg-red-50 border-red-400 shadow-lg' :
                showHint && target.isCorrect ? 'bg-amber-50 border-amber-300 shadow-lg ring-4 ring-amber-200' :
                isDragging ? 'bg-blue-50 border-blue-200 shadow-lg ring-2 ring-blue-100' :
                'bg-white border-gray-200 shadow-md hover:shadow-lg hover:border-amber-200'
              }`}
            >
              <span className="text-4xl mb-1 pointer-events-none">{target.emoji}</span>
              
              {/* Arabic word with target letter highlighted in its positional form */}
              <div className="pointer-events-none w-full">
                {target.isCorrect ? (
                  <HighlightedArabicWord 
                    word={target.word} 
                    targetLetter={letter.letter} 
                    letterColor={letter.color} 
                  />
                ) : (
                  <span 
                    className="arabic-text block text-center" 
                    dir="rtl"
                    style={{ fontFamily: '"Amiri", "Noto Naskh Arabic", serif', fontSize: '1.8rem', color: '#1f2937' }}
                  >
                    {target.word}
                  </span>
                )}
              </div>
              
              <span className="text-xs font-medium text-gray-500 pointer-events-none text-center mt-0.5">{target.meaning}</span>
              
              {matched && target.isCorrect && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-white text-xl">✓</span>
                </motion.div>
              )}
              
              {wrongTarget === idx && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-white text-xl">✗</span>
                </motion.div>
              )}
              
              {isDragging && !matched && (
                <motion.div
                  className="absolute inset-0 rounded-3xl border-2 border-dashed border-blue-300 pointer-events-none"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {showHint && !matched && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-amber-600 text-sm mt-3 font-medium"
        >
          💡 Hint: Look for the picture that starts with "{letter.name}"!
        </motion.p>
      )}
      
      {!isDragging && !matched && !showHint && (
        <p className="text-center text-gray-400 text-xs mt-3">
          Drag the letter to the picture, or tap the correct one!
        </p>
      )}
    </div>
  );
}
