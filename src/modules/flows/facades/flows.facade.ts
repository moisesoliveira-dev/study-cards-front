import { flowsApi } from '../api/flows.api';
import type {
  CreateFlowInput,
  FlowBoard,
  FlowEdgeDto,
  FlowNodeDto,
  UpdateFlowInput,
} from '../types/flow.types';

function normalizeBoard(board: FlowBoard): FlowBoard {
  return {
    ...board,
    nodes: Array.isArray(board.nodes) ? (board.nodes as FlowNodeDto[]) : [],
    edges: Array.isArray(board.edges) ? (board.edges as FlowEdgeDto[]) : [],
  };
}

export class FlowsFacade {
  async list(subjectId?: string) {
    const boards = await flowsApi.list(subjectId);
    return (boards ?? []).map(normalizeBoard);
  }

  async get(id: string) {
    return normalizeBoard(await flowsApi.get(id));
  }

  async create(input: CreateFlowInput) {
    const board = await flowsApi.create({
      subjectId: input.subjectId,
      name: input.name.trim() || 'Fluxograma',
    });
    return normalizeBoard(board);
  }

  async update(id: string, input: UpdateFlowInput) {
    const board = await flowsApi.update(id, {
      ...input,
      name: input.name?.trim(),
    });
    return normalizeBoard(board);
  }

  remove(id: string) {
    return flowsApi.remove(id);
  }
}

export const flowsFacade = new FlowsFacade();
