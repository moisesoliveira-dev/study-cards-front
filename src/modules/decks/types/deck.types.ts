export type Deck = {
  id: string;
  subjectId: string;
  topicId: string | null;
  name: string;
  description: string | null;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeckInput = {
  subjectId: string;
  topicId?: string | null;
  name: string;
  description?: string | null;
  color?: string;
};

export type UpdateDeckInput = {
  name?: string;
  description?: string | null;
  color?: string;
  position?: number;
};
