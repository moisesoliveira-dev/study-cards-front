import { httpClient } from '../../../core/api/http-client';
import type {
  Card,
  CreateCardInput,
  MergeCardsInput,
  UpdateCardInput,
} from '../types/card.types';

export const cardsApi = {
  listByTopic: (topicId: string) =>
    httpClient.get<Card[]>(`/cards?topicId=${encodeURIComponent(topicId)}`),
  listRootBySubject: (subjectId: string) =>
    httpClient.get<Card[]>(
      `/cards?subjectId=${encodeURIComponent(subjectId)}`,
    ),
  studyDeck: (topicId: string) =>
    httpClient.get<Card[]>(
      `/cards/study?topicId=${encodeURIComponent(topicId)}`,
    ),
  studyBySubject: (subjectId: string) =>
    httpClient.get<Card[]>(
      `/cards/study?subjectId=${encodeURIComponent(subjectId)}`,
    ),
  create: (input: CreateCardInput) => httpClient.post<Card>('/cards', input),
  merge: (input: MergeCardsInput) =>
    httpClient.post<Card>('/cards/merge', input),
  get: (id: string) => httpClient.get<Card>(`/cards/${encodeURIComponent(id)}`),
  getByIds: (ids: string[]) =>
    httpClient.get<Card[]>(
      `/cards?ids=${ids.map(encodeURIComponent).join(',')}`,
    ),
  move: (id: string, topicId: string | null) =>
    httpClient.post<Card>(`/cards/${id}/move`, { topicId }),
  update: (id: string, input: UpdateCardInput) =>
    httpClient.patch<Card>(`/cards/${id}`, input),
  remove: (id: string) => httpClient.delete<{ ok: boolean }>(`/cards/${id}`),
};
