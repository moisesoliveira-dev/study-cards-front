import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  HALL_DND_ID,
  ROOT_DND_ID,
  cardDndId,
  deckDndId,
  folderDndId,
  parseDndId,
  type DragPayload,
  type DriveDragData,
  type DropTarget,
} from './drive-dnd';

export type DriveDropEvent = {
  payload: DragPayload;
  over: DropTarget | null;
  moved: boolean;
};

export type DriveReorderPreview = {
  kind: 'card' | 'deck' | 'folder';
  activeId: string;
  overId: string;
  deckId?: string | null;
};

type DriveDndProviderProps = {
  children: ReactNode;
  onDrop: (event: DriveDropEvent) => void | Promise<void>;
  /** Snapshot da ordem no início do drag. */
  onDragTrackStart?: (payload: DragPayload) => void;
  /** Reordena a lista local durante o drag (evita snap no drop). */
  onReorderPreview?: (event: DriveReorderPreview) => void;
};

type Point = { x: number; y: number };

function insertEdge(
  activeTop: number,
  activeLeft: number,
  overRect: { top: number; left: number; width: number; height: number },
  axis: 'horizontal' | 'vertical',
): 'before' | 'after' {
  if (axis === 'horizontal') {
    const mid = overRect.left + overRect.width / 2;
    return activeLeft + 8 < mid ? 'before' : 'after';
  }
  const mid = overRect.top + overRect.height / 2;
  return activeTop + 8 < mid ? 'before' : 'after';
}

/**
 * Bordas de ~12px = reordenar; o restante (maioria) = aninhar.
 * Usa a posição do ponteiro — mais estável que o rect do item arrastado.
 */
function folderEdgeFromPointer(
  point: Point,
  overRect: { top: number; left: number; width: number; height: number },
  grid: boolean,
): 'before' | 'after' | 'into' {
  const band = 12;
  if (grid) {
    if (point.x < overRect.left + band) return 'before';
    if (point.x > overRect.left + overRect.width - band) return 'after';
    return 'into';
  }
  if (point.y < overRect.top + band) return 'before';
  if (point.y > overRect.top + overRect.height - band) return 'after';
  return 'into';
}

function isFolderDropInGrid(overId: UniqueIdentifier): boolean {
  if (typeof document === 'undefined') return true;
  return Boolean(
    document
      .querySelector(`[data-dnd-id="${String(overId)}"]`)
      ?.closest('.sc-grid'),
  );
}

function resolveDropTarget(
  event: DragEndEvent,
  pointer: Point,
  shiftKey: boolean,
): DropTarget | null {
  const { active, over } = event;
  if (!over) return null;

  const activeData = active.data.current as DriveDragData | undefined;
  const payload = activeData?.payload;
  if (!payload) return null;

  const overParsed = parseDndId(over.id);
  if (!overParsed) return null;

  const translated = active.rect.current.translated;
  const activeTop = translated?.top ?? over.rect.top;
  const activeLeft = translated?.left ?? over.rect.left;

  if (payload.kind === 'card') {
    if (overParsed.type === 'card' && overParsed.id) {
      if (overParsed.id === payload.id) return null;
      return {
        kind: 'card',
        id: overParsed.id,
        edge: insertEdge(activeTop, activeLeft, over.rect, 'horizontal'),
      };
    }
    if (overParsed.type === 'deck' && overParsed.id) {
      return { kind: 'deck', id: overParsed.id };
    }
    if (overParsed.type === 'folder' && overParsed.id) {
      return { kind: 'folder', id: overParsed.id };
    }
    if (overParsed.type === 'hall') return { kind: 'hall' };
    if (overParsed.type === 'root') return { kind: 'root' };
    return null;
  }

  if (payload.kind === 'deck') {
    if (overParsed.type === 'deck' && overParsed.id) {
      if (overParsed.id === payload.id) return null;
      return {
        kind: 'deck',
        id: overParsed.id,
        edge: insertEdge(activeTop, activeLeft, over.rect, 'vertical'),
      };
    }
    return null;
  }

  if (payload.kind === 'folder') {
    if (overParsed.type === 'folder' && overParsed.id) {
      if (overParsed.id === payload.id) return null;
      // Soltar em cima de outra pasta = aninhar (confiável).
      // Segure Shift para reordenar pelas bordas.
      const edge = shiftKey
        ? folderEdgeFromPointer(
            pointer,
            over.rect,
            isFolderDropInGrid(over.id),
          )
        : 'into';
      return {
        kind: 'folder',
        id: overParsed.id,
        edge,
      };
    }
    if (overParsed.type === 'root') return { kind: 'root' };
    return null;
  }

  return null;
}

/** Prioriza itens sob o ponteiro; fallback para centro mais próximo. */
const driveCollision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length) return pointer;
  const rects = rectIntersection(args);
  if (rects.length) return rects;
  return closestCenter(args);
};

export function DriveDndProvider({
  children,
  onDrop,
  onDragTrackStart,
  onReorderPreview,
}: DriveDndProviderProps) {
  const [activePayload, setActivePayload] = useState<DragPayload | null>(null);
  const pointerRef = useRef<Point>({ x: 0, y: 0 });
  const shiftRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
  );

  useEffect(() => {
    if (!activePayload) return;
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      shiftRef.current = e.shiftKey;
    };
    const onKey = (e: KeyboardEvent) => {
      shiftRef.current = e.shiftKey;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [activePayload]);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as DriveDragData | undefined;
      const ae = event.activatorEvent;
      if (ae && 'clientX' in ae) {
        pointerRef.current = {
          x: (ae as PointerEvent).clientX,
          y: (ae as PointerEvent).clientY,
        };
        shiftRef.current = Boolean((ae as PointerEvent).shiftKey);
      }
      setActivePayload(data?.payload ?? null);
      document.body.classList.add('sc-dragging');
      if (data?.payload) onDragTrackStart?.(data.payload);
    },
    [onDragTrackStart],
  );

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!onReorderPreview) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const a = parseDndId(active.id);
      const o = parseDndId(over.id);
      if (!a?.id || !o?.id || a.type !== o.type) return;

      if (a.type === 'card') {
        const activePayload = (active.data.current as DriveDragData | undefined)
          ?.payload;
        const overPayload = (over.data.current as DriveDragData | undefined)
          ?.payload;
        if (
          activePayload?.kind !== 'card' ||
          overPayload?.kind !== 'card' ||
          activePayload.deckId !== overPayload.deckId
        ) {
          return;
        }
        onReorderPreview({
          kind: 'card',
          activeId: a.id,
          overId: o.id,
          deckId: activePayload.deckId,
        });
        return;
      }

      if (a.type === 'deck') {
        onReorderPreview({
          kind: 'deck',
          activeId: a.id,
          overId: o.id,
        });
        return;
      }

      // Pastas: NÃO reordenar ao vivo — isso teleporta o item no DOM e o
      // ghost/overlay fica longe do cursor. Nest/reorder só no drop.
    },
    [onReorderPreview],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      document.body.classList.remove('sc-dragging');
      setActivePayload(null);
      const data = event.active.data.current as DriveDragData | undefined;
      if (!data?.payload) return;
      const over = resolveDropTarget(
        event,
        pointerRef.current,
        shiftRef.current,
      );
      if (!over) return;
      void onDrop({ payload: data.payload, over, moved: true });
    },
    [onDrop],
  );

  const onDragCancel = useCallback(() => {
    document.body.classList.remove('sc-dragging');
    setActivePayload(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={driveCollision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      {createPortal(
        <DragOverlay
          dropAnimation={null}
          modifiers={[snapCenterToCursor]}
        >
          {activePayload ? (
            <div
              className="sc-drag-ghost is-overlay"
              data-kind={activePayload.kind}
            >
              {activePayload.label}
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

/* ——— Droppables estáticos ——— */

export function HallDroppable({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: HALL_DND_ID,
    data: { type: 'hall' },
  });
  return (
    <div
      ref={setNodeRef}
      className={`sc-drop-zone${isOver ? ' is-over' : ''}${className ? ` ${className}` : ''}`}
      data-drop-kind="hall"
    >
      {children}
    </div>
  );
}

export function RootDroppable({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: ROOT_DND_ID,
    data: { type: 'root' },
  });
  return (
    <div
      ref={setNodeRef}
      className={`sc-drop-zone${isOver ? ' is-over' : ''}`}
      data-drop-kind="root"
    >
      {children}
    </div>
  );
}

/* ——— Sortable contexts ——— */

export function CardSortableContext({
  ids,
  children,
  layout = 'horizontal',
}: {
  ids: string[];
  children: ReactNode;
  layout?: 'horizontal' | 'vertical';
}) {
  const items = useMemo(() => ids.map(cardDndId), [ids]);
  return (
    <SortableContext
      items={items}
      strategy={
        layout === 'horizontal'
          ? horizontalListSortingStrategy
          : verticalListSortingStrategy
      }
    >
      {children}
    </SortableContext>
  );
}

export function DeckSortableContext({
  ids,
  children,
}: {
  ids: string[];
  children: ReactNode;
}) {
  const items = useMemo(() => ids.map(deckDndId), [ids]);
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}

export function FolderSortableContext({
  ids,
  children,
  layout = 'grid',
}: {
  ids: string[];
  children: ReactNode;
  layout?: 'grid' | 'list';
}) {
  const items = useMemo(() => ids.map(folderDndId), [ids]);
  return (
    <SortableContext
      items={items}
      strategy={
        layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy
      }
    >
      {children}
    </SortableContext>
  );
}

/* ——— Sortable items ——— */

type SortableCardProps = {
  payload: Extract<DragPayload, { kind: 'card' }>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: (e: { shiftKey: boolean }) => void;
  onContextMenu?: (e: MouseEvent) => void;
};

export function SortableCard({
  payload,
  className,
  style,
  children,
  onClick,
  onContextMenu,
}: SortableCardProps) {
  const id = cardDndId(payload.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data: { type: 'card', payload } satisfies DriveDragData,
    animateLayoutChanges: () => false,
  });

  const mergedStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0 : undefined,
    zIndex: isDragging ? 50 : style?.zIndex,
  };

  const { onPointerDown, ...restListeners } = listeners ?? {};

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`sc-drop-zone${isOver ? ' is-over' : ''}${isDragging ? ' is-dragging-item' : ''}${className ? ` ${className}` : ''}`}
      data-dnd-id={id}
      data-drop-kind="card"
      data-drop-id={payload.id}
      data-drag-kind="card"
      data-drag-id={payload.id}
      {...attributes}
      {...restListeners}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e as unknown as PointerEvent);
      }}
      onClick={(e) => {
        if (isDragging) return;
        onClick?.({ shiftKey: e.shiftKey });
      }}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

type SortableDeckProps = {
  payload: Extract<DragPayload, { kind: 'deck' }>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onContextMenu?: (e: MouseEvent) => void;
};

export function SortableDeck({
  payload,
  className,
  style,
  children,
  onContextMenu,
}: SortableDeckProps) {
  const id = deckDndId(payload.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data: { type: 'deck', payload } satisfies DriveDragData,
    animateLayoutChanges: () => false,
  });

  const mergedStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`sc-drop-zone${isOver ? ' is-over' : ''}${isDragging ? ' is-dragging-item' : ''}${className ? ` ${className}` : ''}`}
      data-dnd-id={id}
      data-drop-kind="deck"
      data-drop-id={payload.id}
      data-drag-kind="deck"
      data-drag-id={payload.id}
      {...attributes}
      {...listeners}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

type SortableFolderProps = {
  payload: Extract<DragPayload, { kind: 'folder' }>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
};

export function SortableFolder({
  payload,
  className,
  style,
  children,
  onClick,
  onContextMenu,
}: SortableFolderProps) {
  const id = folderDndId(payload.id);
  const { active, over } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data: { type: 'folder', payload } satisfies DriveDragData,
    animateLayoutChanges: () => false,
  });

  const activeKind = (active?.data.current as DriveDragData | undefined)
    ?.payload?.kind;
  const nestIntent =
    isOver &&
    activeKind === 'folder' &&
    (active?.data.current as DriveDragData | undefined)?.payload?.id !==
      payload.id &&
    over?.id === id;

  const mergedStyle: CSSProperties = {
    ...style,
    // Sem teleporte visual: o DragOverlay segue o cursor; o item fica no lugar.
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`sc-drop-zone${isOver ? ' is-over' : ''}${nestIntent ? ' is-insert-into' : ''}${isDragging ? ' is-dragging-item' : ''}${className ? ` ${className}` : ''}`}
      data-dnd-id={id}
      data-drop-kind="folder"
      data-drop-id={payload.id}
      data-drag-kind="folder"
      data-drag-id={payload.id}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onClick?.();
      }}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

export type { UniqueIdentifier };
