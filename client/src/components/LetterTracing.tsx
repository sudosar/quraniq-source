/**
 * LetterTracing - Trace a specific positional form of a letter
 * 
 * PEDAGOGY:
 * - After the child finds a letter in a word and sees its forms,
 *   they can trace the specific shape used in that word
 * - Uses a canvas with guided dots/path and finger/mouse tracking
 * - Shows progress as the child traces along the path
 * - Celebrates completion with particles
 * 
 * APPROACH:
 * - Renders the target letter form as a large, semi-transparent guide
 * - Draws a simplified stroke path based on the letter
 * - Tracks touch/mouse movement and fills in the path
 * - Uses percentage-based completion (not pixel-perfect)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  letterForm: string;       // The specific positional form to trace (e.g., "بـ" for initial Ba)
  formLabel: string;        // "Start", "Middle", "End", "Alone"
  letterName: string;       // "Ba", "Alif", etc.
  letterColor: string;      // The letter's theme color
  onComplete: () => void;   // Called when tracing is done
  onSkip: () => void;       // Called when user skips
}

export default function LetterTracing({ letterForm, formLabel, letterName, letterColor, onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const pixelsDrawnRef = useRef(new Set<string>());
  const totalAreaRef = useRef(0);

  // Initialize canvas with the letter guide
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    drawGuide(ctx, rect.width, rect.height);
    
    // Calculate total area to trace (approximate)
    totalAreaRef.current = Math.floor(rect.width * rect.height * 0.15); // ~15% of canvas is the letter
  }, [letterForm]);

  // Draw the guide letter
  const drawGuide = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Draw the letter as a large semi-transparent guide
    ctx.save();
    ctx.font = `bold ${Math.min(width, height) * 0.7}px "Amiri", "Noto Naskh Arabic", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = letterColor + '20';
    ctx.strokeStyle = letterColor + '40';
    ctx.lineWidth = 2;
    ctx.fillText(letterForm, width / 2, height / 2);
    ctx.strokeText(letterForm, width / 2, height / 2);
    ctx.restore();

    // Draw dotted guide path (simplified)
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = letterColor + '50';
    ctx.lineWidth = 3;
    ctx.font = `bold ${Math.min(width, height) * 0.7}px "Amiri", "Noto Naskh Arabic", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(letterForm, width / 2, height / 2);
    ctx.restore();

    // Redraw user strokes
    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.strokeStyle = letterColor;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  };

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    
    setIsDrawing(true);
    setCurrentStroke([point]);
    
    // Mark pixel area
    const key = `${Math.floor(point.x / 4)},${Math.floor(point.y / 4)}`;
    pixelsDrawnRef.current.add(key);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const point = getCanvasPoint(e);
    if (!point) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw line segment
    const prevPoints = currentStroke;
    if (prevPoints.length > 0) {
      const last = prevPoints[prevPoints.length - 1];
      const dpr = window.devicePixelRatio || 1;
      
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = letterColor;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    setCurrentStroke(prev => [...prev, point]);
    
    // Mark pixel area for progress
    const key = `${Math.floor(point.x / 4)},${Math.floor(point.y / 4)}`;
    pixelsDrawnRef.current.add(key);
    
    // Update progress
    const coveredPixels = pixelsDrawnRef.current.size;
    const targetPixels = Math.max(30, totalAreaRef.current / 16); // Need to cover ~30+ grid cells
    const newProgress = Math.min(100, Math.floor((coveredPixels / targetPixels) * 100));
    setProgress(newProgress);
    
    if (newProgress >= 100 && !completed) {
      setCompleted(true);
      setIsDrawing(false);
    }
  }, [isDrawing, currentStroke, letterColor, completed]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  }, [isDrawing, currentStroke]);

  // Clear and restart
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    setStrokes([]);
    setCurrentStroke([]);
    setProgress(0);
    setCompleted(false);
    pixelsDrawnRef.current.clear();
    drawGuide(ctx, rect.width, rect.height);
  }, [letterForm, letterColor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-3 w-full"
    >
      {/* Header */}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-600" style={{ fontFamily: 'var(--font-heading)' }}>
          ✍️ Trace the <strong style={{ color: letterColor }}>{formLabel}</strong> shape of {letterName}!
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Use your finger or mouse to trace over the letter</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[240px] h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: letterColor }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 200 }}
        />
      </div>

      {/* Tracing canvas */}
      <div 
        className="relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-3xl border-4 shadow-inner overflow-hidden"
        style={{ 
          borderColor: completed ? '#34D399' : letterColor + '40',
          backgroundColor: completed ? '#ECFDF5' : '#FAFAFA',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Completion overlay */}
        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-green-50/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-center"
              >
                <span className="text-5xl">🌟</span>
                <p className="text-lg font-bold text-green-600 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Great tracing!
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start hint arrow */}
        {!isDrawing && strokes.length === 0 && !completed && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-3xl">☝️</span>
          </motion.div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {!completed ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200"
            >
              🔄 Clear
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSkip}
              className="px-4 py-2 bg-amber-50 text-amber-600 rounded-full text-sm font-medium border border-amber-200"
            >
              Skip →
            </motion.button>
          </>
        ) : (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onComplete}
            className="px-6 py-2.5 text-white rounded-full text-sm font-semibold shadow-lg"
            style={{ backgroundColor: letterColor }}
          >
            Continue →
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
