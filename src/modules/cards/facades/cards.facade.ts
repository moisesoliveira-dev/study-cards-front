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

  studyDeck(topicId: string) {
    return cardsApi.studyDeck(topicId);
  }

  create(input: CreateCardInput) {
    return cardsApi.create({
      ...input,
      front: input.front.trim(),
      back: input.back.trim(),
      hint: input.hint?.trim() || undefined,
      tag: input.tag?.trim() || undefined,
    });
  }

  merge(input: MergeCardsInput) {
    return cardsApi.merge({
      ...input,
      front: input.front.trim(),
      back: input.back.trim(),
      hint: input.hint?.trim() || undefined,
      tag: input.tag?.trim() || 'Síntese',
    });
  }

  update(id: string, input: UpdateCardInput) {
    return cardsApi.update(id, input);
  }

  remove(id: string) {
    return cardsApi.remove(id);
  }

  countByStatus(cards: Card[]) {
    return {
      known: cards.filter((c) => c.status === 'KNOWN').length,
      review: cards.filter((c) => c.status === 'REVIEW').length,
      neu: cards.filter((c) => c.status === 'NEW').length,
    };
  }
}

export const cardsFacade = new CardsFacade();
