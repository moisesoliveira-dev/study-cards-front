import { decksApi } from '../api/decks.api';
import type {
  CreateDeckInput,
  Deck,
  UpdateDeckInput,
} from '../types/deck.types';

export class DecksFacade {
  list(subjectId: string, topicId?: string | null): Promise<Deck[]> {
    return decksApi.list(subjectId, topicId ?? null);
  }

  create(input: CreateDeckInput): Promise<Deck> {
    return decksApi.create({
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });
  }

  update(id: string, input: UpdateDeckInput): Promise<Deck> {
    return decksApi.update(id, {
      ...input,
      name: input.name?.trim(),
      description:
        input.description === undefined
          ? undefined
          : input.description?.trim() || null,
    });
  }

  remove(id: string) {
    return decksApi.remove(id);
  }
}

export const decksFacade = new DecksFacade();
