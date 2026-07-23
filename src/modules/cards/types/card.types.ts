export type CardStatus = 'NEW' | 'REVIEW' | 'KNOWN';

export type Card = {
  id: string;
  subjectId: string;
  topicId: string | null;
  front: string;
  back: string;
  document: string | null;
  hint: string | null;
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
  hint?: string;
  tag?: string;
};

export type UpdateCardInput = {
  front?: string;
  back?: string;
  document?: string | null;
  hint?: string | null;
  tag?: string;
  status?: CardStatus;
  position?: number;
};

export type MergeCardsInput = {
  subjectId?: string;
  topicId?: string | null;
  sourceCardIds: string[];
  front: string;
  back: string;
  document?: string | null;
  hint?: string;
  tag?: string;
};

export function statusLabel(status: CardStatus) {
  if (status === 'KNOWN') return 'Sabido';
  if (status === 'REVIEW') return 'Revisar';
  return 'Novo';
}

export function statusClass(status: CardStatus) {
  if (status === 'KNOWN') return 's-ok';
  if (status === 'REVIEW') return 's-rev';
  return 's-new';
}

export function statusDot(status: CardStatus) {
  if (status === 'KNOWN') return 'dot-ok';
  if (status === 'REVIEW') return 'dot-rev';
  return 'dot-new';
}

export function cardInitials(front: string) {
  return front
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3);
}
