import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
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
import { CSS } from '@dnd-kit/utilities';
import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
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

type DriveDndProviderProps = {
  children: ReactNode;
  onDrop: (event: DriveDropEvent) => void | Promise<void>;
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

function folderEdge(
  activeTop: number,
  activeLeft: number,
  overRect: { top: number; left: number; width: number; height: number },
  grid: boolean,
): 'before' | 'after' | 'into' {
  if (grid) {
    const ratio = (activeLeft + 16 - overRect.left) / Math.max(overRect.width, 1);
    if (ratio < 0.25) return 'before';
    if (ratio > 0.75) return 'after';
    return 'into';
  }
  const ratio = (activeTop + 16 - overRect.top) / Math.max(overRect.height, 1);
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'into';
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
    if (overParsed.type === 'folder' && overParsed.id) {
      if (overParsed.id === payload.id) return null;
      const grid = Boolean(
        typeof document !== 'undefined' &&
          document
            .querySelector(`[data-dnd-id="${String(over.id)}"]`)
            ?.closest('.sc-grid'),
      );
      return {
        kind: 'folder',
        id: overParsed.id,
        edge: folderEdge(activeTop, activeLeft, over.rect, grid),
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

export function DriveDndProvider({ children, onDrop }: DriveDndProviderProps) {
  const [activePayload, setActivePayload] = useState<DragPayload | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DriveDragData | undefined;
    setActivePayload(data?.payload ?? null);
    document.body.classList.add('sc-dragging');
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      document.body.classList.remove('sc-dragging');
      setActivePayload(null);
      const data = event.active.data.current as DriveDragData | undefined;
      if (!data?.payload) return;
      const over = resolveDropTarget(event);
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
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activePayload ? (
          <div
            className="sc-drag-ghost is-overlay"
            data-kind={activePayload.kind}
          >
            {activePayload.label}
          </div>
        ) : null}
      </DragOverlay>
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
  });

  const mergedStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
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
  });

  const mergedStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
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
  });

  const mergedStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`sc-drop-zone${isOver ? ' is-over' : ''}${isDragging ? ' is-dragging-item' : ''}${className ? ` ${className}` : ''}`}
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
