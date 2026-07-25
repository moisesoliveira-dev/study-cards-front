import { httpClient } from '../../../core/api/http-client';
import type {
  CreatePdfGroupInput,
  PdfDocument,
  PdfGroup,
  PdfLibrary,
  UpdatePdfDocumentInput,
} from '../types/pdf-library.types';

export const pdfLibraryApi = {
  list: () => httpClient.get<PdfLibrary>('/pdf-library'),
  createGroup: (input: CreatePdfGroupInput) =>
    httpClient.post<PdfGroup>('/pdf-library/groups', input),
  updateGroup: (id: string, input: Partial<CreatePdfGroupInput>) =>
    httpClient.patch<PdfGroup>(
      `/pdf-library/groups/${encodeURIComponent(id)}`,
      input,
    ),
  removeGroup: (id: string) =>
    httpClient.delete<{ ok: true }>(
      `/pdf-library/groups/${encodeURIComponent(id)}`,
    ),
  upload: (file: File, input: { title?: string; groupId?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (input.title) form.append('title', input.title);
    if (input.groupId) form.append('groupId', input.groupId);
    return httpClient.postForm<PdfDocument>('/pdf-library/documents', form);
  },
  updateDocument: (id: string, input: UpdatePdfDocumentInput) =>
    httpClient.patch<PdfDocument>(
      `/pdf-library/documents/${encodeURIComponent(id)}`,
      input,
    ),
  removeDocument: (id: string) =>
    httpClient.delete<{ ok: true }>(
      `/pdf-library/documents/${encodeURIComponent(id)}`,
    ),
  file: (id: string) =>
    httpClient.getBlob(
      `/pdf-library/documents/${encodeURIComponent(id)}/file`,
    ),
};
