import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Card } from '../../cards/types/card.types';

export class StudyFacade {
  async loadDeck(topicId: string, onlyReview = false): Promise<Card[]> {
    const deck = await cardsFacade.studyDeck(topicId);
    return onlyReview ? deck.filter((c) => c.status === 'REVIEW') : deck;
  }
}

export const studyFacade = new StudyFacade();
