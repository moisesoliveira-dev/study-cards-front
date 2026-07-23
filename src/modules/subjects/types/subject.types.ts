export type Subject = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSubjectInput = {
  name: string;
  description?: string;
  color?: string;
};

export type UpdateSubjectInput = Partial<CreateSubjectInput>;
