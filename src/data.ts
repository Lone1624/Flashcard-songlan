/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlashcardSet, AllProgress, DeckProgress, Flashcard } from './types';
// @ts-ignore - Vite raw import
import csvMolecular from '../public/Molecular1.csv?raw';
// @ts-ignore - Vite raw import
import csvCellBio from '../public/cellbiology.csv?raw';

/**
 * Parse a CSV string into Flashcard array.
 * 4 columns: question,answer,hint,difficulty
 * hint 和 difficulty 可为空
 */
function parseCSVtoCards(csv: string): Flashcard[] {
  return csv
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index) => {
      // Split on first 3 commas only (answer may contain commas)
      const comma1 = line.indexOf(',');
      if (comma1 === -1) return null;
      const question = line.slice(0, comma1).trim();
      const rest = line.slice(comma1 + 1);

      const comma2 = rest.indexOf(',');
      const answer = comma2 === -1 ? rest.trim() : rest.slice(0, comma2).trim();
      if (!question || !answer) return null;

      let hint = '';
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (comma2 !== -1) {
        const rest2 = rest.slice(comma2 + 1);
        const comma3 = rest2.indexOf(',');
        hint = (comma3 === -1 ? rest2 : rest2.slice(0, comma3)).trim();
        if (comma3 !== -1) {
          const diffRaw = rest2.slice(comma3 + 1).trim().toLowerCase();
          if (diffRaw === 'easy' || diffRaw === '简') difficulty = 'easy';
          else if (diffRaw === 'hard' || diffRaw === '难') difficulty = 'hard';
        }
      }

      return {
        id: `mol-${index + 1}`,
        question,
        answer,
        hint,
        difficulty
      };
    })
    .filter(<T>(c: T | null): c is T => c !== null);
}

const molecularCards = parseCSVtoCards(csvMolecular);
const cellBioCards = parseCSVtoCards(csvCellBio);

export const DEFAULT_DECKS: FlashcardSet[] = [
  {
    id: 'molecular-biology',
    title: '🧬 分子生物学',
    description: '生物技术专业核心课程，涵盖DNA复制、转录、翻译及基因表达调控等基础知识。',
    category: '生物技术',
    createdAt: '2026-07-01',
    cards: molecularCards
  },
  {
    id: 'cell-biology',
    title: '🔬 细胞生物学',
    description: '细胞生物学研究方法、显微镜技术及超分辨成像等核心知识。',
    category: '生物技术',
    createdAt: '2026-07-01',
    cards: cellBioCards
  }
];

const CUSTOM_DECKS_KEY = 'flashcard_custom_decks';
const PROGRESS_KEY = 'flashcard_users_progress';

// LocalStorage helpers
export const loadCustomDecks = (): FlashcardSet[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_DECKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading custom decks', e);
    return [];
  }
};

export const saveCustomDecks = (decks: FlashcardSet[]) => {
  try {
    localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(decks));
  } catch (e) {
    console.error('Error saving custom decks', e);
  }
};

export const loadAllProgress = (): AllProgress => {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Error loading progress', e);
    return {};
  }
};

export const saveAllProgress = (progress: AllProgress) => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving progress', e);
  }
};

export const saveDeckProgress = (deckId: string, progress: DeckProgress) => {
  const all = loadAllProgress();
  all[deckId] = progress;
  saveAllProgress(all);
};

export const getDeckProgress = (deckId: string): DeckProgress => {
  const all = loadAllProgress();
  return all[deckId] || {
    currentCardIndex: 0,
    cardRatings: {},
    lastStudiedAt: new Date().toISOString()
  };
};

export const calculateDeckStats = (deck: FlashcardSet, progress: DeckProgress) => {
  const total = deck.cards.length;
  if (total === 0) return { percent: 0, easyCount: 0, mediumCount: 0, hardCount: 0, unstartedCount: 0 };

  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;

  deck.cards.forEach(card => {
    const rating = progress.cardRatings[card.id];
    if (rating === 'easy') easyCount++;
    else if (rating === 'medium') mediumCount++;
    else if (rating === 'hard') hardCount++;
  });

  const ratedCount = easyCount + mediumCount + hardCount;
  const unstartedCount = total - ratedCount;
  // Let's consider 'easy' (mastered) + 'medium' (reviewing) as studied, or we can count how many cards have some rating.
  // Let's make progress percentage based on how many cards are rated 'easy' or 'medium'. Or just overall rating coverage.
  // To keep it motivating, let's calculate: Progress = (Mastered/Easy count * 100 + Reviewing/Medium count * 50) / total
  const percent = Math.min(100, Math.round(((easyCount * 1.0 + mediumCount * 0.5) / total) * 100));

  return {
    percent,
    easyCount,
    mediumCount,
    hardCount,
    unstartedCount,
    ratedCount
  };
};
