export type Topic = {
  id: string;
  subjectId: string;
  parentId: string | null;
  name: string;
  description: string | null;
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
};

export type UpdateTopicInput = {
  name?: string;
  description?: string | null;
  position?: number;
};
