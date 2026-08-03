import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDndContext,
  useDraggable,
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  useCallback,
  useMemo,
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

function resolveDropTarget(event: DragEndEvent): DropTarget | null {
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
    // Só aninhar (ou voltar um nível). Ordem das pastas = alfanumérica.
    if (overParsed.type === 'folder' && overParsed.id) {
      if (overParsed.id === payload.id) return null;
      return { kind: 'folder', id: overParsed.id, edge: 'into' };
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as DriveDragData | undefined;
      setActivePayload(data?.payload ?? null);
      document.body.classList.add('sc-dragging');
      if (data?.payload?.kind === 'folder') {
        document.body.classList.add('sc-folder-nest');
      }
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

      // Pastas não reordenam manualmente.
      if (a.type === 'folder') return;

      if (a.type === 'card') {
        const dragPayload = (active.data.current as DriveDragData | undefined)
          ?.payload;
        const overPayload = (over.data.current as DriveDragData | undefined)
          ?.payload;
        if (
          dragPayload?.kind !== 'card' ||
          overPayload?.kind !== 'card' ||
          dragPayload.deckId !== overPayload.deckId
        ) {
          return;
        }
        onReorderPreview({
          kind: 'card',
          activeId: a.id,
          overId: o.id,
          deckId: dragPayload.deckId,
        });
        return;
      }

      if (a.type === 'deck') {
        onReorderPreview({
          kind: 'deck',
          activeId: a.id,
          overId: o.id,
        });
      }
    },
    [onReorderPreview],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      document.body.classList.remove('sc-dragging');
      document.body.classList.remove('sc-folder-nest');
      setActivePayload(null);
      const data = event.active.data.current as DriveDragData | undefined;
      if (!data?.payload) return;
      const over = resolveDropTarget(event);
      // Mesmo sem alvo (soltou no próprio card / vazio), o pai precisa
      // persistir reordenação já aplicada no preview.
      void onDrop({
        payload: data.payload,
        over,
        moved: Boolean(over) || data.payload.kind === 'card' || data.payload.kind === 'deck',
      });
    },
    [onDrop],
  );

  const onDragCancel = useCallback(() => {
    document.body.classList.remove('sc-dragging');
    document.body.classList.remove('sc-folder-nest');
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
        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
          {activePayload ? (
            <div
              className="sc-drag-ghost is-overlay"
              data-kind={activePayload.kind}
              data-nest={
                activePayload.kind === 'folder' ? 'into' : undefined
              }
            >
              {activePayload.kind === 'folder'
                ? `📁 ${activePayload.label}`
                : activePayload.label}
              {activePayload.kind === 'folder' ? (
                <span className="sc-drag-ghost-hint">
                  Soltar em uma pasta → mover para dentro
                </span>
              ) : null}
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

/** Pastas não usam Sortable — só drag para aninhar. Wrapper mantido por compat. */
export function FolderSortableContext({
  children,
}: {
  ids?: string[];
  children: ReactNode;
  layout?: 'grid' | 'list';
}) {
  return <>{children}</>;
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

/**
 * Pasta arrastável (aninhar) + alvo de drop.
 * Sem reordenação manual — a lista é sempre alfanumérica.
 */
export function SortableFolder({
  payload,
  className,
  style,
  children,
  onClick,
  onContextMenu,
}: SortableFolderProps) {
  const id = folderDndId(payload.id);
  const { active } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id,
    data: { type: 'folder', payload } satisfies DriveDragData,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id,
    data: { type: 'folder', payload } satisfies DriveDragData,
    disabled: isDragging,
  });

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  const activeKind = (active?.data.current as DriveDragData | undefined)
    ?.payload?.kind;
  const nestIntent =
    isOver &&
    activeKind === 'folder' &&
    (active?.data.current as DriveDragData | undefined)?.payload?.id !==
      payload.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0 : undefined,
      }}
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
