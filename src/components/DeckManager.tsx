/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FlashcardSet, Flashcard } from '../types';
import { Plus, Trash2, X, AlertCircle, Save, Layers, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';

interface DeckManagerProps {
  existingDeck?: FlashcardSet | null;
  onSave: (deck: FlashcardSet) => void;
  onClose: () => void;
}

const PRESET_CATEGORIES = ['自己的', '生物技术'];

export const DeckManager: React.FC<DeckManagerProps> = ({
  existingDeck,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('自己的');
  const [cards, setCards] = useState<Omit<Flashcard, 'id'>[]>([
    { question: '', answer: '', hint: '', difficulty: 'medium' }
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [showAiHelper, setShowAiHelper] = useState(false);
  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);

  /** Parse AI-generated cards from code blocks:
   *  ```(optional)
   *  Q: 问题内容
   *  A: 答案内容
   *  H: 提示线索（可选）
   *  D: easy/medium/hard（可选，默认 medium）
   *  ```
   */
  const handleParseAiOutput = () => {
    const parsed: Omit<Flashcard, 'id'>[] = [];

    // Extract content from code blocks first, or use raw text
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    let match;
    const blocks: string[] = [];
    let lastIndex = 0;

    while ((match = codeBlockRegex.exec(aiOutput)) !== null) {
      // Also capture text between code blocks
      if (match.index > lastIndex) {
        blocks.push(aiOutput.slice(lastIndex, match.index).trim());
      }
      blocks.push(match[1].trim());
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < aiOutput.length) {
      blocks.push(aiOutput.slice(lastIndex).trim());
    }

    // If no code blocks found, treat entire input as one block
    const contentBlocks = blocks.length > 0 ? blocks : [aiOutput];

    for (const block of contentBlocks) {
      // Split block by --- separator lines
      const cardBlocks = block.split(/^-{3,}\s*$/m);

      for (const cardBlock of cardBlocks) {
        const lines = cardBlock.trim().split('\n');
        let question = '';
        let answer = '';
        let hint = '';
        let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

        for (const line of lines) {
          const qMatch = line.match(/^[Q问][：:]\s*(.+)/);
          const aMatch = line.match(/^[A答][：:]\s*(.+)/);
          const hMatch = line.match(/^[H提][：:]\s*(.+)/);
          const dMatch = line.match(/^[D难][：:]\s*(.+)/);
          if (qMatch) question = qMatch[1].trim();
          if (aMatch) answer = aMatch[1].trim();
          if (hMatch) hint = hMatch[1].trim();
          if (dMatch) {
            const d = dMatch[1].trim().toLowerCase();
            if (d.includes('easy') || d.includes('简') || d.includes('易')) difficulty = 'easy';
            else if (d.includes('hard') || d.includes('困') || d.includes('难')) difficulty = 'hard';
            else difficulty = 'medium';
          }
        }
        if (question && answer) {
          parsed.push({ question, answer, hint, difficulty });
        }
      }
    }

    if (parsed.length === 0) {
      // Try to give a more specific error
      const hasQ = /^[Q问]/.test(aiOutput);
      const hasA = /^[A答]/.test(aiOutput);
      const hasCodeBlock = /```/.test(aiOutput);
      let reason = '';
      if (!hasCodeBlock) reason = '未找到代码块 ```';
      else if (!hasQ) reason = '未找到 Q: 或 问：开头的内容';
      else if (!hasA) reason = '未找到 A: 或 答：开头的内容';
      else reason = '请确保 Q 和 A 在同一组内且用 --- 隔开';
      setValidationError(`未能解析出卡片：${reason}`);
      return;
    }
    // Append parsed cards to existing ones
    setCards(prev => [...prev, ...parsed]);
    setAiOutput('');
    setAiPrompt('');
    setShowAiHelper(false);
    setValidationError(null);
  };

  // Load existing deck data if in edit mode
  useEffect(() => {
    if (existingDeck) {
      setTitle(existingDeck.title);
      setDescription(existingDeck.description);
      setCategory(existingDeck.category);
      setCards(existingDeck.cards.map(({ question, answer, hint, difficulty }) => ({
        question,
        answer,
        hint: hint || '',
        difficulty: difficulty || 'medium'
      })));
    }
  }, [existingDeck]);

  const handleAddCardInput = () => {
    setCards(prev => [...prev, { question: '', answer: '', hint: '', difficulty: 'medium' }]);
  };

  const handleRemoveCardInput = (index: number) => {
    if (cards.length === 1) {
      setValidationError('一个抽认卡套牌至少需要包含 1 张卡片！');
      return;
    }
    setCards(prev => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleCardFieldChange = (index: number, field: keyof Omit<Flashcard, 'id'>, value: string) => {
    setCards(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
    setValidationError(null);
  };

  const handleSaveDeck = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setValidationError('请输入套牌标题！');
      return;
    }
    if (!description.trim()) {
      setValidationError('请输入套牌的简单描述！');
      return;
    }

    // Validate that all cards have questions and answers
    const invalidCardIndex = cards.findIndex(c => !c.question.trim() || !c.answer.trim());
    if (invalidCardIndex !== -1) {
      setValidationError(`卡片 #${invalidCardIndex + 1} 的“问题”与“答案”不能为空！`);
      return;
    }

    // Map Omit<Flashcard, 'id'> to Flashcard with guaranteed IDs
    const finalCards: Flashcard[] = cards.map((c, i) => ({
      ...c,
      id: existingDeck ? (existingDeck.cards[i]?.id || `card-${Date.now()}-${i}`) : `card-${Date.now()}-${i}`,
      difficulty: c.difficulty as 'easy' | 'medium' | 'hard'
    }));

    const finalDeck: FlashcardSet = {
      id: existingDeck ? existingDeck.id : `deck-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      cards: finalCards,
      createdAt: existingDeck ? existingDeck.createdAt : new Date().toISOString().split('T')[0],
      isCustom: true
    };

    onSave(finalDeck);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden border border-slate-100"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-emerald-50/50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500 rounded-lg text-white">
              <Layers size={16} />
            </span>
            <h2 className="text-base font-bold text-slate-800">
              {existingDeck ? '✏️ 编辑套牌' : '✨ 新建抽认卡套牌'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSaveDeck} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {validationError && !validationError.includes('未能解析') && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-pulse">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Basic Deck Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">套牌名称 *</label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  setValidationError(null);
                }}
                maxLength={40}
                placeholder="例如：日语词汇、语法核心..."
                className="w-full px-4 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-sm transition-all bg-slate-50/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">选择套牌类别 *</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      category === cat
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">描述套牌内容 *</label>
              <input
                type="text"
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  setValidationError(null);
                }}
                maxLength={100}
                placeholder="简要描述本套牌的内容。"
                className="w-full px-4 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-sm transition-all bg-slate-50/30"
              />
            </div>
          </div>

          {/* Manage Cards Title & Add button */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                🗂️ 卡片列表 (共 {cards.length} 张)
              </h3>
              <button
                type="button"
                onClick={handleAddCardInput}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus size={14} /> 添加新卡片
              </button>
            </div>

            {/* Dynamic cards list */}
            <div className="space-y-4">
              {cards.map((card, index) => (
                <div 
                  key={index} 
                  className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 relative space-y-3 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-black text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      CARD #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCardInput(index)}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                      title="移除此卡片"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">问题 *</label>
                      <textarea
                        rows={2}
                        value={card.question}
                        onChange={e => handleCardFieldChange(index, 'question', e.target.value)}
                        placeholder="输入问题或词汇..."
                        className="w-full px-3 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs bg-white resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">答案 *</label>
                      <textarea
                        rows={2}
                        value={card.answer}
                        onChange={e => handleCardFieldChange(index, 'answer', e.target.value)}
                        placeholder="输入对应解答或注释..."
                        className="w-full px-3 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs bg-white resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">提示 (选填)</label>
                      <input
                        type="text"
                        value={card.hint}
                        onChange={e => handleCardFieldChange(index, 'hint', e.target.value)}
                        placeholder="可选的关键线索"
                        className="w-full px-3 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">难度评定</label>
                      <div className="flex gap-2">
                        {['easy', 'medium', 'hard'].map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => handleCardFieldChange(index, 'difficulty', diff)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              card.difficulty === diff
                                ? diff === 'easy'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : diff === 'medium'
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {diff === 'easy' ? '简易' : diff === 'medium' ? '中等' : '困难'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Helper Section */}
          <div className="border-t border-emerald-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAiHelper(!showAiHelper)}
              className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <Sparkles size={14} className="text-emerald-500" />
              {showAiHelper ? '收起' : '用 AI 批量生成卡片'}
              {showAiHelper ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAiHelper && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-3"
              >
                {/* Prompt hint */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                  <div className="flex items-center justify-between mb-1">
                    <strong>📋 将下面的内容复制给 AI：</strong>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `请生成 10 张关于[主题]的抽认卡。
要求：问题不超过 20 字，答案不超过 30 字。
用代码块包含所有卡片，每张卡片用 --- 单独行隔开，格式如下：

\`\`\`
Q: 问题
A: 答案
H: 提示（可选）
D: easy/medium/hard（可选）
---
Q: 问题
A: 答案
H: 提示（可选）
D: easy/medium/hard（可选）
\`\`\``;
                        navigator.clipboard.writeText(text);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/60 hover:bg-amber-200/60 rounded-lg transition-colors cursor-pointer"
                    >
                      复制
                    </button>
                  </div>
                  <div className="relative">
                    <code className="text-[11px] whitespace-pre-wrap bg-white/60 block p-2.5 rounded-lg border border-amber-200/50 leading-relaxed">
{`请生成 10 张关于[主题]的抽认卡。
要求：问题不超过 20 字，答案不超过 30 字。
用代码块包含所有卡片，每张卡片用 --- 单独行隔开，格式如下：

\`\`\`
Q: 问题
A: 答案
H: 提示（可选）
D: easy/medium/hard（可选）
---
Q: 问题
A: 答案
H: 提示（可选）
D: easy/medium/hard（可选）
\`\`\``}
                    </code>
                  </div>
                </div>

                {/* AI output textarea */}
                <textarea
                  ref={aiTextareaRef}
                  value={aiOutput}
                  onChange={e => setAiOutput(e.target.value)}
                  placeholder="在此粘贴 AI 生成的内容..."
                  rows={6}
                  className="w-full px-4 py-3 border border-emerald-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-xs bg-emerald-50/30 resize-none font-mono leading-relaxed"
                />

                {/* Parse button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParseAiOutput}
                    disabled={!aiOutput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={13} /> 解析并添加到卡片列表
                  </button>
                </div>

                {/* AI parse error - shown at bottom for visibility */}
                {validationError && validationError.includes('未能解析') && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            取消
          </button>
          
          <button
            type="button"
            onClick={handleSaveDeck}
            className="flex items-center gap-1 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Save size={14} /> 保存套牌
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
