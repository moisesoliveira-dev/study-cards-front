export type CardTagColorRef = {
  id: string;
  name: string;
  hex: string;
};

export type CardTag = {
  id: string;
  name: string;
  description: string | null;
  colorId: string;
  color: CardTagColorRef | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCardTagInput = {
  name: string;
  colorId: string;
  description?: string | null;
  position?: number;
};

export type UpdateCardTagInput = {
  name?: string;
  colorId?: string;
  description?: string | null;
  position?: number;
};
