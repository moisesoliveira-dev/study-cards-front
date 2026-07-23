import { httpClient } from '../../../core/api/http-client';
import type {
  CreateSubjectInput,
  Subject,
  UpdateSubjectInput,
} from '../types/subject.types';

export const subjectsApi = {
  list: () => httpClient.get<Subject[]>('/subjects'),
  get: (id: string) => httpClient.get<Subject>(`/subjects/${id}`),
  create: (input: CreateSubjectInput) =>
    httpClient.post<Subject>('/subjects', input),
  update: (id: string, input: UpdateSubjectInput) =>
    httpClient.patch<Subject>(`/subjects/${id}`, input),
  remove: (id: string) => httpClient.delete<{ ok: boolean }>(`/subjects/${id}`),
};
