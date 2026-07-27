import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Card } from '../../cards/types/card.types';

export class StudyFacade {
  loadDeck(topicId: string): Promise<Card[]> {
    return cardsFacade.studyDeck(topicId);
  }
}

export const studyFacade = new StudyFacade();
