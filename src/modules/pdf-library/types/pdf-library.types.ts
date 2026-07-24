export type PdfGroup = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type PdfDocument = {
  id: string;
  userId: string;
  groupId?: string | null;
  title: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PdfLibrary = {
  groups: PdfGroup[];
  documents: PdfDocument[];
};

export type CreatePdfGroupInput = {
  name: string;
  description?: string;
  color?: string;
};

export type UpdatePdfDocumentInput = {
  title?: string;
  groupId?: string | null;
  favorite?: boolean;
};
