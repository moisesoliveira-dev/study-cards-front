import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, type Edge, type Node } from '@xyflow/react';
import { isSynthesisEdge } from './flow-edge.utils';

type Props = {
  active: boolean;
  onErase: (nodeIds: string[], edgeIds: string[]) => void;
};

/**
 * Eraser tool: click/drag over nodes or edges to remove them.
 * Synthesis edges are never erased.
 */
export function FlowEraser({ active, onErase }: Props) {
  const { screenToFlowPosition, getNodes, getEdges, getIntersectingNodes } =
    useReactFlow();
  const drawing = useRef(false);
  const erased = useRef({ nodes: new Set<string>(), edges: new Set<string>() });

  const eraseAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (!el) return;

      const nodeEl = el.closest('.react-flow__node') as HTMLElement | null;
      const edgeEl = el.closest('.react-flow__edge') as HTMLElement | null;

      const nodeIds: string[] = [];
      const edgeIds: string[] = [];

      if (nodeEl?.dataset.id) {
        const id = nodeEl.dataset.id;
        if (!erased.current.nodes.has(id)) {
          erased.current.nodes.add(id);
          nodeIds.push(id);
        }
      }

      if (edgeEl?.dataset.id) {
        const id = edgeEl.dataset.id;
        const edge = getEdges().find((e) => e.id === id);
        if (edge && !isSynthesisEdge(edge) && !erased.current.edges.has(id)) {
          erased.current.edges.add(id);
          edgeIds.push(id);
        }
      }

      // Soft area erase for nearby nodes while dragging
      if (!nodeEl) {
        const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
        const brush: Node = {
          id: '__eraser-brush__',
          position: { x: flowPos.x - 14, y: flowPos.y - 14 },
          data: {},
          width: 28,
          height: 28,
          measured: { width: 28, height: 28 },
        };
        const hits = getIntersectingNodes(brush, true, getNodes());
        for (const n of hits) {
          if (erased.current.nodes.has(n.id)) continue;
          erased.current.nodes.add(n.id);
          nodeIds.push(n.id);
        }
      }

      if (nodeIds.length || edgeIds.length) {
        onErase(nodeIds, edgeIds);
      }
    },
    [getEdges, getIntersectingNodes, getNodes, onErase, screenToFlowPosition],
  );

  useEffect(() => {
    if (!active) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('.sc-flow-toolbar, .sc-flow-inspector, .sc-flow-palette, .sc-ctx-menu')) {
        return;
      }
      drawing.current = true;
      erased.current = { nodes: new Set(), edges: new Set() };
      eraseAt(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      eraseAt(e.clientX, e.clientY);
    };
    const onUp = () => {
      drawing.current = false;
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [active, eraseAt]);

  if (!active) return null;

  return <div className="sc-flow-eraser-cursor" aria-hidden />;
}

export function applyEraserDeletion(
  nodes: Node[],
  edges: Edge[],
  nodeIds: string[],
  edgeIds: string[],
): { nodes: Node[]; edges: Edge[] } {
  const removeNodes = new Set(nodeIds);
  // Also remove children of erased groups
  for (const n of nodes) {
    if (n.parentId && removeNodes.has(n.parentId)) removeNodes.add(n.id);
  }
  const nextNodes = nodes.filter((n) => !removeNodes.has(n.id));
  const nextEdges = edges.filter(
    (e) =>
      !edgeIds.includes(e.id) &&
      !removeNodes.has(e.source) &&
      !removeNodes.has(e.target) &&
      !(edgeIds.length && isSynthesisEdge(e) === false && edgeIds.includes(e.id)),
  );
  return { nodes: nextNodes, edges: nextEdges };
}
