/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  category: string;
  cards: Flashcard[];
  createdAt: string;
  isCustom?: boolean;
}

export interface DeckProgress {
  currentCardIndex: number;
  // Map of cardId to its study status: 'easy' (mastered), 'medium' (reviewing), 'hard' (needs work), or undefined (not started)
  cardRatings: Record<string, 'easy' | 'medium' | 'hard'>;
  lastStudiedAt: string;
}

export type AllProgress = Record<string, DeckProgress>;
