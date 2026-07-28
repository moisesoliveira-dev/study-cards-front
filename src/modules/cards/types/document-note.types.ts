export type DocumentNote = {
  id: string;
  cardId: string;
  fromPos: number;
  toPos: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDocumentNoteInput = {
  fromPos: number;
  toPos: number;
  content: string;
};

export type UpdateDocumentNoteInput = {
  fromPos?: number;
  toPos?: number;
  content?: string;
};
