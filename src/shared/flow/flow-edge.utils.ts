import type { Edge } from '@xyflow/react';

export type FlowEdgePathType = 'smoothstep' | 'bezier' | 'straight' | 'step';

export type FlowEdgeData = {
  kind?: 'synthesis';
  /** Particle moving along the SVG path (animateMotion) */
  svgAnimate?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  dashed?: boolean;
  pathType?: FlowEdgePathType;
};

export function getEdgeData(edge: Pick<Edge, 'data'> | undefined | null): FlowEdgeData {
  return ((edge?.data as FlowEdgeData | undefined) ?? {}) as FlowEdgeData;
}

export function isSynthesisEdge(edge: Pick<Edge, 'label' | 'data'> | undefined | null) {
  if (!edge) return false;
  if (edge.label === 'síntese') return true;
  return getEdgeData(edge).kind === 'synthesis';
}

export function withEdgeFlags<T extends Edge>(edge: T): T {
  const synthesis = isSynthesisEdge(edge);
  const data = getEdgeData(edge);
  const nextData: FlowEdgeData = {
    svgAnimate: data.svgAnimate ?? true,
    dashed: data.dashed ?? false,
    pathType: data.pathType ?? 'smoothstep',
    strokeColor: data.strokeColor,
    strokeWidth: data.strokeWidth,
    ...(synthesis ? { kind: 'synthesis' } : {}),
  };

  return {
    ...edge,
    deletable: !synthesis,
    reconnectable: true,
    animated: false,
    type: 'flowEdge',
    data: nextData,
  };
}
