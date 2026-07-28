import { documentNotesApi } from '../api/document-notes.api';
import type {
  CreateDocumentNoteInput,
  UpdateDocumentNoteInput,
} from '../types/document-note.types';

export class DocumentNotesFacade {
  list(cardId: string) {
    return documentNotesApi.list(cardId);
  }

  create(cardId: string, input: CreateDocumentNoteInput) {
    return documentNotesApi.create(cardId, input);
  }

  update(cardId: string, noteId: string, input: UpdateDocumentNoteInput) {
    return documentNotesApi.update(cardId, noteId, input);
  }

  remove(cardId: string, noteId: string) {
    return documentNotesApi.remove(cardId, noteId);
  }
}

export const documentNotesFacade = new DocumentNotesFacade();
