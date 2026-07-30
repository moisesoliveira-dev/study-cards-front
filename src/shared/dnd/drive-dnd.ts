export type DragCardPayload = {
  kind: 'card';
  id: string;
  subjectId: string;
  topicId: string | null;
  label: string;
};

export type DragFolderPayload = {
  kind: 'folder';
  id: string;
  subjectId: string;
  parentId: string | null;
  label: string;
};

export type DragPayload = DragCardPayload | DragFolderPayload;

/** Alvo estático de drop (sem lado de inserção). */
export type DropZoneTarget =
  | { kind: 'folder'; id: string }
  | { kind: 'card'; id: string }
  | { kind: 'deck'; id: string }
  | { kind: 'hall' }
  | { kind: 'root' };

/** Alvo ativo durante o drag (cartas incluem lado). */
export type DropTarget =
  | { kind: 'folder'; id: string }
  | { kind: 'card'; id: string; edge: 'before' | 'after' }
  | { kind: 'deck'; id: string }
  | { kind: 'hall' }
  | { kind: 'root' };

type DragState = {
  payload: DragPayload;
  x: number;
  y: number;
  over: DropTarget | null;
  moved: boolean;
};

type Listener = (state: DragState | null) => void;

let state: DragState | null = null;
const listeners = new Set<Listener>();
let ghostEl: HTMLDivElement | null = null;

function emit() {
  for (const listener of listeners) listener(state);
}

function ensureGhost() {
  if (ghostEl) return ghostEl;
  ghostEl = document.createElement('div');
  ghostEl.className = 'sc-drag-ghost';
  document.body.appendChild(ghostEl);
  return ghostEl;
}

function ghostHint(over: DropTarget | null): string {
  if (!over) return '';
  if (over.kind === 'card') {
    return over.edge === 'before' ? ' · inserir antes' : ' · inserir depois';
  }
  if (over.kind === 'deck') return ' · para o deck';
  if (over.kind === 'hall') return ' · para o Hall';
  if (over.kind === 'folder') return ' · para a pasta';
  if (over.kind === 'root') return ' · um nível acima';
  return '';
}

function updateGhost() {
  if (!state || !ghostEl) return;
  ghostEl.textContent = `${state.payload.label}${ghostHint(state.over)}`;
  ghostEl.style.transform = `translate(${state.x + 12}px, ${state.y + 12}px)`;
  ghostEl.dataset.kind = state.payload.kind;
  ghostEl.dataset.over = state.over?.kind ?? '';
  ghostEl.dataset.edge =
    state.over?.kind === 'card' ? state.over.edge : '';
}

export function subscribeDrag(listener: Listener) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function getDragState() {
  return state;
}

export function startDriveDrag(
  payload: DragPayload,
  point: { x: number; y: number },
) {
  state = {
    payload,
    x: point.x,
    y: point.y,
    over: null,
    moved: false,
  };
  document.body.classList.add('sc-dragging');
  ensureGhost();
  updateGhost();
  emit();
}

export function moveDriveDrag(
  point: { x: number; y: number },
  over: DropTarget | null,
) {
  if (!state) return;
  const dx = Math.abs(point.x - state.x);
  const dy = Math.abs(point.y - state.y);
  state = {
    ...state,
    x: point.x,
    y: point.y,
    over,
    moved: state.moved || dx > 4 || dy > 4,
  };
  updateGhost();
  emit();
}

export function endDriveDrag(): {
  payload: DragPayload;
  over: DropTarget | null;
  moved: boolean;
} | null {
  if (!state) return null;
  const result = {
    payload: state.payload,
    over: state.over,
    moved: state.moved,
  };
  state = null;
  document.body.classList.remove('sc-dragging');
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
  emit();
  return result;
}

function cardInsertEdge(
  node: Element,
  point: { x: number; y: number },
  sticky?: { id: string; edge: 'before' | 'after' } | null,
): 'before' | 'after' {
  const rect = node.getBoundingClientRect();
  const id = node.getAttribute('data-drop-id');
  const inHand = Boolean(
    node.closest('.sc-hand, .sc-deck-hand, .sc-hand-slot'),
  );
  const span = inHand ? rect.width : rect.height;
  const offset = inHand ? point.x - rect.left : point.y - rect.top;
  const ratio = offset / Math.max(span, 1);

  // Histerese: evita tremer no meio da carta
  if (sticky && sticky.id === id) {
    if (sticky.edge === 'before') {
      return ratio < 0.64 ? 'before' : 'after';
    }
    return ratio > 0.36 ? 'after' : 'before';
  }

  return ratio < 0.5 ? 'before' : 'after';
}

export function readDropTarget(
  el: Element | null,
  point?: { x: number; y: number },
): DropTarget | null {
  let node: Element | null = el;
  while (node) {
    const kind = node.getAttribute('data-drop-kind');
    const id = node.getAttribute('data-drop-id');
    if (kind === 'root') return { kind: 'root' };
    if (kind === 'hall') return { kind: 'hall' };
    if (kind === 'card' && id) {
      const sticky =
        state?.over?.kind === 'card'
          ? { id: state.over.id, edge: state.over.edge }
          : null;
      const edge = point
        ? cardInsertEdge(node, point, sticky)
        : 'before';
      return { kind: 'card', id, edge };
    }
    if ((kind === 'folder' || kind === 'deck') && id) {
      return { kind, id };
    }
    node = node.parentElement;
  }
  return null;
}
