import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { isSynthesisEdge } from './flow-edge.utils';

function CardFlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  label,
  data,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const synthesis = isSynthesisEdge({ label, data });
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        <div
          className={`sc-flow-edge-label nodrag nopan${selected ? ' is-selected' : ''}${synthesis ? ' is-synthesis' : ''}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {synthesis ? <span className="sc-flow-edge-badge">síntese</span> : null}
          {!synthesis && selected ? (
            <button
              type="button"
              className="sc-flow-edge-delete"
              aria-label="Remover conexão"
              title="Remover conexão"
              onClick={(e) => {
                e.stopPropagation();
                void deleteElements({ edges: [{ id }] });
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CardFlowEdge = memo(CardFlowEdgeComponent);
