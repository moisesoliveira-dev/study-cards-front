/** Tipos e IDs estáveis para o DnD do Drive (@dnd-kit). */

export type DragCardPayload = {
  kind: 'card';
  id: string;
  subjectId: string;
  topicId: string | null;
  deckId: string | null;
  label: string;
};

export type DragFolderPayload = {
  kind: 'folder';
  id: string;
  subjectId: string;
  parentId: string | null;
  label: string;
};

export type DragDeckPayload = {
  kind: 'deck';
  id: string;
  subjectId: string;
  topicId: string | null;
  label: string;
};

export type DragPayload =
  | DragCardPayload
  | DragFolderPayload
  | DragDeckPayload;

export type DropTarget =
  | { kind: 'folder'; id: string; edge?: 'before' | 'after' | 'into' }
  | { kind: 'card'; id: string; edge: 'before' | 'after' }
  | { kind: 'deck'; id: string; edge?: 'before' | 'after' }
  | { kind: 'hall' }
  | { kind: 'root' };

export type DriveDragData = {
  type: 'card' | 'deck' | 'folder';
  payload: DragPayload;
};

export function cardDndId(id: string) {
  return `card:${id}`;
}

export function deckDndId(id: string) {
  return `deck:${id}`;
}

export function folderDndId(id: string) {
  return `folder:${id}`;
}

export const HALL_DND_ID = 'hall';
export const ROOT_DND_ID = 'root';

export function parseDndId(raw: string | number): {
  type: 'card' | 'deck' | 'folder' | 'hall' | 'root';
  id?: string;
} | null {
  const id = String(raw);
  if (id === HALL_DND_ID) return { type: 'hall' };
  if (id === ROOT_DND_ID) return { type: 'root' };
  const idx = id.indexOf(':');
  if (idx < 0) return null;
  const type = id.slice(0, idx);
  const entityId = id.slice(idx + 1);
  if (!entityId) return null;
  if (type === 'card' || type === 'deck' || type === 'folder') {
    return { type, id: entityId };
  }
  return null;
}
