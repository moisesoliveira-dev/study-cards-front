import { cardsApi } from '../api/cards.api';
import type {
  Card,
  CreateCardInput,
  MergeCardsInput,
  UpdateCardInput,
} from '../types/card.types';

export class CardsFacade {
  listByTopic(topicId: string) {
    return cardsApi.listByTopic(topicId);
  }

  listRootBySubject(subjectId: string) {
    return cardsApi.listRootBySubject(subjectId);
  }

  listAllBySubject(subjectId: string) {
    return cardsApi.listAllBySubject(subjectId);
  }

  studyDeck(topicId: string) {
    return cardsApi.studyDeck(topicId);
  }

  studyBySubject(subjectId: string) {
    return cardsApi.studyBySubject(subjectId);
  }

  create(input: CreateCardInput) {
    return cardsApi.create({
      ...input,
      front: input.front.trim(),
      back: input.back.trim(),
      document: input.document?.trim() || undefined,
      levelId: input.levelId?.trim() || null,
      icon: input.icon?.trim() || null,
      color: input.color?.trim() || null,
      tag: input.tag?.trim() || undefined,
    });
  }

  merge(input: MergeCardsInput) {
    return cardsApi.merge({
      ...input,
      front: input.front.trim(),
      back: input.back.trim(),
      document: input.document?.trim() || undefined,
      levelId: input.levelId?.trim() || null,
      icon: input.icon?.trim() || null,
      color: input.color?.trim() || null,
      tag: input.tag?.trim() || 'Síntese',
    });
  }

  get(id: string) {
    return cardsApi.get(id);
  }

  getByIds(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return Promise.resolve([] as Card[]);
    return cardsApi.getByIds(unique);
  }

  move(
    id: string,
    input:
      | string
      | null
      | {
          topicId?: string | null;
          deckId?: string | null;
          beforeCardId?: string | null;
          position?: number;
        },
  ) {
    if (input === null || typeof input === 'string') {
      return cardsApi.move(id, { topicId: input });
    }
    return cardsApi.move(id, input);
  }

  update(id: string, input: UpdateCardInput) {
    return cardsApi.update(id, input);
  }

  remove(id: string) {
    return cardsApi.remove(id);
  }
}

export const cardsFacade = new CardsFacade();
