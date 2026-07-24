import type { Connection, Edge, Node } from '@xyflow/react';
import type { CardFlowNodeData } from './CardFlowNode';

export function getNodeFlowData(node: Node | undefined): CardFlowNodeData | null {
  if (!node) return null;
  return node.data as CardFlowNodeData;
}

/** Whether `sourceId` is allowed to connect into `targetId`. */
export function canReceiveConnection(
  nodes: Node[],
  sourceId: string | null | undefined,
  targetId: string | null | undefined,
): boolean {
  if (!sourceId || !targetId) return false;
  if (sourceId === targetId) return false;

  const target = nodes.find((n) => n.id === targetId);
  const data = getNodeFlowData(target);
  if (!data) return true;

  if (data.blockIncoming) return false;
  if (data.blockedSourceIds?.includes(sourceId)) return false;
  return true;
}

export function isValidFlowConnection(
  nodes: Node[],
  connection: Connection | Edge,
): boolean {
  return canReceiveConnection(nodes, connection.source, connection.target);
}

export function withBlockedSource(
  data: CardFlowNodeData,
  sourceNodeId: string,
  blocked: boolean,
): CardFlowNodeData {
  const current = new Set(data.blockedSourceIds ?? []);
  if (blocked) current.add(sourceNodeId);
  else current.delete(sourceNodeId);
  return {
    ...data,
    blockedSourceIds: [...current],
  };
}
