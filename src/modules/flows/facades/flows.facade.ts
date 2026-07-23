import { flowsApi } from '../api/flows.api';
import type { CreateFlowInput, UpdateFlowInput } from '../types/flow.types';

export class FlowsFacade {
  list(subjectId?: string) {
    return flowsApi.list(subjectId);
  }

  get(id: string) {
    return flowsApi.get(id);
  }

  create(input: CreateFlowInput) {
    return flowsApi.create({
      subjectId: input.subjectId,
      name: input.name.trim() || 'Fluxograma',
    });
  }

  update(id: string, input: UpdateFlowInput) {
    return flowsApi.update(id, {
      ...input,
      name: input.name?.trim(),
    });
  }

  remove(id: string) {
    return flowsApi.remove(id);
  }
}

export const flowsFacade = new FlowsFacade();
