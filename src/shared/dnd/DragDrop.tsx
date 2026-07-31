import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { motion, type Transition } from 'framer-motion';
import {
  endDriveDrag,
  moveDriveDrag,
  readDropTarget,
  startDriveDrag,
  subscribeDrag,
  type DragPayload,
  type DropTarget,
  type DropZoneTarget,
} from './drive-dnd';
import { springLayout } from '../motion';

const MOVE_THRESHOLD = 10;
const LONG_PRESS_MS = 480;

type DragItemProps = {
  payload: DragPayload;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: (e: PointerEvent) => void;
  onLongPress?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
};

export function DragItem({
  payload,
  disabled,
  className,
  children,
  onClick,
  onLongPress,
  onContextMenu,
}: DragItemProps) {
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);
  const tracking = useRef(false);
  const dragArmed = useRef(false);
  const longPressFired = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      subscribeDrag((s) => {
        setDragging(
          Boolean(
            s &&
              s.payload.id === payload.id &&
              s.payload.kind === payload.kind &&
              s.moved,
          ),
        );
      }),
    [payload.id, payload.kind],
  );

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      className={`sc-drag-item${dragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      data-drag-kind={payload.kind}
      data-drag-id={payload.id}
      onContextMenu={onContextMenu}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        pointerId.current = e.pointerId;
        tracking.current = true;
        dragArmed.current = false;
        longPressFired.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        clearLongPress();
        if (onLongPress) {
          longPressTimer.current = setTimeout(() => {
            if (!tracking.current || dragArmed.current) return;
            longPressFired.current = true;
            onLongPress();
            try {
              navigator.vibrate?.(12);
            } catch {
              /* ignore */
            }
          }, LONG_PRESS_MS);
        }
      }}
      onPointerMove={(e) => {
        if (!tracking.current || pointerId.current !== e.pointerId) return;
        const dx = Math.abs(e.clientX - origin.current.x);
        const dy = Math.abs(e.clientY - origin.current.y);

        if (!dragArmed.current) {
          if (dx <= MOVE_THRESHOLD && dy <= MOVE_THRESHOLD) return;
          clearLongPress();
          if (longPressFired.current) return;
          dragArmed.current = true;
          startDriveDrag(payload, { x: e.clientX, y: e.clientY });
        }

        const point = { x: e.clientX, y: e.clientY };
        const over = readDropTarget(
          document.elementFromPoint(e.clientX, e.clientY),
          point,
        );
        moveDriveDrag(point, over);
      }}
      onPointerUp={(e) => {
        if (!tracking.current || pointerId.current !== e.pointerId) return;
        clearLongPress();
        tracking.current = false;
        pointerId.current = null;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }

        if (longPressFired.current) {
          endDriveDrag();
          dragArmed.current = false;
          return;
        }

        if (!dragArmed.current) {
          onClick?.(e.nativeEvent);
          return;
        }

        const result = endDriveDrag();
        dragArmed.current = false;
        if (result?.moved) {
          window.dispatchEvent(
            new CustomEvent('sc-drive-drop', { detail: result }),
          );
        } else {
          onClick?.(e.nativeEvent);
        }
      }}
      onPointerCancel={() => {
        clearLongPress();
        tracking.current = false;
        pointerId.current = null;
        dragArmed.current = false;
        longPressFired.current = false;
        endDriveDrag();
      }}
    >
      {children}
    </div>
  );
}

type DropZoneProps = {
  target: DropZoneTarget;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Anima o bloco inteiro no reorder (ex.: decks). */
  layout?: boolean;
  layoutId?: string;
  layoutTransition?: Transition;
};

export function DropZone({
  target,
  className,
  style,
  children,
  layout,
  layoutId,
  layoutTransition,
}: DropZoneProps) {
  const [active, setActive] = useState(false);
  const [edge, setEdge] = useState<'before' | 'after' | 'into' | null>(null);

  useEffect(
    () =>
      subscribeDrag((s) => {
        if (!s?.over || !s.moved) {
          setActive(false);
          setEdge(null);
          return;
        }
        if (target.kind === 'root' || target.kind === 'hall') {
          setActive(s.over.kind === target.kind);
          setEdge(null);
          return;
        }
        if (target.kind === 'card') {
          const hit =
            s.over.kind === 'card' &&
            s.over.id === target.id &&
            s.payload.id !== target.id;
          setActive(hit);
          setEdge(hit && s.over.kind === 'card' ? s.over.edge : null);
          return;
        }
        if (target.kind === 'deck') {
          if (s.payload.kind === 'deck') {
            const hit =
              s.over.kind === 'deck' &&
              s.over.id === target.id &&
              s.payload.id !== target.id;
            setActive(hit);
            setEdge(
              hit && s.over.kind === 'deck' ? (s.over.edge ?? 'before') : null,
            );
            return;
          }
          setActive(s.over.kind === 'deck' && s.over.id === target.id);
          setEdge(null);
          return;
        }
        if (target.kind === 'folder') {
          if (s.payload.kind === 'folder') {
            const hit =
              s.over.kind === 'folder' &&
              s.over.id === target.id &&
              s.payload.id !== target.id;
            setActive(hit);
            setEdge(
              hit && s.over.kind === 'folder'
                ? (s.over.edge ?? 'into')
                : null,
            );
            return;
          }
          setActive(s.over.kind === 'folder' && s.over.id === target.id);
          setEdge(null);
        }
      }),
    [target],
  );

  const insertClass =
    edge === 'before'
      ? ' is-insert-before'
      : edge === 'after'
        ? ' is-insert-after'
        : edge === 'into'
          ? ' is-insert-into'
          : '';

  const zoneClass = `sc-drop-zone${active ? ' is-over' : ''}${insertClass}${className ? ` ${className}` : ''}`;
  const zoneData = {
    'data-drop-kind': target.kind,
    'data-drop-id':
      target.kind === 'root' || target.kind === 'hall' ? undefined : target.id,
    'data-insert-edge': edge ?? undefined,
  } as const;

  if (layout || layoutId) {
    return (
      <motion.div
        className={zoneClass}
        style={style}
        layout={layout}
        layoutId={layoutId}
        transition={{ layout: layoutTransition ?? springLayout }}
        {...zoneData}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={zoneClass} style={style} {...zoneData}>
      {children}
    </div>
  );
}

export function useDriveDrop(
  handler: (detail: {
    payload: DragPayload;
    over: DropTarget | null;
    moved: boolean;
  }) => void,
) {
  useEffect(() => {
    const onDrop = (event: Event) => {
      const custom = event as CustomEvent<{
        payload: DragPayload;
        over: DropTarget | null;
        moved: boolean;
      }>;
      handler(custom.detail);
    };
    window.addEventListener('sc-drive-drop', onDrop);
    return () => window.removeEventListener('sc-drive-drop', onDrop);
  }, [handler]);
}
