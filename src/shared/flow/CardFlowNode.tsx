import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
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
};

function CardFlowNodeComponent({ data, selected }: NodeProps) {
  const d = data as CardFlowNodeData;
  return (
    <div className={`sc-flow-card-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="sc-flow-handle" />
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
      <Handle type="source" position={Position.Right} className="sc-flow-handle" />
    </div>
  );
}

export const CardFlowNode = memo(CardFlowNodeComponent);
