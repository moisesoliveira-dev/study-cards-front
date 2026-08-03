import { cardTagsApi } from '../api/card-tags.api';
import type {
  CardTag,
  CreateCardTagInput,
  UpdateCardTagInput,
} from '../types/card-tag.types';

export class CardTagsFacade {
  list(): Promise<CardTag[]> {
    return cardTagsApi.list();
  }

  create(input: CreateCardTagInput): Promise<CardTag> {
    return cardTagsApi.create({
      ...input,
      name: input.name.trim(),
      colorId: input.colorId.trim(),
      description: input.description?.trim() || null,
    });
  }

  update(id: string, input: UpdateCardTagInput): Promise<CardTag> {
    return cardTagsApi.update(id, {
      ...input,
      name: input.name?.trim(),
      colorId: input.colorId?.trim(),
      description:
        input.description === undefined
          ? undefined
          : input.description?.trim() || null,
    });
  }

  delete(id: string) {
    return cardTagsApi.delete(id);
  }
}

export const cardTagsFacade = new CardTagsFacade();
