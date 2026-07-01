/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { FlashcardSet, AllProgress, DeckProgress } from './types';
import { 
  DEFAULT_DECKS, 
  loadCustomDecks, 
  saveCustomDecks, 
  loadAllProgress, 
  saveAllProgress,
  calculateDeckStats 
} from './data';
import { DeckCard } from './components/DeckCard';
import { FlashcardViewer } from './components/FlashcardViewer';
import { DeckManager } from './components/DeckManager';
import { 
  Sparkles, 
  Layers, 
  Plus, 
  Search, 
  Trash2, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  RefreshCw,
  Github,
  Award,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Load initial Dark Mode preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('flashcard_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // State definitions
  const [customDecks, setCustomDecks] = useState<FlashcardSet[]>([]);
  const [progress, setProgress] = useState<AllProgress>({});
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  // Sync dark mode state with document class and localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('flashcard_dark_mode', String(darkMode));
  }, [darkMode]);

  // Load initial data
  useEffect(() => {
    setCustomDecks(loadCustomDecks());
    setProgress(loadAllProgress());
  }, []);

  // Compute merged list of default and custom decks
  const allDecks = useMemo(() => {
    return [...DEFAULT_DECKS, ...customDecks];
  }, [customDecks]);

  // Sync state helpers
  const handleProgressUpdate = () => {
    setProgress(loadAllProgress());
  };

  const handleSaveDeck = (newDeck: FlashcardSet) => {
    if (editingDeckId) {
      // Edit existing custom deck
      const updated = customDecks.map(deck => deck.id === editingDeckId ? newDeck : deck);
      setCustomDecks(updated);
      saveCustomDecks(updated);
      setEditingDeckId(null);
    } else {
      // Add new custom deck
      const updated = [...customDecks, newDeck];
      setCustomDecks(updated);
      saveCustomDecks(updated);
    }
    setIsManagerOpen(false);
  };

  const handleDeleteDeck = (deckId: string) => {
    if (window.confirm('您确定要永久删除这套自定义抽认卡吗？此操作无法撤销。')) {
      const updated = customDecks.filter(deck => deck.id !== deckId);
      setCustomDecks(updated);
      saveCustomDecks(updated);

      // Clean up progress associated with this deck
      const updatedProgress = { ...progress };
      delete updatedProgress[deckId];
      setProgress(updatedProgress);
      saveAllProgress(updatedProgress);

      if (activeDeckId === deckId) {
        setActiveDeckId(null);
      }
    }
  };

  const handleResetAllProgress = () => {
    if (window.confirm('⚠️ 警告：这将清除本应用所有的学习进度和打分数据！自定义套牌将被保留。确定要继续吗？')) {
      setProgress({});
      saveAllProgress({});
      alert('所有学习进度已成功重置。');
    }
  };

  // Find currently active deck object
  const activeDeck = useMemo(() => {
    return allDecks.find(d => d.id === activeDeckId) || null;
  }, [allDecks, activeDeckId]);

  // Categories list
  const categories = useMemo(() => {
    const list = new Set<string>();
    allDecks.forEach(d => list.add(d.category));
    return ['全部', ...Array.from(list)];
  }, [allDecks]);

  // Filter and search decks
  const filteredDecks = useMemo(() => {
    return allDecks.filter(deck => {
      const matchesCategory = selectedCategory === '全部' || deck.category === selectedCategory;
      const matchesSearch = 
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.cards.some(c => c.question.toLowerCase().includes(searchQuery.toLowerCase()) || c.answer.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allDecks, selectedCategory, searchQuery]);

  // Global Study Stats
  const globalStats = useMemo(() => {
    let totalCards = 0;
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    allDecks.forEach(deck => {
      totalCards += deck.cards.length;
      const deckProg = progress[deck.id];
      if (deckProg) {
        deck.cards.forEach(card => {
          const rating = deckProg.cardRatings[card.id];
          if (rating === 'easy') easyCount++;
          else if (rating === 'medium') mediumCount++;
          else if (rating === 'hard') hardCount++;
        });
      }
    });

    const evaluatedCount = easyCount + mediumCount + hardCount;
    const globalPercent = totalCards > 0 ? Math.min(100, Math.round(((easyCount * 1.0 + mediumCount * 0.5) / totalCards) * 100)) : 0;

    return {
      totalCards,
      easyCount,
      mediumCount,
      hardCount,
      evaluatedCount,
      globalPercent
    };
  }, [allDecks, progress]);

  return (
    <div className="min-h-screen bg-transparent selection:bg-emerald-100 selection:text-emerald-900 pb-4 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      
      {/* Decorative ambient elements */}
      <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-[#dcf2e6]/70 to-transparent dark:from-[#11241a] dark:to-transparent -z-10" />

      {/* Main navigation and brand header */}
      <header className="w-full max-w-[100rem] mx-auto px-2 sm:px-4 lg:px-6 pt-10 pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl text-white shadow-sm shadow-emerald-100 dark:shadow-none animate-pulse">
                <BookOpen size={24} />
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                菘蓝的<span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">抽认卡</span>
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              学而时习之，不亦说乎。——《论语》
            </p>
          </div>

          {/* Core Operations Panel */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center justify-center p-2.5 bg-white dark:bg-[#13221b] hover:bg-[#f2fcf6] dark:hover:bg-[#1a3126] text-slate-600 dark:text-emerald-300 rounded-xl border border-slate-150 dark:border-emerald-900/30 shadow-xs transition-all cursor-pointer"
              title={darkMode ? "明亮模式" : "暗色模式"}
            >
              {darkMode ? <Sun size={17} className="text-amber-400 animate-spin-slow" /> : <Moon size={17} />}
            </button>

            <button
              id="btn-create-deck"
              onClick={() => {
                setEditingDeckId(null);
                setIsManagerOpen(true);
              }}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <Plus size={16} /> 新建套牌
            </button>
            
            <button
              id="btn-reset-all"
              onClick={handleResetAllProgress}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white dark:bg-[#13221b] hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-sm font-bold border border-slate-150 dark:border-emerald-900/30 shadow-xs transition-colors cursor-pointer"
              title="清除所有学习记录"
            >
              <RefreshCw size={15} /> 重置所有进度
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-[100rem] mx-auto px-2 sm:px-4 lg:px-6 mt-4 flex flex-col flex-1">
        <AnimatePresence mode="wait">
          {!activeDeckId ? (
            /* DASHBOARD VIEW */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Global Study Progress Dashboard Card */}
              <div className="bg-white dark:bg-[#12231a] rounded-[2rem] border border-emerald-100/40 dark:border-emerald-900/30 card-shadow p-6 md:p-8 relative overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#eefaf4]/40 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">
                      学习统计 OVERALL STATS
                    </span>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                      持之以恒，知识永存
                    </h2>
                    <p className="text-slate-400 dark:text-emerald-200/50 text-xs">
                      每一次回顾都在巩固长时记忆。
                    </p>
                  </div>

                  {/* Main circular metric / percentage */}
                  <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-[#0d1c14] p-4.5 rounded-2xl border border-slate-100 dark:border-emerald-950/40">
                    <div className="w-14 h-14 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white">
                      <Award size={28} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 dark:text-emerald-200/40">总体记忆熟练度</div>
                      <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
                        {globalStats.globalPercent}% <span className="text-xs text-slate-400 dark:text-emerald-200/40 font-normal font-sans">熟练</span>
                      </div>
                    </div>
                  </div>

                  {/* Detail counts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/50 dark:bg-[#0d1c14] p-4 rounded-xl border border-slate-100 dark:border-emerald-950/40 text-center">
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{globalStats.easyCount}</div>
                      <div className="text-[10px] text-slate-400 dark:text-emerald-200/40 flex items-center justify-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} className="text-emerald-500" /> 已掌握
                      </div>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-[#0d1c14] p-4 rounded-xl border border-slate-100 dark:border-emerald-950/40 text-center">
                      <div className="text-lg font-black text-slate-700 dark:text-slate-300 font-mono">
                        {globalStats.evaluatedCount} <span className="text-[10px] font-normal text-slate-400 dark:text-emerald-200/30">/ {globalStats.totalCards}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-emerald-200/40 mt-0.5">已完成评估卡片</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter, Search, and Lists Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                {/* Search field */}
                <div className="relative w-full md:max-w-xs shrink-0">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-emerald-400/60">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索卡片或问题关键字..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#12231a] border border-slate-200 dark:border-emerald-900/40 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/30 text-slate-850 dark:text-slate-100 rounded-2xl transition-all shadow-xs"
                  />
                </div>

                {/* Category selectors */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#12231a] border border-slate-100 dark:border-emerald-900/30 text-slate-500 dark:text-emerald-200/60 hover:bg-slate-50 dark:hover:bg-[#183125] hover:text-slate-800 dark:hover:text-emerald-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deck Grid */}
              {filteredDecks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDecks.map(deck => {
                    const deckProgress = progress[deck.id] || {
                      currentCardIndex: 0,
                      cardRatings: {},
                      lastStudiedAt: ''
                    };
                    return (
                      <DeckCard
                        key={deck.id}
                        deck={deck}
                        progress={deckProgress}
                        onStart={(id) => setActiveDeckId(id)}
                        onEdit={(id) => {
                          setEditingDeckId(id);
                          setIsManagerOpen(true);
                        }}
                        onDelete={handleDeleteDeck}
                      />
                    );
                  })}
                </div>
              ) : (
                /* EMPTY STATE */
                <div className="bg-white dark:bg-[#12231a] rounded-3xl border border-dashed border-slate-200 dark:border-emerald-900/30 p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-[#0d1c14] rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-emerald-400/50">
                    <Search size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">未找到任何套牌</h4>
                    <p className="text-xs text-slate-400 dark:text-emerald-200/50 leading-relaxed">
                      没有匹配到关于“{searchQuery || selectedCategory}”的套牌，可试试清空搜索条件或新建套牌。
                    </p>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-3.5 py-1.5 bg-slate-100 dark:bg-emerald-900/30 hover:bg-slate-200 dark:hover:bg-emerald-900/50 text-slate-600 dark:text-emerald-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      清空搜索
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* FLASHCARD SESSION VIEW */
            <motion.div
              key="viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col flex-1"
            >
              {activeDeck && (
                <FlashcardViewer
                  deck={activeDeck}
                  initialProgress={progress[activeDeckId] || {
                    currentCardIndex: 0,
                    cardRatings: {},
                    lastStudiedAt: ''
                  }}
                  onBack={() => setActiveDeckId(null)}
                  onProgressUpdate={handleProgressUpdate}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating interactive support panel at bottom */}
      <footer className="w-full max-w-[100rem] mx-auto px-2 sm:px-4 lg:px-6 mt-6 text-center">
        <p className="text-[11px] text-slate-400/80 font-mono">
          菘蓝的抽认卡 © 2026
        </p>
      </footer>

      {/* Custom Deck Creator / Editor overlay */}
      <AnimatePresence>
        {isManagerOpen && (
          <DeckManager
            existingDeck={editingDeckId ? customDecks.find(d => d.id === editingDeckId) : null}
            onSave={handleSaveDeck}
            onClose={() => {
              setIsManagerOpen(false);
              setEditingDeckId(null);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
