export type CardLevel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCardLevelInput = {
  name: string;
  slug?: string;
  description?: string | null;
  color?: string | null;
  position?: number;
};

export type UpdateCardLevelInput = {
  name?: string;
  description?: string | null;
  color?: string | null;
  position?: number;
};
