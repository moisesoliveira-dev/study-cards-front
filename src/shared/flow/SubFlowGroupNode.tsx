import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';

export type SubFlowGroupData = {
  label: string;
};

function SubFlowGroupNodeComponent({ data, selected }: NodeProps) {
  const d = data as SubFlowGroupData;
  return (
    <div className={`sc-flow-group-node${selected ? ' is-selected' : ''}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={160}
        lineClassName="sc-flow-resize-line"
        handleClassName="sc-flow-resize-handle"
      />
      <div className="sc-flow-group-label">{d.label || 'Subfluxo'}</div>
    </div>
  );
}

export const SubFlowGroupNode = memo(SubFlowGroupNodeComponent);
