/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FlashcardSet, DeckProgress } from '../types';
import { saveDeckProgress } from '../data';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  Lightbulb, 
  Award,
  Sparkles,
  Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FlashcardViewerProps {
  deck: FlashcardSet;
  initialProgress: DeckProgress;
  onBack: () => void;
  onProgressUpdate: () => void;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({
  deck,
  initialProgress,
  onBack,
  onProgressUpdate
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialProgress.currentCardIndex);
  const [cardRatings, setCardRatings] = useState<Record<string, 'easy' | 'medium' | 'hard'>>(initialProgress.cardRatings);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [shuffledOrder, setShuffledOrder] = useState<number[] | null>(null);

  // Determine card order: shuffled or original
  const cardOrder = shuffledOrder ?? deck.cards.map((_, i) => i);
  const orderedCards = shuffledOrder ? shuffledOrder.map(i => deck.cards[i]) : deck.cards;
  const cards = orderedCards;
  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  // Sync index to local storage whenever it changes
  useEffect(() => {
    if (!isFinished && currentCard) {
      const progress: DeckProgress = {
        currentCardIndex: currentIndex,
        cardRatings,
        lastStudiedAt: new Date().toISOString()
      };
      saveDeckProgress(deck.id, progress);
      onProgressUpdate();
    }
  }, [currentIndex, cardRatings, isFinished, deck.id]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFinished) return;

      const key = event.key.toLowerCase();
      if (key === ' ' || event.code === 'Space') {
        event.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (key === 'arrowright') {
        event.preventDefault();
        handleNext();
      } else if (key === 'arrowleft') {
        event.preventDefault();
        handlePrev();
      } else if (key === 'h') {
        event.preventDefault();
        if (currentCard?.hint) {
          setShowHint(prev => !prev);
        }
      } else if (isFlipped) {
        if (key === '1') {
          event.preventDefault();
          handleRate('hard');
        } else if (key === '2') {
          event.preventDefault();
          handleRate('medium');
        } else if (key === '3') {
          event.preventDefault();
          handleRate('easy');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, isFinished, currentCard]);

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setDirection('forward');
      setIsFlipped(false);
      setShowHint(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 50);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection('backward');
      setIsFlipped(false);
      setShowHint(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 50);
    }
  };

  const handleRate = (rating: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;

    setCardRatings(prev => {
      const updated = { ...prev, [currentCard.id]: rating };
      return updated;
    });

    // Short delay for audio-visual feedback, then auto-advance
    setTimeout(() => {
      if (currentIndex < totalCards - 1) {
        handleNext();
      } else {
        setIsFinished(true);
      }
    }, 200);
  };

  const handleReset = () => {
    if (window.confirm('确定要重置当前套牌的学习进度吗？所有已掌握状态将被清除。')) {
      setCurrentIndex(0);
      setCardRatings({});
      setIsFlipped(false);
      setShowHint(false);
      setIsFinished(false);
      
      const resetProgress: DeckProgress = {
        currentCardIndex: 0,
        cardRatings: {},
        lastStudiedAt: new Date().toISOString()
      };
      saveDeckProgress(deck.id, resetProgress);
      onProgressUpdate();
    }
  };

  const handleRestartSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setIsFinished(false);
  };

  const handleShuffle = () => {
    const indices = deck.cards.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledOrder(indices);
    setCurrentIndex(0);
    setCardRatings({});
    setIsFlipped(false);
    setShowHint(false);
    setIsFinished(false);

    const resetProgress: DeckProgress = {
      currentCardIndex: 0,
      cardRatings: {},
      lastStudiedAt: new Date().toISOString()
    };
    saveDeckProgress(deck.id, resetProgress);
    onProgressUpdate();
  };

  // Calculating overall current progress
  const answeredCount = cards.filter(c => cardRatings[c.id]).length;
  const progressPercent = Math.round((answeredCount / totalCards) * 100);

  // Stats calculation for the finish screen
  const easyCount = cards.filter(c => cardRatings[c.id] === 'easy').length;
  const mediumCount = cards.filter(c => cardRatings[c.id] === 'medium').length;
  const hardCount = cards.filter(c => cardRatings[c.id] === 'hard').length;
  const unratedCount = totalCards - answeredCount;

  // Slide animations settings for the flashcard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideVariants: any = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? '80%' : '-80%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 400, damping: 38 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? '-80%' : '80%',
      opacity: 0,
      transition: {
        x: { type: 'spring' as const, stiffness: 400, damping: 38 },
        opacity: { duration: 0.15 }
      }
    })
  };
  return (
    <div id="flashcard-viewer-container" className="w-full max-w-[100rem] mx-auto px-2 sm:px-4 lg:px-6 py-3 flex flex-col flex-1">
      
      {/* Top bar: back + title */}
      <div className="flex justify-between items-center shrink-0 mb-2">
        <button
          id="btn-back-to-dashboard"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 bg-white dark:bg-[#0d1b13] hover:bg-emerald-50 dark:hover:bg-[#183125] rounded-xl sm:rounded-2xl border border-emerald-100/60 dark:border-emerald-900/30 transition-all cursor-pointer text-xs font-bold shadow-xs hover:shadow-sm"
        >
          <ChevronLeft size={15} /> <span className="hidden sm:inline">返回</span><span className="sm:hidden">返回</span>
        </button>
        <div className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 truncate max-w-[40%] sm:max-w-xs text-center">
          {deck.title}
        </div>
        <div className="w-16 sm:w-24" /> {/* spacer */}
      </div>

      {/* Progress bar row - always visible */}
      <div className="flex items-center gap-3 shrink-0 mb-3">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
          {currentIndex + 1} / {totalCards}
        </span>
        <div className="flex-1 h-2 bg-emerald-100/60 dark:bg-[#0a1410] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {!isFinished ? (
        <div className="flex flex-1 flex-col xl:flex-row gap-3 min-h-0">
          
          {/* LEFT: MAIN STUDY AND FLASHCARD ZONE */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
            
            {/* Flashcard with 3D Flip - fills available space */}
            <div className="flex-1 perspective-1000 cursor-pointer select-none relative min-h-[180px] max-h-[38dvh] xl:max-h-none overflow-hidden">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full h-full absolute inset-0"
                >
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full h-full relative transform-style-3d transition-transform duration-500 ease-out"
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                  >
                    {/* FRONT SIDE (Question) */}
                    <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-[#0d1b13] border border-emerald-50/50 dark:border-emerald-900/30 rounded-[2.5rem] p-3 sm:p-8 md:p-12 card-shadow flex flex-col justify-between overflow-hidden">
                      {/* Decorative giant serif quotation marks */}
                      <div className="absolute top-2 left-3 text-emerald-200/20 dark:text-emerald-800/10 font-serif text-[3rem] sm:text-[10rem] leading-none opacity-40 select-none pointer-events-none">“</div>
                      <div className="absolute bottom-2 right-3 text-emerald-200/20 dark:text-emerald-800/10 font-serif text-[3rem] sm:text-[10rem] leading-none opacity-40 select-none pointer-events-none">”</div>

                      <div className="flex justify-between items-center z-10 relative">
                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-350 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/20">
                          卡片 #{currentIndex + 1}
                        </span>
                        {currentCard?.difficulty && (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border ${
                            currentCard.difficulty === 'easy' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-350 border-emerald-100/50 dark:border-emerald-900/20'
                              : currentCard.difficulty === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-350 border-amber-100/50 dark:border-amber-900/20'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-350 border-rose-100/50 dark:border-rose-900/20'
                          }`}>
                            难度: {currentCard.difficulty === 'easy' ? '简易' : currentCard.difficulty === 'medium' ? '适中' : '较难'}
                          </span>
                        )}
                      </div>

                      <div className="my-auto text-center z-10 relative max-w-xl mx-auto px-2">
                        <MarkdownRenderer
                          content={currentCard?.question ?? ''}
                          className="text-base sm:text-xl md:text-2xl font-bold leading-snug text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-100 dark:border-emerald-950/30 z-10 relative">
                        <div>
                          {currentCard?.hint && (
                            <button
                              id="btn-toggle-hint"
                              onClick={(e) => {
                                e.stopPropagation(); // prevent flipping the card
                                setShowHint(!showHint);
                              }}
                              className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-amber-150 dark:border-amber-900/30"
                            >
                              <Lightbulb size={16} className="text-amber-500" />
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-emerald-200/40 flex items-center gap-1.5 font-bold bg-slate-50 dark:bg-[#0d1c14] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-emerald-950/30">
                          <Eye size={13} className="text-emerald-500" /> 点击卡片看解答
                        </span>
                      </div>

                      {/* Hint Display Card Overlay */}
                      {showHint && currentCard?.hint && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-16 sm:bottom-20 left-4 sm:left-8 right-4 sm:right-8 lg:left-16 lg:right-16 bg-amber-50/95 dark:bg-[#20180d]/95 border border-amber-250/50 dark:border-amber-900/30 rounded-2xl p-4 shadow-md text-xs text-amber-900 dark:text-amber-200 leading-relaxed z-20 flex gap-2.5"
                          onClick={(e) => e.stopPropagation()} // prevent flip when reading hint
                        >
                          <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-extrabold text-amber-950 dark:text-amber-300">关键线索：</strong>
                            {currentCard.hint}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* BACK SIDE (Answer) */}
                    <div 
                      className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-[#0d1b13] border border-emerald-100/80 dark:border-emerald-900/30 rounded-[2.5rem] p-3 sm:p-8 md:p-12 card-shadow flex flex-col justify-between rotate-y-180 overflow-hidden"
                    >
                      {/* Decorative background element */}
                      <div className="absolute top-2 left-3 text-emerald-100/20 dark:text-emerald-800/10 font-serif text-[3rem] sm:text-[10rem] leading-none opacity-40 select-none pointer-events-none">“</div>
                      <div className="absolute bottom-2 right-3 text-emerald-100/20 dark:text-emerald-800/10 font-serif text-[3rem] sm:text-[10rem] leading-none opacity-40 select-none pointer-events-none">”</div>

                      <div className="flex justify-between items-center z-10 relative">
                        <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs">
                          标准解答 ANSWER
                        </span>
                        <span className="text-xs text-slate-400 dark:text-emerald-250/50 font-mono">
                          再次点击翻回正面
                        </span>
                      </div>

                      <div className="my-auto py-1 overflow-y-auto max-h-[100px] sm:max-h-[180px] pr-2 z-10 text-center relative scrollbar-thin">
                        <MarkdownRenderer
                          content={currentCard?.answer ?? ''}
                          className="text-slate-800 dark:text-slate-100 text-xs sm:text-sm md:text-base leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-emerald-950/30 z-10 relative">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-emerald-200/50 bg-slate-50 dark:bg-[#0d1c14] px-2.5 py-1 rounded-lg border border-slate-100 dark:border-emerald-950/30">
                          评定历史:{' '}
                          <span className={`font-black ${
                            cardRatings[currentCard?.id] === 'easy' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : cardRatings[currentCard?.id] === 'medium' 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : cardRatings[currentCard?.id] === 'hard' 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : 'text-slate-400'
                          }`}>
                            {cardRatings[currentCard?.id] === 'easy' ? '已掌握' : cardRatings[currentCard?.id] === 'medium' ? '较模糊' : cardRatings[currentCard?.id] === 'hard' ? '生疏' : '暂无'}
                          </span>
                        </span>
                        <span className="text-xs text-slate-400 dark:text-emerald-250/50 flex items-center gap-1 font-semibold">
                          点击卡片翻回正面
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom nav bar - desktop: only nav; mobile: nav + rating + stats */}
            {/* Desktop nav bar */}
            <div className="hidden xl:flex shrink-0 items-center justify-between bg-white dark:bg-[#0d1b13] rounded-2xl border border-emerald-100/40 dark:border-emerald-900/30 p-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  id="btn-navigate-prev"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    currentIndex === 0
                      ? 'bg-slate-50 dark:bg-[#0a1410] border-slate-100 dark:border-emerald-950/20 text-slate-300 dark:text-emerald-800/40 cursor-not-allowed'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-150 dark:border-emerald-900/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#183125]'
                  }`}
                >
                  <ChevronLeft size={16} /> 上一张
                </button>
                <span className="text-xs text-slate-400 dark:text-slate-500 px-2 font-mono">
                  {currentIndex + 1} / {totalCards}
                </span>
                <button
                  id="btn-navigate-next"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-150 dark:border-emerald-900/30 bg-white dark:bg-[#0d1b13] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#183125] font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  {currentIndex === totalCards - 1 ? '完成' : '下一张'} <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-[#0a1410] hover:bg-slate-100 dark:hover:bg-[#183125] rounded-xl border border-slate-150 dark:border-emerald-900/20 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  title="打乱顺序"
                >
                  <Shuffle size={13} /> 打乱
                </button>
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-[#0a1410] hover:bg-slate-100 dark:hover:bg-[#183125] rounded-xl border border-slate-150 dark:border-emerald-900/20 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <Eye size={14} /> {isFlipped ? '翻回正面' : '翻转'}
                </button>
                <button
                  id="btn-reset-deck-progress"
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-white dark:bg-[#0d1b13] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-rose-100/50 dark:border-rose-900/30 transition-all cursor-pointer text-xs font-bold"
                >
                  <RotateCcw size={13} /> 重置
                </button>
              </div>
            </div>

            {/* Mobile rating card - above nav */}
            <div className="xl:hidden shrink-0 bg-white dark:bg-[#0d1b13] rounded-2xl border border-emerald-100/40 dark:border-emerald-900/30 p-2.5 shadow-xs">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cardRatings[currentCard?.id] === 'hard'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 font-extrabold shadow-sm'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-100 dark:border-emerald-900/20 text-slate-600 dark:text-slate-400 hover:bg-rose-50/40 dark:hover:bg-[#183125]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-xs font-bold">生疏</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRate('medium'); }}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cardRatings[currentCard?.id] === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-extrabold shadow-sm'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-100 dark:border-emerald-900/20 text-slate-600 dark:text-slate-400 hover:bg-amber-50/40 dark:hover:bg-[#183125]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-bold">模糊</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cardRatings[currentCard?.id] === 'easy'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-350 font-extrabold shadow-sm'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-100 dark:border-emerald-900/20 text-slate-600 dark:text-slate-400 hover:bg-emerald-50/40 dark:hover:bg-[#183125]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold">掌握</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-emerald-950/30 text-[10px] text-slate-400 dark:text-slate-500">
                <span>已掌握 <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{easyCount}</strong></span>
                <span>已评估 <strong className="text-slate-600 dark:text-slate-300 font-mono">{answeredCount}/{totalCards}</strong></span>
                <span>进度 <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{progressPercent}%</strong></span>
              </div>
            </div>

            {/* Mobile nav bar - below rating */}
            <div className="xl:hidden shrink-0 bg-white dark:bg-[#0d1b13] rounded-2xl border border-emerald-100/40 dark:border-emerald-900/30 p-2 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  id="btn-navigate-prev"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`shrink-0 flex items-center justify-center p-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    currentIndex === 0
                      ? 'bg-slate-50 dark:bg-[#0a1410] border-slate-100 dark:border-emerald-950/20 text-slate-300 dark:text-emerald-800/40 cursor-not-allowed'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-150 dark:border-emerald-900/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#183125]'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">{currentIndex + 1}/{totalCards}</span>
                <button
                  onClick={handleShuffle}
                  className="shrink-0 flex items-center justify-center p-2 bg-slate-50 dark:bg-[#0a1410] hover:bg-slate-100 dark:hover:bg-[#183125] rounded-xl border border-slate-150 dark:border-emerald-900/20 text-slate-600 dark:text-slate-300 transition-colors"
                  title="打乱顺序"
                >
                  <Shuffle size={14} />
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="shrink-0 flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 dark:bg-[#0a1410] hover:bg-slate-100 dark:hover:bg-[#183125] rounded-xl border border-slate-150 dark:border-emerald-900/20 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Eye size={14} />
                </button>
                <button
                  id="btn-navigate-next"
                  onClick={handleNext}
                  className="shrink-0 flex items-center justify-center p-2 rounded-xl border border-slate-150 dark:border-emerald-900/30 bg-white dark:bg-[#0d1b13] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#183125] font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  {currentIndex === totalCards - 1 ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: DESKTOP RATING SIDEBAR */}
          <aside className="hidden xl:flex xl:w-56 flex-col gap-3 shrink-0">
            <div className="bg-white dark:bg-[#0d1b13] rounded-[2rem] border border-emerald-100/40 dark:border-emerald-900/30 p-5 shadow-xs flex flex-col transition-colors">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 text-center">
                评估
              </h3>
              <div className="space-y-2.5">
                <button
                  id="rate-easy-btn"
                  onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    cardRatings[currentCard?.id] === 'easy'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-100 dark:border-emerald-900/30 text-slate-700 dark:text-slate-300 hover:bg-emerald-50/40 dark:hover:bg-[#183125] hover:border-emerald-200 dark:hover:border-emerald-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold">掌握</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#0a1410] text-[10px] rounded text-slate-400 dark:text-slate-500 font-mono font-bold">3</kbd>
                </button>
                <button
                  id="rate-medium-btn"
                  onClick={(e) => { e.stopPropagation(); handleRate('medium'); }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    cardRatings[currentCard?.id] === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-black shadow-xs'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-100 dark:border-emerald-900/30 text-slate-700 dark:text-slate-300 hover:bg-amber-50/40 dark:hover:bg-[#183125] hover:border-amber-200 dark:hover:border-amber-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold">模糊</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#0a1410] text-[10px] rounded text-slate-400 dark:text-slate-500 font-mono font-bold">2</kbd>
                </button>
                <button
                  id="rate-hard-btn"
                  onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    cardRatings[currentCard?.id] === 'hard'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 font-black shadow-xs'
                      : 'bg-white dark:bg-[#0d1b13] border-slate-100 dark:border-emerald-900/30 text-slate-700 dark:text-slate-300 hover:bg-rose-50/40 dark:hover:bg-[#183125] hover:border-rose-200 dark:hover:border-rose-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold">生疏</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#0a1410] text-[10px] rounded text-slate-400 dark:text-slate-500 font-mono font-bold">1</kbd>
                </button>
              </div>
            </div>

            {/* Desktop stats */}
            <div className="bg-white dark:bg-[#0d1b13] rounded-[2rem] border border-emerald-100/40 dark:border-emerald-900/30 p-5 shadow-xs transition-colors">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 text-center">
                统计
              </h3>
              <div className="space-y-2 text-center">
                <div className="bg-[#fcfdfd] dark:bg-[#0a1410] p-2.5 rounded-xl border border-emerald-50 dark:border-emerald-950/20">
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold">已掌握</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{easyCount}</span>
                </div>
                <div className="bg-[#fcfdfd] dark:bg-[#0a1410] p-2.5 rounded-xl border border-emerald-50 dark:border-emerald-950/20">
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold">已评估</span>
                  <span className="text-base font-extrabold text-slate-700 dark:text-slate-200 font-mono">{answeredCount}/{totalCards}</span>
                </div>
                <div className="bg-[#f2fcf6]/50 dark:bg-[#0a1410] p-2.5 rounded-xl border border-emerald-100/30 dark:border-emerald-900/20">
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold">进度</span>
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">{progressPercent}%</span>
                </div>
              </div>
            </div>
          </aside>

        </div>
      ) : (
        /* CONGRATULATIONS / RESULTS COMPONENT */
        <motion.div
          id="congratulations-screen"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#0d1b13] border border-emerald-100/50 dark:border-emerald-900/30 rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-md text-center max-w-xl mx-auto overflow-hidden relative"
        >
          {/* Confetti-like decoration circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-br-full -z-0 pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-50/40 dark:bg-teal-950/10 rounded-tl-full -z-0 pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-100 dark:shadow-none">
              <Award size={36} className="text-white animate-bounce" />
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">🎉 恭喜！已学完本套牌</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              每一张卡片都是知识的小火花，以下是本轮进度概览：
            </p>

            {/* Results distribution bar & breakdown */}
            <div className="space-y-4 max-w-md mx-auto mb-8 bg-slate-50/60 dark:bg-[#0a1410] p-5 rounded-3xl border border-emerald-100/30 dark:border-emerald-900/20">
              {/* Stacked single bar chart */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                  <span>学习进度分布</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">共 {totalCards} 张卡片</span>
                </div>
                
                <div className="w-full h-4 bg-slate-100 dark:bg-[#0d1b13] rounded-full flex overflow-hidden">
                  <div 
                    style={{ width: `${(easyCount / totalCards) * 100}%` }} 
                    className="bg-emerald-400 h-full transition-all duration-500" 
                    title={`已掌握: ${easyCount}张`}
                  />
                  <div 
                    style={{ width: `${(mediumCount / totalCards) * 100}%` }} 
                    className="bg-amber-400 h-full transition-all duration-500" 
                    title={`较模糊: ${mediumCount}张`}
                  />
                  <div 
                    style={{ width: `${(hardCount / totalCards) * 100}%` }} 
                    className="bg-rose-400 h-full transition-all duration-500" 
                    title={`生疏: ${hardCount}张`}
                  />
                  <div 
                    style={{ width: `${(unratedCount / totalCards) * 100}%` }} 
                    className="bg-slate-200 dark:bg-[#20342a] h-full transition-all duration-500" 
                    title={`未评估: ${unratedCount}张`}
                  />
                </div>
              </div>

              {/* Badges and descriptions */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="flex items-center gap-2 bg-white dark:bg-[#0a1410] p-2.5 rounded-xl border border-slate-100/60 dark:border-emerald-950/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">已完全掌握</div>
                    <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200 font-mono">{easyCount} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">张</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-[#0a1410] p-2.5 rounded-xl border border-slate-100/60 dark:border-emerald-950/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">较模糊需复习</div>
                    <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200 font-mono">{mediumCount} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">张</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-[#0a1410] p-2.5 rounded-xl border border-slate-100/60 dark:border-emerald-950/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">极生疏需重学</div>
                    <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200 font-mono">{hardCount} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">张</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-[#0a1410] p-2.5 rounded-xl border border-slate-100/60 dark:border-emerald-950/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-[#20342a] shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">暂未评估</div>
                    <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200 font-mono">{unratedCount} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">张</span></div>
                  </div>
                </div>
              </div>

              {/* Motivational message */}
              <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed text-center bg-emerald-50/50 dark:bg-emerald-950/20 py-2.5 px-3 rounded-xl">
                {easyCount === totalCards ? (
                  '✨ 太棒了！已完全掌握本套牌全部卡片！'
                ) : easyCount + mediumCount > totalCards * 0.7 ? (
                  '🎉 表现极佳！大部分知识点已拿下，再温习一两次即可完美。'
                ) : (
                  '💪 好的开始！坚持每天复习，记忆会更牢固。'
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                id="btn-restart-learning"
                onClick={handleRestartSession}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-[#193225] hover:bg-emerald-100 dark:hover:bg-[#1f3f2f] rounded-xl transition-all cursor-pointer"
              >
                再次挑战此套牌
              </button>
              
              <button
                id="btn-back-to-home"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                探索更多套牌
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
