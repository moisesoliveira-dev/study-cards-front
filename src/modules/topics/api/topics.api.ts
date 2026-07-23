import { httpClient } from '../../../core/api/http-client';
import type {
  CreateTopicInput,
  Topic,
  TopicTreeNode,
  UpdateTopicInput,
} from '../types/topic.types';

export const topicsApi = {
  tree: (subjectId: string) =>
    httpClient.get<TopicTreeNode[]>(
      `/topics?subjectId=${encodeURIComponent(subjectId)}`,
    ),
  create: (input: CreateTopicInput) =>
    httpClient.post<Topic>('/topics', input),
  update: (id: string, input: UpdateTopicInput) =>
    httpClient.patch<Topic>(`/topics/${id}`, input),
  remove: (id: string) => httpClient.delete<{ ok: boolean }>(`/topics/${id}`),
};
