import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import {
  getEdgeData,
  isSynthesisEdge,
  type FlowEdgePathType,
} from './flow-edge.utils';

function edgePath(
  pathType: FlowEdgePathType,
  props: Pick<
    EdgeProps,
    | 'sourceX'
    | 'sourceY'
    | 'targetX'
    | 'targetY'
    | 'sourcePosition'
    | 'targetPosition'
  >,
) {
  if (pathType === 'straight') {
    return getStraightPath(props);
  }
  if (pathType === 'bezier') {
    return getBezierPath(props);
  }
  if (pathType === 'step') {
    return getSmoothStepPath({ ...props, borderRadius: 0 });
  }
  return getSmoothStepPath(props);
}

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
  const edgeData = getEdgeData({ data });
  const synthesis = isSynthesisEdge({ label, data });
  const pathType = edgeData.pathType ?? 'smoothstep';
  const [path, labelX, labelY] = edgePath(pathType, {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const stroke = edgeData.strokeColor ?? 'var(--border-accent)';
  const strokeWidth = edgeData.strokeWidth ?? (selected ? 2.5 : 2);
  const dash = edgeData.dashed ? '6 4' : undefined;
  const svgAnimate = edgeData.svgAnimate ?? true;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          ...style,
          stroke,
          strokeWidth,
          strokeDasharray: dash,
        }}
      />
      {svgAnimate ? (
        <circle r={3.5} fill={stroke} className="sc-flow-edge-particle">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
      <EdgeLabelRenderer>
        <div
          className={`sc-flow-edge-label nodrag nopan${selected ? ' is-selected' : ''}${synthesis ? ' is-synthesis' : ''}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {synthesis ? <span className="sc-flow-edge-badge">síntese</span> : null}
          {!synthesis && typeof label === 'string' && label.trim() ? (
            <span className="sc-flow-edge-text">{label}</span>
          ) : null}
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
