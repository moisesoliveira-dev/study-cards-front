export type FlowNodeDto = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
  parentId?: string;
  extent?: 'parent' | string;
  style?: Record<string, unknown>;
  expandParent?: boolean;
};

export type FlowEdgeDto = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  label?: string;
  data?: Record<string, unknown>;
};

export type FlowBoard = {
  id: string;
  userId: string;
  subjectId: string;
  name: string;
  nodes: FlowNodeDto[];
  edges: FlowEdgeDto[];
  createdAt: string;
  updatedAt: string;
};

export type CreateFlowInput = {
  subjectId: string;
  name: string;
};

export type UpdateFlowInput = {
  name?: string;
  nodes?: FlowNodeDto[];
  edges?: FlowEdgeDto[];
};
