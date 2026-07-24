import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';

export type SubFlowGroupData = {
  label: string;
  dragTree?: boolean;
  nodeCollisions?: boolean;
};

function SubFlowGroupNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as SubFlowGroupData;
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.label || 'Subfluxo');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(d.label || 'Subfluxo');
  }, [d.label, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = useCallback(() => {
    const next = draft.trim() || 'Subfluxo';
    setEditing(false);
    if (next === (d.label || 'Subfluxo')) return;
    updateNodeData(id, { label: next });
    window.dispatchEvent(new Event('sc-flow-graph-dirty'));
  }, [d.label, draft, id, updateNodeData]);

  return (
    <div className={`sc-flow-group-node${selected ? ' is-selected' : ''}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={160}
        lineClassName="sc-flow-resize-line"
        handleClassName="sc-flow-resize-handle"
      />
      {editing ? (
        <input
          ref={inputRef}
          className="sc-flow-group-label-input"
          value={draft}
          aria-label="Nome do subfluxo"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(d.label || 'Subfluxo');
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          type="button"
          className="sc-flow-group-label"
          title="Duplo clique para renomear"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {d.label || 'Subfluxo'}
        </button>
      )}
    </div>
  );
}

export const SubFlowGroupNode = memo(SubFlowGroupNodeComponent);
