import type { Edge, Node, XYPosition } from '@xyflow/react';

/** Gap between nodes after collision resolve (px). Keep small. */
export const COLLISION_GAP = 8;

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

export function getNodeSize(node: Node): { width: number; height: number } {
  const styleW =
    typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleH =
    typeof node.style?.height === 'number' ? node.style.height : undefined;
  return {
    width: node.measured?.width ?? node.width ?? styleW ?? 180,
    height: node.measured?.height ?? node.height ?? styleH ?? 120,
  };
}

export function buildNodeMap(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Absolute (flow) position walking up parentId chain. */
export function getAbsolutePosition(
  node: Node,
  nodeMap: Map<string, Node>,
): XYPosition {
  let x = node.position.x;
  let y = node.position.y;
  let current: Node | undefined = node;
  while (current?.parentId) {
    const parent = nodeMap.get(current.parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    current = parent;
  }
  return { x, y };
}

export function sortNodesForSubflow(nodes: Node[]): Node[] {
  return [...nodes].sort((a, b) => {
    const aGroup = a.type === 'groupNode' ? 0 : 1;
    const bGroup = b.type === 'groupNode' ? 0 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    if (a.parentId && !b.parentId) return 1;
    if (!a.parentId && b.parentId) return -1;
    return 0;
  });
}

/** Smallest group that contains the point (flow coords). */
export function findGroupAtPoint(
  nodes: Node[],
  point: XYPosition,
  excludeId?: string,
): Node | null {
  const nodeMap = buildNodeMap(nodes);
  let best: Node | null = null;
  let bestArea = Infinity;
  for (const n of nodes) {
    if (n.type !== 'groupNode' || n.id === excludeId) continue;
    const { width, height } = getNodeSize(n);
    const abs = getAbsolutePosition(n, nodeMap);
    if (
      point.x >= abs.x &&
      point.x <= abs.x + width &&
      point.y >= abs.y &&
      point.y <= abs.y + height
    ) {
      const area = width * height;
      if (area < bestArea) {
        bestArea = area;
        best = n;
      }
    }
  }
  return best;
}

export function attachNodeToGroup(
  nodes: Node[],
  nodeId: string,
  groupId: string,
): Node[] {
  const nodeMap = buildNodeMap(nodes);
  const node = nodeMap.get(nodeId);
  const group = nodeMap.get(groupId);
  if (!node || !group || node.type === 'groupNode' || node.id === groupId) {
    return nodes;
  }
  if (node.parentId === groupId) return nodes;

  const abs = getAbsolutePosition(node, nodeMap);
  const groupAbs = getAbsolutePosition(group, nodeMap);
  const next = nodes.map((n) => {
    if (n.id !== nodeId) return n;
    return {
      ...n,
      parentId: groupId,
      // No extent/expandParent — nodes can be dragged out freely
      extent: undefined,
      expandParent: false,
      position: {
        x: abs.x - groupAbs.x,
        y: abs.y - groupAbs.y,
      },
    };
  });
  return sortNodesForSubflow(next);
}

export function detachNodeFromParent(nodes: Node[], nodeId: string): Node[] {
  const nodeMap = buildNodeMap(nodes);
  const node = nodeMap.get(nodeId);
  if (!node?.parentId) return nodes;
  const abs = getAbsolutePosition(node, nodeMap);
  return nodes.map((n) => {
    if (n.id !== nodeId) return n;
    return {
      ...n,
      parentId: undefined,
      extent: undefined,
      expandParent: undefined,
      position: abs,
    };
  });
}

/**
 * On drag stop: nest into a group under the node center, or leave parent
 * if dropped outside (when not using extent parent lock).
 */
export function resolveSubflowParenting(
  nodes: Node[],
  dragged: Node,
): Node[] {
  if (dragged.type === 'groupNode') return nodes;

  const nodeMap = buildNodeMap(nodes);
  const current = nodeMap.get(dragged.id) ?? dragged;
  const { width, height } = getNodeSize(current);
  const abs = getAbsolutePosition(current, nodeMap);
  const center = {
    x: abs.x + width / 2,
    y: abs.y + height / 2,
  };

  const group = findGroupAtPoint(nodes, center, current.id);
  if (group) {
    if (current.parentId === group.id) return nodes;
    return attachNodeToGroup(nodes, current.id, group.id);
  }

  if (current.parentId) {
    // Dropped outside any group — detach
    return detachNodeFromParent(nodes, current.id);
  }
  return nodes;
}

function nodeHasCollisionsFlag(node: Node): boolean {
  return Boolean(
    (node.data as { nodeCollisions?: boolean } | undefined)?.nodeCollisions,
  );
}

/**
 * Push overlapping sibling nodes apart.
 * Resolves when the moving node OR the other node has collisions (or `global`).
 * If only the other is protected, the moving node is pushed away.
 */
export function pushApartCollisions(
  nodes: Node[],
  movingId: string,
  options: { global?: boolean; gap?: number } = {},
): { nodes: Node[]; moved: boolean } {
  const gap = options.gap ?? COLLISION_GAP;
  const global = Boolean(options.global);
  const moving = nodes.find((n) => n.id === movingId);
  if (!moving || moving.type === 'groupNode') {
    return { nodes, moved: false };
  }

  const movingProtected = global || nodeHasCollisionsFlag(moving);
  const mw = getNodeSize(moving).width;
  const mh = getNodeSize(moving).height;

  let mx = moving.position.x;
  let my = moving.position.y;
  const updates = new Map<string, XYPosition>();

  const siblings = nodes.filter(
    (n) =>
      n.id !== movingId &&
      n.type !== 'groupNode' &&
      (n.parentId ?? null) === (moving.parentId ?? null),
  );

  for (let pass = 0; pass < 4; pass++) {
    let movedThisPass = false;
    for (const other of siblings) {
      const otherProtected = global || nodeHasCollisionsFlag(other);
      if (!movingProtected && !otherProtected) continue;

      const ow = getNodeSize(other).width;
      const oh = getNodeSize(other).height;
      const ox = updates.get(other.id)?.x ?? other.position.x;
      const oy = updates.get(other.id)?.y ?? other.position.y;
      const mcx = mx + mw / 2;
      const mcy = my + mh / 2;
      const ocx = ox + ow / 2;
      const ocy = oy + oh / 2;

      const overlapX = (mw + ow) / 2 + gap - Math.abs(mcx - ocx);
      const overlapY = (mh + oh) / 2 + gap - Math.abs(mcy - ocy);
      if (overlapX <= 0 || overlapY <= 0) continue;

      // Prefer keeping a protected node still: push the unprotected (or the other).
      const pushMoving = !movingProtected && otherProtected;
      if (overlapX < overlapY) {
        const dir = pushMoving
          ? mcx >= ocx
            ? 1
            : -1
          : ocx >= mcx
            ? 1
            : -1;
        if (pushMoving) {
          mx += dir * overlapX;
          updates.set(movingId, { x: mx, y: my });
        } else {
          updates.set(other.id, { x: ox + dir * overlapX, y: oy });
        }
      } else {
        const dir = pushMoving
          ? mcy >= ocy
            ? 1
            : -1
          : ocy >= mcy
            ? 1
            : -1;
        if (pushMoving) {
          my += dir * overlapY;
          updates.set(movingId, { x: mx, y: my });
        } else {
          updates.set(other.id, { x: ox, y: oy + dir * overlapY });
        }
      }
      movedThisPass = true;
    }
    if (!movedThisPass) break;
  }

  if (!updates.size) return { nodes, moved: false };

  return {
    moved: true,
    nodes: nodes.map((n) => {
      const pos = updates.get(n.id);
      if (!pos) {
        return n.id === movingId ? { ...n, className: undefined } : n;
      }
      return {
        ...n,
        position: pos,
        className: 'sc-flow-node-settle',
      };
    }),
  };
}

/** Resolve overlaps across all card nodes (environment collisions on). */
export function resolveAllCollisions(
  nodes: Node[],
  gap = COLLISION_GAP,
): Node[] {
  let next = nodes;
  const cards = nodes.filter((n) => n.type !== 'groupNode');
  for (let round = 0; round < 4; round++) {
    let any = false;
    for (const card of cards) {
      const result = pushApartCollisions(next, card.id, { global: true, gap });
      if (result.moved) {
        next = result.nodes;
        any = true;
      }
    }
    if (!any) break;
  }
  return clearNodeMotionClasses(next).map((n) =>
    n.type !== 'groupNode' ? { ...n, className: 'sc-flow-node-settle' } : n,
  );
}

export function clearNodeMotionClasses(nodes: Node[]): Node[] {
  return nodes.map((n) =>
    n.className ? { ...n, className: undefined } : n,
  );
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
