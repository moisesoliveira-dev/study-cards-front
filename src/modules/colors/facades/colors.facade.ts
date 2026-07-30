import { colorsApi } from '../api/colors.api';
import type {
  CatalogColor,
  CreateCatalogColorInput,
  UpdateCatalogColorInput,
} from '../types/color.types';

export class ColorsFacade {
  list(): Promise<CatalogColor[]> {
    return colorsApi.list();
  }

  create(input: CreateCatalogColorInput): Promise<CatalogColor> {
    return colorsApi.create({
      ...input,
      name: input.name.trim(),
      hex: input.hex.trim(),
      description: input.description?.trim() || null,
    });
  }

  update(id: string, input: UpdateCatalogColorInput): Promise<CatalogColor> {
    return colorsApi.update(id, {
      ...input,
      name: input.name?.trim(),
      hex: input.hex?.trim(),
      description:
        input.description === undefined
          ? undefined
          : input.description?.trim() || null,
    });
  }

  delete(id: string) {
    return colorsApi.delete(id);
  }
}

export const colorsFacade = new ColorsFacade();
