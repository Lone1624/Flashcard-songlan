/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FlashcardSet, DeckProgress } from '../types';
import { calculateDeckStats } from '../data';
import { BookOpen, CheckCircle, HelpCircle, AlertCircle, Trash2, Edit3, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface DeckCardProps {
  deck: FlashcardSet;
  progress: DeckProgress;
  onStart: (deckId: string) => void;
  onEdit?: (deckId: string) => void;
  onDelete?: (deckId: string) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  progress,
  onStart,
  onEdit,
  onDelete
}) => {
  const stats = calculateDeckStats(deck, progress);
  const totalCards = deck.cards.length;

  // Generate color accents based on category
  const getCategoryColors = (category: string) => {
    switch (category) {
      case '技术开发':
        return { bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-150 dark:border-indigo-900/30', accent: 'from-indigo-400 to-blue-500' };
      case '语言学习':
        return { bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-150 dark:border-amber-900/30', accent: 'from-amber-400 to-orange-500' };
      case '设计与体验':
        return { bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-150 dark:border-rose-900/30', accent: 'from-rose-400 to-pink-500' };
      case '人文艺术':
        return { bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-150 dark:border-teal-900/30', accent: 'from-teal-400 to-emerald-500' };
      default:
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-150 dark:border-emerald-900/30', accent: 'from-emerald-400 to-teal-500' };
    }
  };

  const colors = getCategoryColors(deck.category);

  return (
    <motion.div
      id={`deck-card-${deck.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-[#12231a] rounded-[2rem] border border-emerald-100/40 dark:border-emerald-900/30 card-shadow p-6 flex flex-col justify-between relative overflow-hidden group transition-colors duration-300"
    >
      {/* Decorative top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.accent}`} />

      <div>
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colors.bg}`}>
            {deck.category}
          </span>
          <span className="text-xs text-slate-400 dark:text-emerald-200/40 font-mono flex items-center gap-1">
            <BookOpen size={12} /> {totalCards} 张卡片
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-200 mb-2">
          {deck.title}
        </h3>
        
        <p className="text-slate-500 dark:text-slate-450 text-sm leading-relaxed mb-6 line-clamp-2">
          {deck.description}
        </p>
      </div>

      {/* Progress & Operations panel */}
      <div className="mt-auto space-y-4 pt-4 border-t border-slate-100 dark:border-emerald-950/40">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-emerald-200/50">学习进度</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.percent}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-[#0d1b13] rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full"
            />
          </div>
        </div>

        {/* Mini stats badges */}
        <div className="grid grid-cols-4 gap-1 text-center text-[11px] font-medium text-slate-500 dark:text-emerald-200/60 py-1 bg-slate-50/50 dark:bg-[#0d1c14] rounded-lg border border-slate-100/50 dark:border-emerald-950/30">
          <div className="flex flex-col items-center py-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{stats.easyCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-emerald-200/40 flex items-center gap-0.5 mt-0.5">
              <CheckCircle size={8} className="text-emerald-500 dark:text-emerald-400" /> 已掌握
            </span>
          </div>
          <div className="flex flex-col items-center py-1 border-l border-slate-100 dark:border-emerald-950/30">
            <span className="text-amber-500 dark:text-amber-400 font-bold font-mono">{stats.mediumCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-emerald-200/40 flex items-center gap-0.5 mt-0.5">
              <HelpCircle size={8} className="text-amber-500 dark:text-amber-400" /> 模糊
            </span>
          </div>
          <div className="flex flex-col items-center py-1 border-l border-slate-100 dark:border-emerald-950/30">
            <span className="text-rose-500 dark:text-rose-400 font-bold font-mono">{stats.hardCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-emerald-200/40 flex items-center gap-0.5 mt-0.5">
              <AlertCircle size={8} className="text-rose-500 dark:text-rose-400" /> 模糊
            </span>
          </div>
          <div className="flex flex-col items-center py-1 border-l border-slate-100 dark:border-emerald-950/30">
            <span className="text-slate-500 dark:text-slate-300 font-bold font-mono">{stats.unstartedCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-emerald-200/40 mt-0.5">未学习</span>
          </div>
        </div>

        {/* Interactive Actions */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-1">
          <div className="flex gap-1">
            {onEdit && deck.isCustom && (
              <button
                id={`edit-deck-${deck.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(deck.id);
                }}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                title="编辑"
              >
                <Edit3 size={15} />
              </button>
            )}
            {onDelete && deck.isCustom && (
              <button
                id={`delete-deck-${deck.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(deck.id);
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="删除"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <button
            id={`start-deck-${deck.id}`}
            onClick={() => onStart(deck.id)}
            className="flex-1 max-w-[140px] px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 text-center cursor-pointer flex items-center justify-center gap-1"
          >
            {stats.percent === 100 ? (
              <>
                <Award size={13} /> 重新温习
              </>
            ) : progress.currentCardIndex > 0 ? (
              '继续'
            ) : (
              '开始'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
