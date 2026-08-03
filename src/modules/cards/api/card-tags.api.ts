import { httpClient } from '../../../core/api/http-client';
import type {
  CardTag,
  CreateCardTagInput,
  UpdateCardTagInput,
} from '../types/card-tag.types';

export const cardTagsApi = {
  list: () => httpClient.get<CardTag[]>('/card-tags'),
  create: (input: CreateCardTagInput) =>
    httpClient.post<CardTag>('/card-tags', input),
  update: (id: string, input: UpdateCardTagInput) =>
    httpClient.patch<CardTag>(`/card-tags/${id}`, input),
  delete: (id: string) =>
    httpClient.delete<{ ok: boolean }>(`/card-tags/${id}`),
};
