import type { Edge, Node, XYPosition } from '@xyflow/react';

/** Outgoing descendants in the edge graph (drag tree). */
export function getTreeDescendantIds(
  rootId: string,
  edges: Edge[],
): Set<string> {
  const out = new Map<string, string[]>();
  for (const e of edges) {
    const list = out.get(e.source) ?? [];
    list.push(e.target);
    out.set(e.source, list);
  }
  const visited = new Set<string>();
  const stack = [...(out.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id) || id === rootId) continue;
    visited.add(id);
    for (const next of out.get(id) ?? []) stack.push(next);
  }
  return visited;
}

export function moveNodesByDelta(
  nodes: Node[],
  ids: Set<string>,
  delta: XYPosition,
): Node[] {
  if (!delta.x && !delta.y) return nodes;
  return nodes.map((n) => {
    if (!ids.has(n.id)) return n;
    return {
      ...n,
      position: {
        x: n.position.x + delta.x,
        y: n.position.y + delta.y,
      },
    };
  });
}

export function nodesAbsoluteBounds(nodes: Node[]) {
  if (!nodes.length) {
    return { x: 0, y: 0, width: 280, height: 200 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const w = n.measured?.width ?? n.width ?? 180;
    const h = n.measured?.height ?? n.height ?? 120;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  const pad = 28;
  return {
    x: minX - pad,
    y: minY - pad - 24,
    width: Math.max(240, maxX - minX + pad * 2),
    height: Math.max(160, maxY - minY + pad * 2 + 24),
  };
}

export async function downloadFlowImage(fileName = 'fluxograma.png') {
  const { toPng } = await import('html-to-image');
  const viewport = document.querySelector(
    '.sc-flow-canvas .react-flow__viewport',
  ) as HTMLElement | null;
  if (!viewport) throw new Error('Canvas do fluxograma não encontrado');

  const bg =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--bg')
      .trim() || '#ffffff';

  const dataUrl = await toPng(viewport, {
    backgroundColor: bg,
    pixelRatio: 2,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !node.classList?.contains('sc-flow-eraser-cursor');
    },
  });

  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
