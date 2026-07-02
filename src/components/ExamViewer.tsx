import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, BookOpen, RotateCcw } from 'lucide-react';

const STORAGE_PREFIX = 'exam_progress_';

interface ChoiceQuestion {
  id: string;
  type: 'choice' | 'choice-multi';
  question: string;
  options: string[];
  answer: number | number[];
  explanation: string;
}

interface JudgeQuestion {
  id: string;
  type: 'judge';
  question: string;
  answer: boolean;
  explanation: string;
}

type Question = ChoiceQuestion | JudgeQuestion;

interface ExamSection {
  title: string;
  type: 'choice' | 'judge';
  startIndex: number;
  endIndex: number;
  scorePerQuestion: number;
  questions: Question[];
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  totalScore: number;
  sections: ExamSection[];
}

interface ExamViewerProps {
  exam: ExamData;
  onBack: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ExamViewer: React.FC<ExamViewerProps> = ({ exam, onBack }) => {
  const storageKey = STORAGE_PREFIX + exam.id;

  // Load saved progress from localStorage
  const loadSaved = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const saved = loadSaved();
  const [currentSectionIdx, setCurrentSectionIdx] = useState(saved?.sectionIdx ?? 0);
  const [currentQIdx, setCurrentQIdx] = useState(saved?.qIdx ?? 0);
  const [answers, setAnswers] = useState<Record<string, any>>(saved?.answers ?? {});
  const [showResults, setShowResults] = useState(saved?.showResults ?? false);
  const [submitted, setSubmitted] = useState(false);

  // Save progress whenever state changes (don't save submitted state)
  useEffect(() => {
    const data = { sectionIdx: currentSectionIdx, qIdx: currentQIdx, answers };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [currentSectionIdx, currentQIdx, answers, storageKey]);

  const currentSection = exam.sections[currentSectionIdx];
  const currentQuestion = currentSection?.questions[currentQIdx] as Question | undefined;
  const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
  // Count answered questions (multi-choice with empty array = unanswered)
  const answeredCount = Object.values(answers).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null;
  }).length;

  const handleAnswer = useCallback((qId: string, value: any) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: value }));
  }, [submitted]);

  const handleMultiChoice = useCallback((qId: string, optionIdx: number) => {
    if (submitted) return;
    setAnswers(prev => {
      const current = (prev[qId] as number[]) || [];
      const idx = current.indexOf(optionIdx);
      if (idx === -1) {
        return { ...prev, [qId]: [...current, optionIdx] };
      } else {
        return { ...prev, [qId]: current.filter((i: number) => i !== optionIdx) };
      }
    });
  }, [submitted]);

  const goNext = () => {
    if (!currentSection) return;
    if (currentQIdx < currentSection.questions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
    } else if (currentSectionIdx < exam.sections.length - 1) {
      const nextIdx = currentSectionIdx + 1;
      setCurrentSectionIdx(nextIdx);
      setCurrentQIdx(0);
    }
  };

  const goPrev = () => {
    if (currentQIdx > 0) {
      setCurrentQIdx(prev => prev - 1);
    } else if (currentSectionIdx > 0) {
      const prevIdx = currentSectionIdx - 1;
      const prevSection = exam.sections[prevIdx];
      setCurrentSectionIdx(prevIdx);
      setCurrentQIdx(prevSection.questions.length - 1);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setShowResults(true);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setAnswers({});
    setSubmitted(false);
    setShowResults(false);
    setCurrentSectionIdx(0);
    setCurrentQIdx(0);
  };

  // Calculate score using scorePerQuestion
  const scoreResult = useMemo(() => {
    if (!submitted) return null;
    let correctCount = 0;
    let totalScore = 0;
    let earnedScore = 0;
    for (const section of exam.sections) {
      for (const q of section.questions) {
        const pts = section.scorePerQuestion;
        totalScore += pts;
        const userAns = answers[q.id];
        let isCorrect = false;
        if (q.type === 'choice') {
          isCorrect = userAns === (q as ChoiceQuestion).answer;
        } else if (q.type === 'choice-multi') {
          const cq = q as ChoiceQuestion;
          const ua = (userAns as number[]) || [];
          const ca = cq.answer as number[];
          isCorrect = ua.length === ca.length && ua.every((v: number) => ca.includes(v));
        } else if (q.type === 'judge') {
          isCorrect = userAns === (q as JudgeQuestion).answer;
        }
        if (isCorrect) {
          correctCount++;
          earnedScore += pts;
        }
      }
    }
    return { correct: correctCount, total: totalQuestions, score: earnedScore };
  }, [submitted, answers, exam, totalQuestions]);

  const isCorrect = (q: Question): boolean | null => {
    if (!submitted) return null;
    const userAns = answers[q.id];
    if (q.type === 'choice') {
      return userAns === (q as ChoiceQuestion).answer;
    } else if (q.type === 'choice-multi') {
      const cq = q as ChoiceQuestion;
      const ua = (userAns as number[]) || [];
      const ca = cq.answer as number[];
      return ua.length === ca.length && ua.every((v: number) => ca.includes(v));
    } else {
      return userAns === (q as JudgeQuestion).answer;
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        暂无题目数据
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto px-2 sm:px-4 py-4 flex flex-col min-h-0" style={{ height: 'calc(100dvh - 8rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0d1b13] hover:bg-emerald-50 dark:hover:bg-[#183125] rounded-xl border border-emerald-100/60 dark:border-emerald-900/30 transition-colors">
          <ChevronLeft size={15} /> 返回
        </button>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center truncate max-w-[50%]">
          {exam.title}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          {answeredCount}/{totalQuestions}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 font-mono">
          {Object.keys(answers).length}/{totalQuestions}
        </span>
        <div className="flex-1 h-2 bg-emerald-100/60 dark:bg-[#0a1410] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Section indicator */}
      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-2 shrink-0 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1 rounded-lg inline-block self-start">
        {currentSection.title}
      </div>

      {/* Question card + Navigation - fixed three-row layout */}
      <div className="flex-1 grid grid-rows-[1fr_auto] gap-3 min-h-0 relative">
        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-[#0d1b13] rounded-[2rem] border border-emerald-100/40 dark:border-emerald-900/30 p-4 sm:p-6 card-shadow grid grid-rows-[auto_auto] min-h-0"
          >
            {/* Question text - fixed top */}
            <div className="shrink-0 mb-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#0a1410] px-2 py-0.5 rounded-md mr-2">
                {currentQuestion.type === 'choice' ? '单选题' : currentQuestion.type === 'choice-multi' ? '多选题' : '判断题'}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {currentSection.scorePerQuestion}分
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mt-3 leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Options - fill remaining space */}
            <div className="min-h-0">
              {currentQuestion.type === 'judge' ? (
                <div className="grid grid-cols-2 gap-3 w-full">
                  {[true, false].map(val => {
                    const selected = answers[currentQuestion.id] === val;
                    const correct = submitted && val === (currentQuestion as JudgeQuestion).answer;
                    const wrong = submitted && selected && !correct;
                    return (
                      <button
                        key={String(val)}
                        onClick={() => handleAnswer(currentQuestion.id, val)}
                        disabled={submitted}
                        className={`w-full h-14 flex items-center justify-center rounded-xl border-2 text-center font-bold text-sm transition-all cursor-pointer disabled:cursor-default ${
                          submitted && correct
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                            : submitted && wrong
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-300'
                            : selected
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-[#0d1b13] border-slate-200 dark:border-emerald-900/40 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        {val ? '✓ 正确' : '✗ 错误'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {(currentQuestion as ChoiceQuestion).options.map((opt, idx) => {
                    const isMulti = currentQuestion.type === 'choice-multi';
                    const selected = isMulti
                      ? ((answers[currentQuestion.id] as number[]) || []).includes(idx)
                      : answers[currentQuestion.id] === idx;
                    const cq = currentQuestion as ChoiceQuestion;
                    const isCorrectAns = isMulti
                      ? (cq.answer as number[]).includes(idx)
                      : cq.answer === idx;
                    const showCorrect = submitted && isCorrectAns;
                    const showWrong = submitted && selected && !isCorrectAns;

                    return (
                      <button
                        key={idx}
                        onClick={() => isMulti ? handleMultiChoice(currentQuestion.id, idx) : handleAnswer(currentQuestion.id, idx)}
                        disabled={submitted}
                        className={`w-full h-14 flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left text-xs sm:text-sm transition-all cursor-pointer disabled:cursor-default ${
                          showCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                            : showWrong
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-200'
                            : selected
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 text-slate-700 dark:text-slate-200'
                            : 'bg-white dark:bg-[#0d1b13] border-slate-200 dark:border-emerald-900/40 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${
                          selected
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-slate-300 dark:border-emerald-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {isMulti ? (selected ? '✓' : OPTION_LABELS[idx]) : OPTION_LABELS[idx]}
                        </span>
                        <span className="leading-relaxed flex-1 truncate">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </AnimatePresence>

        {/* Explanation (shown after submit) - floating over navigation, doesn't compress options */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute bottom-full left-0 right-0 mb-2 p-3 sm:p-4 rounded-xl border text-xs sm:text-sm leading-relaxed z-10 ${
              isCorrect(currentQuestion)
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5 font-bold">
              {isCorrect(currentQuestion)
                ? <><CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> 回答正确</>
                : <><XCircle size={14} className="text-rose-600 dark:text-rose-400" /> 回答错误</>
              }
            </div>
            <div className="opacity-80">{currentQuestion.explanation}</div>
          </motion.div>
        )}

        {/* Navigation - fixed bottom, independent */}
        <div className="shrink-0 bg-white dark:bg-[#0d1b13] rounded-2xl border border-emerald-100/40 dark:border-emerald-900/30 p-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <button onClick={goPrev} disabled={currentSectionIdx === 0 && currentQIdx === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0d1b13] hover:bg-slate-50 dark:hover:bg-[#183125] rounded-xl border border-slate-150 dark:border-emerald-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
              <ChevronLeft size={14} /> 上一题
            </button>

            <div className="flex items-center gap-2">
              {!submitted ? (
                <button onClick={handleSubmit}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs transition-all cursor-pointer">
                  提交答案
                </button>
              ) : (
                <button onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-white dark:bg-[#0d1b13] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-rose-100/50 dark:border-rose-900/30 transition-colors cursor-pointer">
                  <RotateCcw size={13} /> 重新答题
                </button>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                {currentQIdx + 1}/{currentSection.questions.length}
              </span>
            </div>

            <button onClick={goNext} disabled={currentSectionIdx === exam.sections.length - 1 && currentQIdx === currentSection.questions.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0d1b13] hover:bg-slate-50 dark:hover:bg-[#183125] rounded-xl border border-slate-150 dark:border-emerald-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
              下一题 <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Results modal */}
      <AnimatePresence>
        {showResults && scoreResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setShowResults(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#0d1b13] rounded-[2rem] p-6 sm:p-8 max-w-sm w-full border border-emerald-100/40 dark:border-emerald-900/30 shadow-xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <BookOpen size={28} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">答题完成</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{exam.title}</p>

              <div className="bg-slate-50 dark:bg-[#0a1410] rounded-2xl p-4 border border-slate-100 dark:border-emerald-900/20 mb-4">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{scoreResult.score}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">总分 {exam.totalScore}</div>
                <div className="flex justify-center gap-4 mt-3 text-xs">
                  <div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{scoreResult.correct}</div>
                    <div className="text-slate-400 dark:text-slate-500">正确</div>
                  </div>
                  <div className="w-px bg-slate-200 dark:bg-emerald-900/40" />
                  <div>
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">{scoreResult.total - scoreResult.correct}</div>
                    <div className="text-slate-400 dark:text-slate-500">错误</div>
                  </div>
                </div>
              </div>

              <button onClick={() => setShowResults(false)}
                className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all">
                查看详情
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
