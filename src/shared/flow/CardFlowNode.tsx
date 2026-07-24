import {
  memo,
  useCallback,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { statusClass, statusLabel } from '../../modules/cards/types/card.types';
import { suitColor } from '../components/FaceCardComposer';
import { CardFaceIcon } from '../components/CardIcon';

export type CardFlowNodeData = {
  cardId: string;
  front: string;
  back: string;
  tag: string;
  icon: string | null;
  status: 'NEW' | 'REVIEW' | 'KNOWN';
  linkCount: number;
  /** Offset 0–1 along each handle side, keyed by handle id */
  handleOffsets?: Record<string, number>;
  /** Reject every incoming connection */
  blockIncoming?: boolean;
  /** Source node ids that cannot connect into this node */
  blockedSourceIds?: string[];
};

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
type Side = (typeof SIDES)[number];
const SLOT_COUNT = 3;

function sidePosition(side: Side): Position {
  if (side === 'top') return Position.Top;
  if (side === 'right') return Position.Right;
  if (side === 'bottom') return Position.Bottom;
  return Position.Left;
}

function defaultOffset(slot: number) {
  return (slot + 1) / (SLOT_COUNT + 1);
}

function handleId(type: 'source' | 'target', side: Side, slot: number) {
  return `${type === 'source' ? 's' : 't'}-${side}-${slot}`;
}

function CardFlowNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as CardFlowNodeData;
  const { setNodes } = useReactFlow();
  const nodeRef = useRef<HTMLDivElement>(null);

  const offsets = useMemo(
    () => d.handleOffsets ?? {},
    [d.handleOffsets],
  );

  const setHandleOffset = useCallback(
    (handleKey: string, offset: number) => {
      const next = Math.min(0.92, Math.max(0.08, offset));
      setNodes((nodes: Node[]) =>
        nodes.map((n) => {
          if (n.id !== id) return n;
          const prev = (n.data as CardFlowNodeData).handleOffsets ?? {};
          return {
            ...n,
            data: {
              ...n.data,
              handleOffsets: { ...prev, [handleKey]: next },
            },
          };
        }),
      );
    },
    [id, setNodes],
  );

  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent, side: Side, handleKey: string) => {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();

      const el = nodeRef.current;
      if (!el) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      const move = (ev: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const next =
          side === 'left' || side === 'right'
            ? (ev.clientY - rect.top) / rect.height
            : (ev.clientX - rect.left) / rect.width;
        setHandleOffset(handleKey, next);
      };

      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.dispatchEvent(new CustomEvent('sc-flow-graph-dirty'));
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [setHandleOffset],
  );

  return (
    <div
      ref={nodeRef}
      className={`sc-flow-card-node${selected ? ' is-selected' : ''}${d.blockIncoming ? ' is-locked-in' : ''}${(d.blockedSourceIds?.length ?? 0) > 0 ? ' has-blocked-sources' : ''}`}
    >
      {d.blockIncoming ? (
        <span className="sc-flow-node-lock" title="Entradas bloqueadas">
          🔒
        </span>
      ) : (d.blockedSourceIds?.length ?? 0) > 0 ? (
        <span
          className="sc-flow-node-lock is-partial"
          title={`${d.blockedSourceIds!.length} fonte(s) bloqueada(s)`}
        >
          🚫
        </span>
      ) : null}

      {SIDES.map((side) =>
        Array.from({ length: SLOT_COUNT }, (_, slot) => {
          const tId = handleId('target', side, slot);
          const sId = handleId('source', side, slot);
          const tOff = offsets[tId] ?? defaultOffset(slot);
          const sOff = offsets[sId] ?? defaultOffset(slot);
          const tStyle =
            side === 'left' || side === 'right'
              ? { top: `${tOff * 100}%` }
              : { left: `${tOff * 100}%` };
          const sStyle =
            side === 'left' || side === 'right'
              ? { top: `${sOff * 100}%` }
              : { left: `${sOff * 100}%` };

          return (
            <span key={side + slot}>
              <Handle
                type="target"
                id={tId}
                position={sidePosition(side)}
                className={`sc-flow-handle${d.blockIncoming ? ' is-blocked' : ''}`}
                style={tStyle}
                isConnectable={!d.blockIncoming}
                title={
                  d.blockIncoming
                    ? 'Entradas bloqueadas'
                    : 'Alt+arrastar para reposicionar'
                }
                onPointerDown={(e) => onHandlePointerDown(e, side, tId)}
              />
              <Handle
                type="source"
                id={sId}
                position={sidePosition(side)}
                className="sc-flow-handle"
                style={sStyle}
                title="Alt+arrastar para reposicionar"
                onPointerDown={(e) => onHandlePointerDown(e, side, sId)}
              />
            </span>
          );
        }),
      )}

      <div className="sc-flow-card-tag" style={{ color: suitColor(d.tag) }}>
        {d.tag}
      </div>
      {d.icon ? (
        <CardFaceIcon
          icon={d.icon}
          className="sc-flow-card-icon"
          color={suitColor(d.tag)}
        />
      ) : null}
      <div className="sc-flow-card-title">{d.front}</div>
      <div className="sc-flow-card-body">{d.back}</div>
      <div className="sc-flow-card-meta">
        <span className={`card-status ${statusClass(d.status)}`}>
          {statusLabel(d.status)}
        </span>
        {d.linkCount > 0 ? (
          <span className="sc-flow-card-links">→ {d.linkCount}</span>
        ) : null}
      </div>
    </div>
  );
}

export const CardFlowNode = memo(CardFlowNodeComponent);
