import { httpClient } from '../../../core/api/http-client';
import type {
  CreateFlowInput,
  FlowBoard,
  UpdateFlowInput,
} from '../types/flow.types';

export const flowsApi = {
  list: (subjectId?: string) =>
    httpClient.get<FlowBoard[]>(
      subjectId
        ? `/flows?subjectId=${encodeURIComponent(subjectId)}`
        : '/flows',
    ),
  get: (id: string) =>
    httpClient.get<FlowBoard>(`/flows/${encodeURIComponent(id)}`),
  create: (input: CreateFlowInput) =>
    httpClient.post<FlowBoard>('/flows', input),
  update: (id: string, input: UpdateFlowInput) =>
    httpClient.patch<FlowBoard>(`/flows/${encodeURIComponent(id)}`, input),
  remove: (id: string) =>
    httpClient.delete<{ ok: boolean }>(`/flows/${encodeURIComponent(id)}`),
};
