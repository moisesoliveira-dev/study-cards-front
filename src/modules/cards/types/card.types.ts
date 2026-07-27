export type CardStatus = 'NEW' | 'REVIEW' | 'KNOWN';

export type Card = {
  id: string;
  subjectId: string;
  topicId: string | null;
  front: string;
  back: string;
  document: string | null;
  levelId: string | null;
  icon: string | null;
  color: string | null;
  tag: string;
  status: CardStatus;
  position: number;
  linkCount: number;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateCardInput = {
  subjectId?: string;
  topicId?: string | null;
  front: string;
  back: string;
  document?: string | null;
  levelId?: string | null;
  icon?: string | null;
  color?: string | null;
  tag?: string;
};

export type UpdateCardInput = {
  front?: string;
  back?: string;
  document?: string | null;
  levelId?: string | null;
  icon?: string | null;
  color?: string | null;
  tag?: string;
  position?: number;
};

export type MergeCardsInput = {
  subjectId?: string;
  topicId?: string | null;
  sourceCardIds: string[];
  front: string;
  back: string;
  document?: string | null;
  levelId?: string | null;
  icon?: string | null;
  color?: string | null;
  tag?: string;
};

export const CARD_ACCENT_COLORS = [
  '#1D9E75',
  '#378ADD',
  '#BA7517',
  '#7F77DD',
  '#D4537E',
  '#D85A30',
  '#888780',
] as const;

export function cardInitials(front: string) {
  return front
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3);
}
