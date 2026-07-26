import { httpClient } from '../../../core/api/http-client';
import type {
  CardLevel,
  CreateCardLevelInput,
  UpdateCardLevelInput,
} from '../types/card-level.types';

export const cardLevelsApi = {
  list: () => httpClient.get<CardLevel[]>('/card-levels'),
  create: (input: CreateCardLevelInput) =>
    httpClient.post<CardLevel>('/card-levels', input),
  update: (id: string, input: UpdateCardLevelInput) =>
    httpClient.patch<CardLevel>(
      `/card-levels/${encodeURIComponent(id)}`,
      input,
    ),
};
