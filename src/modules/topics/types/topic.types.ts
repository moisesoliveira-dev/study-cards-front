export type Topic = {
  id: string;
  subjectId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TopicTreeNode = Topic & {
  children: TopicTreeNode[];
};

export type CreateTopicInput = {
  subjectId: string;
  parentId?: string | null;
  name: string;
  description?: string;
  color?: string;
};

export type UpdateTopicInput = {
  name?: string;
  description?: string | null;
  color?: string;
  position?: number;
  parentId?: string | null;
};
