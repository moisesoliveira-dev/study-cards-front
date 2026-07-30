import { httpClient } from '../../../core/api/http-client';
import type {
  CatalogColor,
  CreateCatalogColorInput,
  UpdateCatalogColorInput,
} from '../types/color.types';

export const colorsApi = {
  list: () => httpClient.get<CatalogColor[]>('/colors'),
  create: (input: CreateCatalogColorInput) =>
    httpClient.post<CatalogColor>('/colors', input),
  update: (id: string, input: UpdateCatalogColorInput) =>
    httpClient.patch<CatalogColor>(
      `/colors/${encodeURIComponent(id)}`,
      input,
    ),
  delete: (id: string) =>
    httpClient.delete<{ ok: boolean }>(
      `/colors/${encodeURIComponent(id)}`,
    ),
};
