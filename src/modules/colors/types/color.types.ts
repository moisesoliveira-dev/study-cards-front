export type CatalogColor = {
  id: string;
  name: string;
  hex: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCatalogColorInput = {
  name: string;
  hex: string;
  description?: string | null;
  position?: number;
};

export type UpdateCatalogColorInput = {
  name?: string;
  hex?: string;
  description?: string | null;
  position?: number;
};
