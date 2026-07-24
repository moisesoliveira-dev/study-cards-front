import type { Edge } from '@xyflow/react';

export function isSynthesisEdge(edge: Pick<Edge, 'label' | 'data'> | undefined | null) {
  if (!edge) return false;
  if (edge.label === 'síntese') return true;
  const kind = (edge.data as { kind?: string } | undefined)?.kind;
  return kind === 'synthesis';
}

export function withEdgeFlags<T extends Edge>(edge: T): T {
  const synthesis = isSynthesisEdge(edge);
  return {
    ...edge,
    deletable: !synthesis,
    reconnectable: true,
    animated: edge.animated ?? true,
    type: edge.type ?? 'smoothstep',
  };
}
