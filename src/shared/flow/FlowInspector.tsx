import { IonIcon } from '@ionic/react';
import { closeOutline, optionsOutline } from 'ionicons/icons';
import type { Edge, Node } from '@xyflow/react';
import type { CardFlowNodeData } from './CardFlowNode';
import {
  getEdgeData,
  isSynthesisEdge,
  type FlowEdgeData,
  type FlowEdgePathType,
} from './flow-edge.utils';

export type FlowCanvasSettings = {
  snapToGrid: boolean;
  showMiniMap: boolean;
  showGrid: boolean;
  defaultSvgAnimate: boolean;
  dragTree: boolean;
  nodeCollisions: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compact?: boolean;
  selectedNodes: Node[];
  selectedEdges: Edge[];
  allNodes?: Node[];
  settings: FlowCanvasSettings;
  onSettingsChange: (next: FlowCanvasSettings) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<Edge> & { data?: FlowEdgeData }) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  onUpdateNodeData?: (nodeId: string, patch: Record<string, unknown>) => void;
  onEditCard?: (cardId: string) => void;
  onCreateCard?: () => void;
};

const PATH_OPTIONS: { value: FlowEdgePathType; label: string }[] = [
  { value: 'smoothstep', label: 'Suave' },
  { value: 'bezier', label: 'Curva' },
  { value: 'step', label: 'Degrau' },
  { value: 'straight', label: 'Reta' },
];

const COLOR_PRESETS = [
  'var(--border-accent)',
  '#7F77DD',
  '#1D9E75',
  '#378ADD',
  '#BA7517',
  '#D4537E',
  '#5F6368',
];

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="sc-flow-inspector-toggle">
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function FlowInspector({
  open,
  onOpenChange,
  compact,
  selectedNodes,
  selectedEdges,
  allNodes = [],
  settings,
  onSettingsChange,
  onUpdateEdge,
  onDeleteEdge,
  onDeleteNodes,
  onUpdateNodeData,
  onEditCard,
  onCreateCard,
}: Props) {
  const edge = selectedEdges.length === 1 ? selectedEdges[0] : null;
  const node = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const multiNodes = selectedNodes.length > 1;
  const edgeData = edge ? getEdgeData(edge) : null;
  const synthesis = edge ? isSynthesisEdge(edge) : false;
  const isGroup = node?.type === 'groupNode';
  const groupLabel = isGroup
    ? String((node.data as { label?: string })?.label ?? 'Subfluxo')
    : '';
  const nodeData =
    node && !isGroup ? (node.data as CardFlowNodeData) : null;

  const body = (
    <>
      <div className="sc-flow-inspector-head">
        <div>
          <IonIcon icon={optionsOutline} />
          <strong>Formatar</strong>
        </div>
        {compact ? (
          <button
            type="button"
            className="sc-flow-inspector-close"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <IonIcon icon={closeOutline} />
          </button>
        ) : null}
      </div>

      <div className="sc-flow-inspector-body">
        {edge && edgeData ? (
          <section className="sc-flow-inspector-section">
            <h3>Conexão</h3>
            {synthesis ? (
              <p className="sc-flow-inspector-note">
                Ligação de síntese — só reposiciona; não remove.
              </p>
            ) : null}

            <label className="sc-flow-inspector-field">
              <span>Formato da linha</span>
              <select
                value={edgeData.pathType ?? 'smoothstep'}
                onChange={(e) =>
                  onUpdateEdge(edge.id, {
                    data: {
                      ...edgeData,
                      pathType: e.target.value as FlowEdgePathType,
                    },
                  })
                }
              >
                {PATH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="sc-flow-inspector-field">
              <span>Espessura</span>
              <input
                type="range"
                min={1}
                max={6}
                step={0.5}
                value={edgeData.strokeWidth ?? 2}
                onChange={(e) =>
                  onUpdateEdge(edge.id, {
                    data: {
                      ...edgeData,
                      strokeWidth: Number(e.target.value),
                    },
                  })
                }
              />
            </label>

            <div className="sc-flow-inspector-field">
              <span>Cor</span>
              <div className="sc-flow-inspector-swatches">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`sc-flow-inspector-swatch${(edgeData.strokeColor ?? 'var(--border-accent)') === c ? ' is-active' : ''}`}
                    style={{ background: c }}
                    aria-label={`Cor ${c}`}
                    onClick={() =>
                      onUpdateEdge(edge.id, {
                        data: { ...edgeData, strokeColor: c },
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <Toggle
              label="Animating SVG"
              hint="Partícula percorrendo a linha"
              checked={edgeData.svgAnimate ?? true}
              onChange={(v) =>
                onUpdateEdge(edge.id, {
                  data: { ...edgeData, svgAnimate: v },
                })
              }
            />

            <Toggle
              label="Tracejada"
              checked={Boolean(edgeData.dashed)}
              onChange={(v) =>
                onUpdateEdge(edge.id, {
                  data: { ...edgeData, dashed: v },
                })
              }
            />

            {!synthesis ? (
              <label className="sc-flow-inspector-field">
                <span>Rótulo</span>
                <input
                  type="text"
                  value={typeof edge.label === 'string' ? edge.label : ''}
                  placeholder="Opcional"
                  onChange={(e) =>
                    onUpdateEdge(edge.id, { label: e.target.value })
                  }
                />
              </label>
            ) : null}

            {!synthesis ? (
              <button
                type="button"
                className="sc-btn sc-flow-inspector-danger"
                onClick={() => onDeleteEdge(edge.id)}
              >
                Remover conexão
              </button>
            ) : null}
          </section>
        ) : null}

        {node && isGroup ? (
          <section className="sc-flow-inspector-section">
            <h3>Subfluxo</h3>
            <label className="sc-flow-inspector-field">
              <span>Nome</span>
              <input
                type="text"
                value={groupLabel}
                placeholder="Subfluxo"
                onChange={(e) =>
                  onUpdateNodeData?.(node.id, {
                    label: e.target.value,
                  })
                }
                onBlur={(e) =>
                  onUpdateNodeData?.(node.id, {
                    label: e.target.value.trim() || 'Subfluxo',
                  })
                }
              />
            </label>
            <p className="sc-flow-inspector-note">
              Duplo clique no título do subfluxo também renomeia. Arraste cards
              para fora para removê-los do grupo — o subfluxo continua existindo.
            </p>
            <button
              type="button"
              className="sc-btn sc-flow-inspector-danger"
              onClick={() => onDeleteNodes([node.id])}
            >
              Remover subfluxo (manter cards)
            </button>
          </section>
        ) : null}

        {node && nodeData ? (
          <section className="sc-flow-inspector-section">
            <h3>Nó</h3>
            <div className="sc-flow-inspector-card">
              <span className="sc-flow-inspector-card-tag">{nodeData.tag}</span>
              <strong>{nodeData.front}</strong>
              <p>{nodeData.back}</p>
            </div>
            {onEditCard ? (
              <button
                type="button"
                className="sc-btn primary"
                onClick={() => onEditCard(nodeData.cardId)}
              >
                Editar carta / documento
              </button>
            ) : null}

            {onUpdateNodeData ? (
              <>
                <h3>Validação</h3>
                <Toggle
                  label="Bloquear entradas"
                  hint="Nenhum nó pode conectar neste"
                  checked={Boolean(nodeData.blockIncoming)}
                  onChange={(v) =>
                    onUpdateNodeData(node.id, { blockIncoming: v })
                  }
                />
                {(nodeData.blockedSourceIds?.length ?? 0) > 0 ? (
                  <div className="sc-flow-inspector-blocked">
                    <span className="sc-flow-inspector-field">
                      Fontes bloqueadas
                    </span>
                    {nodeData.blockedSourceIds!.map((sourceId) => {
                      const source = allNodes.find((n) => n.id === sourceId);
                      const label =
                        (source?.data as CardFlowNodeData | undefined)?.front ??
                        sourceId;
                      return (
                        <button
                          key={sourceId}
                          type="button"
                          className="sc-flow-inspector-blocked-item"
                          onClick={() =>
                            onUpdateNodeData(node.id, {
                              blockedSourceIds: (
                                nodeData.blockedSourceIds ?? []
                              ).filter((id) => id !== sourceId),
                            })
                          }
                          title="Desbloquear"
                        >
                          <span>{label}</span>
                          <span aria-hidden>×</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="sc-flow-inspector-note">
                    Selecione outro nó e use o menu do botão direito → “Bloquear
                    receber de…” — ou selecione 2 nós.
                  </p>
                )}
              </>
            ) : null}

            <p className="sc-flow-inspector-note">
              Duplo clique no nó também abre a carta. Alt+arrastar um ponto de
              conexão para mover no corpo do nó.
            </p>
            <button
              type="button"
              className="sc-btn sc-flow-inspector-danger"
              onClick={() => onDeleteNodes([node.id])}
            >
              Remover do fluxograma
            </button>
          </section>
        ) : null}

        {multiNodes && onUpdateNodeData ? (
          <section className="sc-flow-inspector-section">
            <h3>Seleção · validação</h3>
            <p className="sc-flow-inspector-note">
              {selectedNodes.length} itens selecionados. Escolha quem bloqueia
              quem:
            </p>
            {selectedNodes.length === 2 &&
            selectedNodes.every((n) => n.type !== 'groupNode') ? (
              <>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => {
                    const [a, b] = selectedNodes;
                    const data = b.data as CardFlowNodeData;
                    const set = new Set(data.blockedSourceIds ?? []);
                    set.add(a.id);
                    onUpdateNodeData(b.id, { blockedSourceIds: [...set] });
                  }}
                >
                  Bloquear “{(selectedNodes[1].data as CardFlowNodeData).front}”
                  de receber “
                  {(selectedNodes[0].data as CardFlowNodeData).front}”
                </button>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => {
                    const [a, b] = selectedNodes;
                    const data = a.data as CardFlowNodeData;
                    const set = new Set(data.blockedSourceIds ?? []);
                    set.add(b.id);
                    onUpdateNodeData(a.id, { blockedSourceIds: [...set] });
                  }}
                >
                  Bloquear “{(selectedNodes[0].data as CardFlowNodeData).front}”
                  de receber “
                  {(selectedNodes[1].data as CardFlowNodeData).front}”
                </button>
              </>
            ) : (
              <p className="sc-flow-inspector-note">
                Selecione exatamente 2 cards (não subfluxos) para bloquear um de
                receber o outro.
              </p>
            )}
            <button
              type="button"
              className="sc-btn sc-flow-inspector-danger"
              onClick={() => onDeleteNodes(selectedNodes.map((n) => n.id))}
            >
              Remover seleção
            </button>
          </section>
        ) : null}

        {multiNodes && !onUpdateNodeData ? (
          <section className="sc-flow-inspector-section">
            <h3>Seleção</h3>
            <p className="sc-flow-inspector-note">
              {selectedNodes.length} nós selecionados
            </p>
            <button
              type="button"
              className="sc-btn sc-flow-inspector-danger"
              onClick={() => onDeleteNodes(selectedNodes.map((n) => n.id))}
            >
              Remover seleção
            </button>
          </section>
        ) : null}

        {!edge && !node && !multiNodes ? (
          <section className="sc-flow-inspector-section">
            <h3>Diagrama</h3>
            <p className="sc-flow-inspector-note">
              Selecione um nó, um subfluxo ou uma conexão para editar — ou crie
              uma carta nova para o grupo.
            </p>
            {onCreateCard ? (
              <button
                type="button"
                className="sc-btn primary"
                onClick={onCreateCard}
              >
                Nova carta
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="sc-flow-inspector-section">
          <h3>Canvas</h3>
          <Toggle
            label="Grade"
            checked={settings.showGrid}
            onChange={(v) => onSettingsChange({ ...settings, showGrid: v })}
          />
          <Toggle
            label="Encaixar na grade"
            checked={settings.snapToGrid}
            onChange={(v) => onSettingsChange({ ...settings, snapToGrid: v })}
          />
          {!compact ? (
            <Toggle
              label="Mini mapa"
              checked={settings.showMiniMap}
              onChange={(v) =>
                onSettingsChange({ ...settings, showMiniMap: v })
              }
            />
          ) : null}
          <Toggle
            label="SVG animado (novas linhas)"
            hint="Padrão ao criar conexões"
            checked={settings.defaultSvgAnimate}
            onChange={(v) =>
              onSettingsChange({ ...settings, defaultSvgAnimate: v })
            }
          />
          <Toggle
            label="Drag Tree"
            hint="Ao arrastar um nó, move os descendentes ligados"
            checked={settings.dragTree}
            onChange={(v) =>
              onSettingsChange({ ...settings, dragTree: v })
            }
          />
          <Toggle
            label="Node Collisions"
            hint="Afasta nós sobrepostos com animação suave"
            checked={settings.nodeCollisions}
            onChange={(v) =>
              onSettingsChange({ ...settings, nodeCollisions: v })
            }
          />
        </section>
      </div>
    </>
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          className={`sc-flow-inspector-fab${open ? ' is-open' : ''}`}
          aria-label="Formatar"
          title="Formatar"
          onClick={() => onOpenChange(!open)}
        >
          <IonIcon icon={optionsOutline} />
        </button>
        {open ? (
          <>
            <button
              type="button"
              className="sc-flow-inspector-backdrop"
              aria-label="Fechar painel"
              onClick={() => onOpenChange(false)}
            />
            <aside className="sc-flow-inspector sc-flow-inspector-sheet">
              {body}
            </aside>
          </>
        ) : null}
      </>
    );
  }

  return <aside className="sc-flow-inspector">{body}</aside>;
}
