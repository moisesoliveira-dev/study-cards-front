import { httpClient } from '../../../core/api/http-client';
import type {
  CreateDocumentNoteInput,
  DocumentNote,
  UpdateDocumentNoteInput,
} from '../types/document-note.types';

export const documentNotesApi = {
  list: (cardId: string) =>
    httpClient.get<DocumentNote[]>(
      `/cards/${encodeURIComponent(cardId)}/notes`,
    ),
  create: (cardId: string, input: CreateDocumentNoteInput) =>
    httpClient.post<DocumentNote>(
      `/cards/${encodeURIComponent(cardId)}/notes`,
      input,
    ),
  update: (cardId: string, noteId: string, input: UpdateDocumentNoteInput) =>
    httpClient.patch<DocumentNote>(
      `/cards/${encodeURIComponent(cardId)}/notes/${encodeURIComponent(noteId)}`,
      input,
    ),
  remove: (cardId: string, noteId: string) =>
    httpClient.delete<{ ok: boolean }>(
      `/cards/${encodeURIComponent(cardId)}/notes/${encodeURIComponent(noteId)}`,
    ),
};
