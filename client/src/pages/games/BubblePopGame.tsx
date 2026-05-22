/**
 * Bubble Pop Game - Khan Academy Kids Style
 * 
 * Design: Celestial Garden theme
 * 
 * MECHANICS (inspired by Khan Academy Kids):
 * - Bubbles float slowly and randomly across the screen
 * - They drift in and out of view, bouncing off edges gently
 * - Child taps the correct letter bubbles
 * - Wrong bubbles wobble but don't pop
 * 
 * PROGRESSIVE DISTRACTORS:
 * - ALWAYS shows distractors — even for the first letter!
 * - For the first letter: uses 2-3 other common Arabic letters as visual distractors
 *   (child hasn't learned them yet, but can distinguish shapes)
 * - For later letters: uses previously learned letters as distractors
 * - This makes the game actually challenging and teaches letter discrimination
 * 
 * ALL LETTER FORMS:
 * - Target bubbles show the letter in ALL its positional forms (isolated, initial, medial, final)
 * - This teaches children to recognize the letter regardless of shape
 * - A small label below each target bubble shows which form it is
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArabicLetter, arabicLetters } from '@/lib/curriculum';
import { getLetterForms, formLabels, LetterForms } from '@/lib/letterForms';
import { playPopSound, playWrongSound, playCorrectSound, shuffleArray } from '@/lib/gameEngine';

interface Props {
  letter: ArabicLetter;
  allLetters: ArabicLetter[];
  lessonLetters: ArabicLetter[];
  distractorLetters: ArabicLetter[];
  distractorCount: number;
  onComplete: (stars: number) => void;
  onSkip: () => void;
}

interface Bubble {
  id: number;
  displayLetter: string;
  formLabel: string | null; // e.g., "Start", "Middle" — null for distractors
  isTarget: boolean;
  popped: boolean;
  wobble: boolean;
  colorIndex: number;
  size: number;
  startX: number;
  startY: number;
  driftXRange: number;
  driftYRange: number;
  duration: number;
  delay: number;
}

const BUBBLE_COLORS = [
  '#FF6B9D', '#C084FC', '#60A5FA', '#34D399',
  '#FBBF24', '#F97316', '#EC4899', '#8B5CF6',
  '#06B6D4', '#10B981',
];

const TARGET_COUNT = 6;

export default function BubblePopGame({ letter, distractorLetters, distractorCount, onComplete }: Props) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const [gameReady, setGameReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all forms of the target letter
  const letterFormsData = useMemo(() => getLetterForms(letter.letter), [letter]);

  const generateBubbles = useCallback(() => {
    const allBubbleItems: Array<{ displayLetter: string; formLabel: string | null; isTarget: boolean }> = [];
    
    // Add target letter in ALL its positional forms
    if (letterFormsData) {
      const forms: Array<{ key: keyof LetterForms; label: string }> = [
        { key: 'isolated', label: 'Alone' },
        { key: 'initial', label: 'Start' },
        { key: 'medial', label: 'Middle' },
        { key: 'final', label: 'End' },
      ];
      
      // Add each form at least once, and add extras of isolated/initial for more targets
      forms.forEach(({ key, label }) => {
        allBubbleItems.push({ displayLetter: letterFormsData[key], formLabel: label, isTarget: true });
      });
      // Add 2 more targets (repeat isolated and initial) to reach 6 total
      allBubbleItems.push({ displayLetter: letterFormsData.isolated, formLabel: 'Alone', isTarget: true });
      allBubbleItems.push({ displayLetter: letterFormsData.initial, formLabel: 'Start', isTarget: true });
    } else {
      // Fallback: just use the letter itself
      for (let i = 0; i < 6; i++) {
        allBubbleItems.push({ displayLetter: letter.letter, formLabel: null, isTarget: true });
      }
    }
    
    // ALWAYS add distractors — even for the first letter!
    if (distractorCount > 0 && distractorLetters.length > 0) {
      // Use previously learned letters as distractors (in their isolated form)
      const usableDistractors = distractorLetters.slice(0, Math.min(distractorCount, 4));
      usableDistractors.forEach(d => {
        allBubbleItems.push({ displayLetter: d.letter, formLabel: null, isTarget: false });
        if (usableDistractors.length < 3) {
          allBubbleItems.push({ displayLetter: d.letter, formLabel: null, isTarget: false });
        }
      });
    } else {
      // FIRST LETTER: Use other Arabic letters as visual distractors
      const otherLetters = arabicLetters.filter(l => l.id !== letter.id);
      const visualDistractors = shuffleArray(otherLetters).slice(0, 3);
      
      visualDistractors.forEach(d => {
        allBubbleItems.push({ displayLetter: d.letter, formLabel: null, isTarget: false });
        allBubbleItems.push({ displayLetter: d.letter, formLabel: null, isTarget: false });
      });
    }

    const shuffled = shuffleArray(allBubbleItems);
    
    const newBubbles: Bubble[] = shuffled.map((item, i) => {
      const startX = 10 + Math.random() * 75;
      const startY = 15 + Math.random() * 65;
      
      return {
        id: i,
        displayLetter: item.displayLetter,
        formLabel: item.formLabel,
        isTarget: item.isTarget,
        popped: false,
        wobble: false,
        colorIndex: i % BUBBLE_COLORS.length,
        size: 90 + Math.random() * 30,
        startX,
        startY,
        driftXRange: 20 + Math.random() * 40,
        driftYRange: 15 + Math.random() * 35,
        duration: 6 + Math.random() * 8,
        delay: i * 0.3,
      };
    });

    setBubbles(newBubbles);
  }, [letter, letterFormsData, distractorLetters, distractorCount]);

  useEffect(() => {
    generateBubbles();
    setTimeout(() => setGameReady(true), 800);
  }, [generateBubbles]);

  const handleBubbleTap = useCallback((bubble: Bubble) => {
    if (bubble.popped || !gameReady) return;

    if (bubble.isTarget) {
      playPopSound();
      const newScore = score + 1;
      setScore(newScore);
      
      const newParticles = Array.from({ length: 8 }).map((_, i) => ({
        id: Date.now() + i + Math.random() * 1000,
        x: bubble.startX,
        y: bubble.startY,
        color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      }));
      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.includes(p))), 1000);

      setBubbles(prev => prev.map(b => 
        b.id === bubble.id ? { ...b, popped: true } : b
      ));

      if (newScore >= TARGET_COUNT) {
        setTimeout(() => {
          playCorrectSound();
          onComplete(2);
        }, 600);
      }
    } else {
      playWrongSound();
      setBubbles(prev => prev.map(b => 
        b.id === bubble.id ? { ...b, wobble: true } : b
      ));
      setTimeout(() => {
        setBubbles(prev => prev.map(b => 
          b.id === bubble.id ? { ...b, wobble: false } : b
        ));
      }, 600);
    }
  }, [score, gameReady, onComplete]);

  const instructionText = `Pop all forms of ${letter.name} (${letter.letter})!`;

  return (
    <div ref={containerRef} className="h-full relative overflow-hidden bg-gradient-to-b from-sky-200 via-blue-100 to-indigo-50">
      {/* Score */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm rounded-full px-6 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">🫧</span>
          <span className="font-bold text-lg text-blue-700" style={{ fontFamily: 'var(--font-heading)' }}>
            {score} / {TARGET_COUNT}
          </span>
        </div>
      </div>

      {/* Target letter reminder — show all 4 forms */}
      <div className="absolute top-4 right-3 z-20 bg-white/95 shadow-lg rounded-2xl px-3 py-2 border-2" style={{ borderColor: letter.color }}>
        <div className="flex items-center gap-1.5">
          {letterFormsData && (['isolated', 'initial', 'medial', 'final'] as const).map((form) => (
            <span 
              key={form}
              className="arabic-text font-bold text-lg"
              style={{ color: letter.color, fontFamily: '"Amiri", "Noto Naskh Arabic", serif' }}
              title={formLabels[form].en}
            >
              {letterFormsData[form]}
            </span>
          ))}
        </div>
      </div>

      {/* Instruction at bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/90 rounded-2xl px-6 py-3 shadow-lg">
        <p className="text-base font-bold text-gray-700 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
          {instructionText}
        </p>
        <p className="text-xs text-gray-500 text-center mt-1">
          Look for all shapes: alone, start, middle, end!
        </p>
      </div>

      {/* Pop particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-3 h-3 rounded-full z-30 pointer-events-none"
          style={{ backgroundColor: p.color, left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ scale: 1, opacity: 1 }}
          animate={{ 
            scale: 0,
            opacity: 0,
            x: (Math.random() - 0.5) * 120,
            y: (Math.random() - 0.5) * 120,
          }}
          transition={{ duration: 0.7 }}
        />
      ))}

      {/* Floating Bubbles */}
      <AnimatePresence>
        {bubbles.filter(b => !b.popped).map(bubble => {
          const color = BUBBLE_COLORS[bubble.colorIndex];
          
          const floatKeyframesX = [
            0,
            bubble.driftXRange * 0.6,
            -bubble.driftXRange * 0.4,
            bubble.driftXRange * 0.8,
            -bubble.driftXRange * 0.6,
            bubble.driftXRange * 0.3,
            0,
          ];
          const floatKeyframesY = [
            0,
            -bubble.driftYRange * 0.5,
            bubble.driftYRange * 0.7,
            -bubble.driftYRange * 0.8,
            bubble.driftYRange * 0.4,
            -bubble.driftYRange * 0.6,
            0,
          ];
          
          return (
            <motion.div
              key={bubble.id}
              className="absolute z-10"
              style={{
                left: `${bubble.startX}%`,
                top: `${bubble.startY}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={bubble.wobble ? {
                scale: 1,
                opacity: 1,
                rotate: [0, -8, 8, -8, 8, 0],
                x: [0, -10, 10, -10, 10, 0],
              } : {
                scale: 1,
                opacity: 1,
                x: floatKeyframesX,
                y: floatKeyframesY,
                rotate: [0, 2, -2, 3, -1, 2, 0],
              }}
              transition={bubble.wobble ? { duration: 0.5 } : {
                scale: { type: 'spring', delay: bubble.delay, stiffness: 200, damping: 15 },
                opacity: { delay: bubble.delay, duration: 0.4 },
                x: { 
                  duration: bubble.duration, 
                  repeat: Infinity, 
                  ease: 'easeInOut',
                  delay: bubble.delay,
                },
                y: { 
                  duration: bubble.duration * 0.85, 
                  repeat: Infinity, 
                  ease: 'easeInOut',
                  delay: bubble.delay,
                },
                rotate: {
                  duration: bubble.duration * 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: bubble.delay,
                },
              }}
              exit={{ scale: [1, 1.4, 0], opacity: [1, 0.8, 0], transition: { duration: 0.35 } }}
              whileTap={{ scale: 0.8 }}
              onClick={() => handleBubbleTap(bubble)}
            >
              <div
                className="rounded-full flex flex-col items-center justify-center relative cursor-pointer select-none"
                style={{
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  marginLeft: `-${bubble.size / 2}px`,
                  marginTop: `-${bubble.size / 2}px`,
                  backgroundColor: color,
                  border: '3px solid rgba(255,255,255,0.6)',
                  boxShadow: `0 4px 20px ${color}80, inset 0 -6px 12px rgba(0,0,0,0.15), inset 0 6px 12px rgba(255,255,255,0.5)`,
                }}
              >
                {/* Bubble highlight/shine */}
                <div 
                  className="absolute rounded-full bg-white/50"
                  style={{ top: '12%', left: '18%', width: '30%', height: '22%', transform: 'rotate(-20deg)' }}
                />
                {/* Letter */}
                <span 
                  className="text-3xl md:text-4xl arabic-text font-bold relative z-10" 
                  style={{ 
                    color: '#1a1a2e', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 2px 4px rgba(255,255,255,0.5)',
                    fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
                  }}
                >
                  {bubble.displayLetter}
                </span>
                {/* Form label for target bubbles */}
                {bubble.isTarget && bubble.formLabel && (
                  <span 
                    className="text-[9px] font-bold relative z-10 mt-0.5 px-1.5 py-0.5 rounded-full bg-white/70"
                    style={{ color: '#1a1a2e' }}
                  >
                    {bubble.formLabel}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Win overlay */}
      <AnimatePresence>
        {score >= TARGET_COUNT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
              className="text-center"
            >
              <span className="text-6xl block mb-2">🎉</span>
              <p className="text-2xl font-bold text-blue-700" style={{ fontFamily: 'var(--font-heading)' }}>
                All forms popped!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
