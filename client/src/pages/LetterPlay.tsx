/**
 * LetterPlay - Main game orchestrator (Progressive Design)
 * 
 * Design: Celestial Garden theme
 * 
 * KEY: The game sequence adapts based on how many letters the child already knows.
 * First letter = no distractors, just reinforcement.
 * Later letters = progressively add previously learned letters as distractors.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { arabicLetters, getLettersForLesson, lessons, getAvailableDistractorCount, getProgressiveDistractors } from '@/lib/curriculum';
import { getProgressiveGameSequence, GameConfig, playCelebrationSound } from '@/lib/gameEngine';
import { useProgress } from '@/contexts/ProgressContext';
import LetterIntroGame from './games/LetterIntroGame';
import WordCardsGame from './games/WordCardsGame';
import BubblePopGame from './games/BubblePopGame';
import TracingGame from './games/TracingGame';
import FindInWordGame from './games/FindInWordGame';
import DragToMatchGame from './games/DragToMatchGame';
import LetterSlotGame from './games/LetterSlotGame';
import SortLettersGame from './games/SortLettersGame';
import SoundMatchGame from './games/SoundMatchGame';
import CatchGame from './games/CatchGame';
import MemoryMatchGame from './games/MemoryMatchGame';
import HarakatGame from './games/HarakatGame';
import CombineLettersGame from './games/CombineLettersGame';
import WordBuildingGame from './games/WordBuildingGame';
import SentenceReadingGame from './games/SentenceReadingGame';

const MASCOT = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663317811558/JhGQquPdHPqw2LEAWe34js/mascot-moon-4TKGwbdD2xAUvRBjLqdhwG.webp';

export default function LetterPlay() {
  const params = useParams<{ lessonId: string; letterIndex: string }>();
  const [, navigate] = useLocation();
  const { addStars, completeActivity, completeLesson, completedLessons } = useProgress();
  
  const lessonId = parseInt(params.lessonId || '1');
  const letterIdx = parseInt(params.letterIndex || '0');
  
  const lessonLetters = useMemo(() => getLettersForLesson(lessonId), [lessonId]);
  const currentLetter = lessonLetters[letterIdx] || arabicLetters[0];
  
  // Calculate how many distractors are available (previously learned letters)
  const distractorCount = useMemo(() => 
    getAvailableDistractorCount(currentLetter, lessonId, letterIdx, completedLessons),
    [currentLetter, lessonId, letterIdx, completedLessons]
  );
  
  // Get the progressive game sequence based on available distractors
  const gameSequence = useMemo(() => 
    getProgressiveGameSequence(distractorCount),
    [distractorCount]
  );
  
  // Get actual distractor letters for games that need them
  const distractorLetters = useMemo(() => 
    getProgressiveDistractors(currentLetter, lessonId, letterIdx, completedLessons, Math.min(distractorCount, 6)),
    [currentLetter, lessonId, letterIdx, completedLessons, distractorCount]
  );
  
  // Support ?game=N query param for testing
  const searchParams = new URLSearchParams(window.location.search);
  const startGame = parseInt(searchParams.get('game') || '0');
  const [gameIndex, setGameIndex] = useState(startGame);
  const [showTransition, setShowTransition] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [showLessonComplete, setShowLessonComplete] = useState(false);

  const currentGame = gameSequence[gameIndex];

  const handleGameComplete = useCallback((starsEarned: number = 1) => {
    setTotalStars(prev => prev + starsEarned);
    addStars(starsEarned);
    
    if (gameIndex < gameSequence.length - 1) {
      setShowTransition(true);
      setTimeout(() => {
        setShowTransition(false);
        setGameIndex(prev => prev + 1);
      }, 2000);
    } else {
      // All games for this letter complete
      completeActivity(lessonId, `letter-${currentLetter.id}`);
      
      if (letterIdx < lessonLetters.length - 1) {
        setShowTransition(true);
        playCelebrationSound();
        setTimeout(() => {
          navigate(`/play/${lessonId}/${letterIdx + 1}`);
          setGameIndex(0);
          setShowTransition(false);
        }, 2500);
      } else {
        completeLesson(lessonId);
        playCelebrationSound();
        setShowLessonComplete(true);
      }
    }
  }, [gameIndex, gameSequence.length, letterIdx, lessonLetters.length, lessonId, currentLetter.id, addStars, completeActivity, completeLesson, navigate]);

  const handleSkip = useCallback(() => {
    if (gameIndex < gameSequence.length - 1) {
      setGameIndex(prev => prev + 1);
    } else {
      handleGameComplete(0);
    }
  }, [gameIndex, gameSequence.length, handleGameComplete]);

  // Render the current game with progressive props
  const renderGame = () => {
    if (!currentGame) return null;
    
    const gameProps = {
      letter: currentLetter,
      allLetters: arabicLetters,
      lessonLetters: lessonLetters,
      distractorLetters: distractorLetters,
      distractorCount: distractorCount,
      onComplete: handleGameComplete,
      onSkip: handleSkip,
    };

    switch (currentGame.type) {
      case 'letter-intro':
        return <LetterIntroGame {...gameProps} />;
      case 'word-cards':
        return <WordCardsGame {...gameProps} />;
      case 'tracing':
        return <TracingGame {...gameProps} />;
      case 'find-in-word':
        return <FindInWordGame {...gameProps} />;
      case 'drag-to-match':
        return <DragToMatchGame {...gameProps} />;
      case 'letter-slot':
        return <LetterSlotGame {...gameProps} />;
      case 'sort-letters':
        return <SortLettersGame {...gameProps} />;
      case 'bubble-pop':
        return <BubblePopGame {...gameProps} />;
      case 'sound-match':
        return <SoundMatchGame {...gameProps} />;
      case 'catch-game':
        return <CatchGame {...gameProps} />;
      case 'memory-match':
        return <MemoryMatchGame {...gameProps} />;
      case 'harakat':
        return <HarakatGame {...gameProps} />;
      case 'combine-letters':
        return <CombineLettersGame {...gameProps} />;
      case 'word-building':
        return <WordBuildingGame {...gameProps} />;
      case 'sentence-reading':
        return <SentenceReadingGame {...gameProps} />;
      default:
        return <LetterIntroGame {...gameProps} />;
    }
  };

  // Lesson complete screen
  if (showLessonComplete) {
    const lesson = lessons.find(l => l.id === lessonId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-100 via-amber-50 to-teal-50 p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: ['#F5A623', '#E8567F', '#0D7377', '#9B59B6', '#2ECC71'][i % 5],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ 
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                y: [0, -100 - Math.random() * 200],
                x: [(Math.random() - 0.5) * 200],
              }}
              transition={{ duration: 2, delay: i * 0.1 }}
            />
          ))}
          
          <motion.img
            src={MASCOT}
            alt="Hilal"
            className="w-32 h-32 mx-auto mb-6"
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 1, repeat: 2 }}
          />
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-teal-700 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Amazing! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
            You completed {lesson?.title}!
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-2xl">🌙</span>
            <span className="text-2xl font-bold text-amber-600">{totalStars} moons earned!</span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/levels')}
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xl font-bold rounded-full shadow-lg"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Continue
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-amber-50">
      {/* Top bar with progress */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-amber-100 z-20">
        <button
          onClick={() => navigate(`/lesson/${lessonId}`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <span className="text-xl">✕</span>
        </button>
        
        {/* Game progress dots */}
        <div className="flex items-center gap-1.5">
          {gameSequence.map((g, i) => (
            <div
              key={`${g.type}-${i}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i < gameIndex ? 'w-6 bg-teal-500' :
                i === gameIndex ? 'w-8 bg-amber-500' :
                'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Moons earned */}
        <div className="flex items-center gap-1 bg-amber-50 rounded-full px-3 py-1">
          <span className="text-sm">🌙</span>
          <span className="font-bold text-amber-700 text-sm">{totalStars}</span>
        </div>
      </div>

      {/* Letter indicator */}
      <div className="flex items-center justify-center gap-3 py-2 bg-gradient-to-r from-teal-50 to-amber-50">
        <span className="text-3xl font-bold arabic-text" style={{ color: currentLetter.color }}>
          {currentLetter.letter}
        </span>
        <span className="text-sm font-semibold text-gray-500">
          {currentLetter.name} • {currentGame?.title || 'Loading...'}
        </span>
      </div>

      {/* Game area */}
      <div className="flex-1 relative" style={{ minHeight: '60vh' }}>
        <AnimatePresence mode="wait">
          {showTransition ? (
            <motion.div
              key="transition"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-amber-100 to-teal-50 z-10"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: 2 }}
                className="text-6xl mb-4"
              >
                🌙
              </motion.div>
              <h2 className="text-2xl font-bold text-teal-700" style={{ fontFamily: 'var(--font-heading)' }}>
                {gameIndex < gameSequence.length - 1 ? 'Great job!' : 
                 letterIdx < lessonLetters.length - 1 ? `Next: ${lessonLetters[letterIdx + 1]?.name}!` : 'All done!'}
              </h2>
            </motion.div>
          ) : (
            <motion.div
              key={`game-${gameIndex}-${letterIdx}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="absolute inset-0"
            >
              {renderGame()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
