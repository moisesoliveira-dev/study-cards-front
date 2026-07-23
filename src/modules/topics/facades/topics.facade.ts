import { topicsApi } from '../api/topics.api';
import type {
  CreateTopicInput,
  Topic,
  TopicTreeNode,
  UpdateTopicInput,
} from '../types/topic.types';

/** Facade: árvore de assuntos / subassuntos. */
export class TopicsFacade {
  tree(subjectId: string): Promise<TopicTreeNode[]> {
    return topicsApi.tree(subjectId);
  }

  create(input: CreateTopicInput): Promise<Topic> {
    return topicsApi.create({
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      parentId: input.parentId ?? null,
    });
  }

  update(id: string, input: UpdateTopicInput): Promise<Topic> {
    return topicsApi.update(id, {
      ...input,
      name: input.name?.trim(),
    });
  }

  remove(id: string): Promise<{ ok: boolean }> {
    return topicsApi.remove(id);
  }

  countNodes(nodes: TopicTreeNode[]): number {
    return nodes.reduce(
      (acc, node) => acc + 1 + this.countNodes(node.children),
      0,
    );
  }
}

export const topicsFacade = new TopicsFacade();
