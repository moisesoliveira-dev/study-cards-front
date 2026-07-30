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
  move: (
    id: string,
    input: { beforeDeckId?: string | null; position?: number },
  ) => httpClient.post<Deck>(`/decks/${encodeURIComponent(id)}/move`, input),
  update: (id: string, input: UpdateDeckInput) =>
    httpClient.patch<Deck>(`/decks/${encodeURIComponent(id)}`, input),
  remove: (id: string) =>
    httpClient.delete<{ ok: boolean }>(`/decks/${encodeURIComponent(id)}`),
};
