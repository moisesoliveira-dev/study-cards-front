import type { TopicTreeNode } from '../types/topic.types';

export function findTopicNode(
  nodes: TopicTreeNode[],
  id: string,
): TopicTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const child = findTopicNode(n.children, id);
    if (child) return child;
  }
  return null;
}

export function buildTopicPath(
  nodes: TopicTreeNode[],
  topicId: string,
  trail: TopicTreeNode[] = [],
): TopicTreeNode[] | null {
  for (const n of nodes) {
    const next = [...trail, n];
    if (n.id === topicId) return next;
    const found = buildTopicPath(n.children, topicId, next);
    if (found) return found;
  }
  return null;
}

/** IDs dos ancestrais (sem incluir o próprio topicId). */
export function topicAncestorIds(
  nodes: TopicTreeNode[],
  topicId: string,
): string[] {
  const path = buildTopicPath(nodes, topicId);
  if (!path || path.length < 2) return [];
  return path.slice(0, -1).map((n) => n.id);
}

export function collectTopicIds(nodes: TopicTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: TopicTreeNode[]) => {
    for (const n of list) {
      ids.push(n.id);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return ids;
}

/** Filtra a árvore mantendo nós que batem com a query ou têm descendentes que batem. */
export function filterTopicTree(
  nodes: TopicTreeNode[],
  query: string,
): TopicTreeNode[] {
  const q = query.trim().toLocaleLowerCase('pt-BR');
  if (!q) return nodes;

  const filter = (list: TopicTreeNode[]): TopicTreeNode[] => {
    const out: TopicTreeNode[] = [];
    for (const n of list) {
      const children = filter(n.children);
      const nameHit = n.name.toLocaleLowerCase('pt-BR').includes(q);
      const descHit = (n.description ?? '')
        .toLocaleLowerCase('pt-BR')
        .includes(q);
      if (nameHit || descHit || children.length) {
        out.push({ ...n, children });
      }
    }
    return out;
  };

  return filter(nodes);
}
