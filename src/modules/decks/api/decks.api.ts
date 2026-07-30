import { httpClient } from '../../../core/api/http-client';
import type {
  CreateDeckInput,
  Deck,
  UpdateDeckInput,
} from '../types/deck.types';

export const decksApi = {
  list: (subjectId: string, topicId?: string | null) => {
    const params = new URLSearchParams({ subjectId });
    if (topicId) params.set('topicId', topicId);
    return httpClient.get<Deck[]>(`/decks?${params.toString()}`);
  },
  create: (input: CreateDeckInput) =>
    httpClient.post<Deck>('/decks', input),
  update: (id: string, input: UpdateDeckInput) =>
    httpClient.patch<Deck>(`/decks/${encodeURIComponent(id)}`, input),
  remove: (id: string) =>
    httpClient.delete<{ ok: boolean }>(`/decks/${encodeURIComponent(id)}`),
};
