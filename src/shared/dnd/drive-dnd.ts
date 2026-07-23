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

export type DropTarget =
  | { kind: 'folder'; id: string }
  | { kind: 'card'; id: string }
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

function updateGhost() {
  if (!state || !ghostEl) return;
  ghostEl.textContent = state.payload.label;
  ghostEl.style.transform = `translate(${state.x + 12}px, ${state.y + 12}px)`;
  ghostEl.dataset.kind = state.payload.kind;
  ghostEl.dataset.over = state.over?.kind ?? '';
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

export function moveDriveDrag(point: { x: number; y: number }, over: DropTarget | null) {
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

export function readDropTarget(el: Element | null): DropTarget | null {
  let node: Element | null = el;
  while (node) {
    const kind = node.getAttribute('data-drop-kind');
    const id = node.getAttribute('data-drop-id');
    if (kind === 'root') return { kind: 'root' };
    if ((kind === 'folder' || kind === 'card') && id) {
      return { kind, id };
    }
    node = node.parentElement;
  }
  return null;
}
