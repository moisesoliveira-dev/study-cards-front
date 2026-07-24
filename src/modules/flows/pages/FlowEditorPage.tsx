import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { IonIcon } from '@ionic/react';
import {
  addOutline,
  arrowBackOutline,
  closeOutline,
  expandOutline,
  trashOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowsFacade } from '../facades/flows.facade';
import { cardsFacade } from '../../cards/facades/cards.facade';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import type { Card } from '../../cards/types/card.types';
import type { FlowBoard } from '../types/flow.types';
import {
  CardFlowNode,
  type CardFlowNodeData,
} from '../../../shared/flow/CardFlowNode';
import { CardFlowEdge } from '../../../shared/flow/CardFlowEdge';
import {
  isSynthesisEdge,
  withEdgeFlags,
} from '../../../shared/flow/flow-edge.utils';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { useTheme } from '../../../shared/theme/ThemeContext';

const nodeTypes = { cardNode: CardFlowNode };
const edgeTypes = { smoothstep: CardFlowEdge };

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 140;
const DEFAULT_SOURCE_HANDLE = 's-right-1';
const DEFAULT_TARGET_HANDLE = 't-left-1';

function useIsCompactFlow() {
  const [compact, setCompact] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 820px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return compact;
}

function cardToNodeData(card: Card): CardFlowNodeData {
  return {
    cardId: card.id,
    front: card.front,
    back: card.back,
    tag: card.tag,
    icon: card.icon,
    status: card.status,
    linkCount: card.linkCount,
  };
}

function FlowCanvas({
  board,
  cards,
  onBoardChange,
}: {
  board: FlowBoard;
  cards: Card[];
  onBoardChange: (board: FlowBoard) => void;
}) {
  const toast = useAppToast();
  const { resolved } = useTheme();
  const compact = useIsCompactFlow();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const cardMap = useMemo(
    () => new Map(cards.map((c) => [c.id, c])),
    [cards],
  );

  const initialNodes: Node[] = useMemo(
    () =>
      board.nodes.map((n) => {
        const cardId = String(n.data?.cardId ?? '');
        const card = cardMap.get(cardId);
        const width = n.width ?? DEFAULT_NODE_WIDTH;
        const height = n.height ?? DEFAULT_NODE_HEIGHT;
        const handleOffsets =
          (n.data?.handleOffsets as CardFlowNodeData['handleOffsets']) ??
          undefined;
        const baseData = card
          ? cardToNodeData(card)
          : {
              cardId,
              front: String(n.data?.front ?? 'Card removido'),
              back: String(n.data?.back ?? ''),
              tag: String(n.data?.tag ?? '—'),
              icon: (n.data?.icon as string | null) ?? null,
              status: 'NEW' as const,
              linkCount: 0,
            };
        return {
          id: n.id,
          type: 'cardNode',
          position: n.position,
          width,
          height,
          style: { width, height },
          data: {
            ...baseData,
            handleOffsets,
          },
        };
      }),
    [board.nodes, cardMap],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      board.edges.map((e) =>
        withEdgeFlags({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? DEFAULT_SOURCE_HANDLE,
          targetHandle: e.targetHandle ?? DEFAULT_TARGET_HANDLE,
          type: e.type ?? 'smoothstep',
          label: e.label,
          data: e.data,
          animated: true,
        }),
      ),
    [board.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const usedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const n of nodes) {
      const cardId = (n.data as CardFlowNodeData | undefined)?.cardId;
      if (cardId) ids.add(cardId);
    }
    return ids;
  }, [nodes]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    requestAnimationFrame(() => fitView({ padding: compact ? 0.15 : 0.2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  useEffect(() => {
    if (!compact) setPaletteOpen(false);
  }, [compact]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  const persist = useCallback(
    async (nextNodes: Node[], nextEdges: Edge[]) => {
      setSaving(true);
      try {
        const updated = await flowsFacade.update(board.id, {
          nodes: nextNodes.map((n) => {
            const data = n.data as CardFlowNodeData;
            const width =
              n.width ??
              (typeof n.style?.width === 'number' ? n.style.width : undefined) ??
              DEFAULT_NODE_WIDTH;
            const height =
              n.height ??
              (typeof n.style?.height === 'number'
                ? n.style.height
                : undefined) ??
              DEFAULT_NODE_HEIGHT;
            return {
              id: n.id,
              type: n.type,
              position: n.position,
              width,
              height,
              data: {
                cardId: data.cardId,
                front: data.front,
                tag: data.tag,
                icon: data.icon,
                handleOffsets: data.handleOffsets,
              },
            };
          }),
          edges: nextEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: e.type,
            label: typeof e.label === 'string' ? e.label : undefined,
            data: e.data as Record<string, unknown> | undefined,
          })),
        });
        onBoardChange(updated);
      } catch (error) {
        toast.error(error);
      } finally {
        setSaving(false);
      }
    },
    [board.id, onBoardChange, toast],
  );

  const scheduleSave = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(nextNodes, nextEdges);
      }, 600);
    },
    [persist],
  );

  useEffect(() => {
    const onDirty = () => {
      window.setTimeout(() => {
        scheduleSave(nodesRef.current, edgesRef.current);
      }, 120);
    };
    window.addEventListener('sc-flow-graph-dirty', onDirty);
    return () => window.removeEventListener('sc-flow-graph-dirty', onDirty);
  }, [scheduleSave]);

  const onNodesChangeHandler = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const shouldSave = changes.some(
        (c) =>
          (c.type === 'dimensions' && c.resizing === false) ||
          (c.type === 'position' && c.dragging === false) ||
          c.type === 'remove',
      );
      if (shouldSave) {
        const next = applyNodeChanges(changes, nodes);
        scheduleSave(next, edges);
      }
    },
    [edges, nodes, onNodesChange, scheduleSave],
  );

  const onEdgesChangeHandler = useCallback(
    (changes: EdgeChange[]) => {
      const filtered = changes.filter((change) => {
        if (change.type !== 'remove') return true;
        const edge = edges.find((e) => e.id === change.id);
        return !isSynthesisEdge(edge);
      });
      if (!filtered.length) return;
      onEdgesChange(filtered);
      if (
        filtered.some(
          (c) => c.type === 'remove' || c.type === 'add' || c.type === 'replace',
        )
      ) {
        scheduleSave(nodes, applyEdgeChanges(filtered, edges));
      }
    },
    [edges, nodes, onEdgesChange, scheduleSave],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            sourceHandle: connection.sourceHandle ?? DEFAULT_SOURCE_HANDLE,
            targetHandle: connection.targetHandle ?? DEFAULT_TARGET_HANDLE,
          },
          eds,
        ).map((e) => withEdgeFlags(e));
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes, scheduleSave, setEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (isSynthesisEdge(oldEdge)) {
        if (
          newConnection.source !== oldEdge.source ||
          newConnection.target !== oldEdge.target
        ) {
          return;
        }
      }
      setEdges((eds) => {
        const next = reconnectEdge(oldEdge, newConnection, eds).map((e) =>
          e.id === oldEdge.id
            ? withEdgeFlags({
                ...e,
                label: oldEdge.label,
                data: oldEdge.data,
              })
            : e,
        );
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes, scheduleSave, setEdges],
  );

  const onBeforeDelete = useCallback(
    async ({ nodes: n, edges: e }: { nodes: Node[]; edges: Edge[] }) => ({
      nodes: n,
      edges: e.filter((edge) => !isSynthesisEdge(edge)),
    }),
    [],
  );

  const onNodeDragStop = useCallback(() => {
    scheduleSave(nodes, edges);
  }, [edges, nodes, scheduleSave]);

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelected(params.nodes.map((n) => n.id));
  }, []);

  const addCard = useCallback(
    (card: Card, position?: { x: number; y: number }) => {
      if (usedIds.has(card.id)) {
        toast.error(new Error('Este card já está no fluxograma'));
        return;
      }
      const id = `card-${card.id}`;
      const pos =
        position ??
        screenToFlowPosition({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * (compact ? 0.42 : 0.35),
        });
      const node: Node = {
        id,
        type: 'cardNode',
        position: pos,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
        data: cardToNodeData(card),
      };

      const linkEdges: Edge[] = [];
      for (const sourceId of card.sourceIds) {
        const sourceNodeId = `card-${sourceId}`;
        if (nodes.some((n) => n.id === sourceNodeId)) {
          linkEdges.push(
            withEdgeFlags({
              id: `link-${sourceId}-${card.id}`,
              source: sourceNodeId,
              target: id,
              sourceHandle: DEFAULT_SOURCE_HANDLE,
              targetHandle: DEFAULT_TARGET_HANDLE,
              type: 'smoothstep',
              animated: true,
              label: 'síntese',
              data: { kind: 'synthesis' },
            }),
          );
        }
      }

      const nextNodes = [...nodes, node];
      const nextEdges = [...edges, ...linkEdges];
      setNodes(nextNodes);
      setEdges(nextEdges);
      scheduleSave(nextNodes, nextEdges);
      if (compact) setPaletteOpen(false);
    },
    [
      compact,
      edges,
      nodes,
      scheduleSave,
      screenToFlowPosition,
      setEdges,
      setNodes,
      toast,
      usedIds,
    ],
  );

  const removeSelected = useCallback(() => {
    if (!selected.length) return;
    const nextNodes = nodes.filter((n) => !selected.includes(n.id));
    const nextEdges = edges.filter(
      (e) => !selected.includes(e.source) && !selected.includes(e.target),
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
    scheduleSave(nextNodes, nextEdges);
  }, [edges, nodes, scheduleSave, selected, setEdges, setNodes]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (usedIds.has(c.id)) return false;
      if (!q) return true;
      return (
        c.front.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q)
      );
    });
  }, [cards, query, usedIds]);

  const onDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.setData('application/sc-card', card.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('application/sc-card');
    const card = cardMap.get(cardId);
    if (!card) return;
    addCard(
      card,
      screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      }),
    );
  };

  const palette = (
    <>
      <div className="sc-flow-palette-head">
        <div>
          <strong>Cards do grupo</strong>
          <span>{available.length} disponíveis</span>
        </div>
        {compact ? (
          <button
            type="button"
            className="sc-flow-palette-close"
            aria-label="Fechar"
            onClick={() => setPaletteOpen(false)}
          >
            <IonIcon icon={closeOutline} />
          </button>
        ) : null}
      </div>
      <input
        className="sc-search sc-flow-palette-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar card…"
        aria-label="Buscar card"
      />
      <div className="sc-flow-palette-list">
        {available.map((card) => (
          <button
            key={card.id}
            type="button"
            className="sc-flow-palette-item"
            draggable={!compact}
            onDragStart={(e) => onDragStart(e, card)}
            onClick={() => addCard(card)}
          >
            <span className="sc-flow-palette-tag">{card.tag}</span>
            <span className="sc-flow-palette-title">{card.front}</span>
          </button>
        ))}
        {!available.length ? (
          <p className="sc-flow-palette-empty">
            Todos os cards já estão no canvas, ou nenhum bate com a busca.
          </p>
        ) : null}
      </div>
      {compact ? (
        <p className="sc-flow-palette-hint">Toque num card para colocá-lo no mapa</p>
      ) : (
        <p className="sc-flow-palette-hint">Arraste ou clique para adicionar</p>
      )}
    </>
  );

  return (
    <div
      className={`sc-flow-workspace${compact ? ' is-compact' : ''}${paletteOpen ? ' is-palette-open' : ''}`}
    >
      {!compact ? <aside className="sc-flow-palette">{palette}</aside> : null}

      {compact ? (
        <>
          <button
            type="button"
            className="sc-flow-palette-backdrop"
            aria-label="Fechar cards"
            tabIndex={paletteOpen ? 0 : -1}
            onClick={() => setPaletteOpen(false)}
          />
          <aside
            className="sc-flow-palette sc-flow-palette-sheet"
            aria-hidden={!paletteOpen}
          >
            <div className="sc-flow-palette-grab" aria-hidden />
            {palette}
          </aside>
        </>
      ) : null}

      <div
        className="sc-flow-canvas"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={onDrop}
      >
        <div className="sc-flow-toolbar">
          <span className="sc-flow-save">
            {saving ? 'Salvando…' : 'Salvo'}
          </span>
          <div className="sc-flow-toolbar-actions">
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              disabled={!selected.length}
              onClick={removeSelected}
              aria-label="Remover seleção"
              title="Remover seleção"
            >
              <IonIcon icon={trashOutline} />
              {!compact ? <span>Remover</span> : null}
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              onClick={() => fitView({ padding: compact ? 0.15 : 0.2 })}
              aria-label="Enquadrar"
              title="Enquadrar"
            >
              <IonIcon icon={expandOutline} />
              {!compact ? <span>Enquadrar</span> : null}
            </button>
            {compact ? (
              <button
                type="button"
                className="sc-btn primary sc-flow-tool-btn"
                onClick={() => setPaletteOpen(true)}
                aria-label="Adicionar card"
              >
                <IonIcon icon={addOutline} />
                <span>Cards</span>
              </button>
            ) : null}
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChangeHandler}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onBeforeDelete={onBeforeDelete}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          fitView
          colorMode={resolved}
          deleteKeyCode={compact ? null : ['Backspace', 'Delete']}
          edgesReconnectable
          panOnScroll={!compact}
          zoomOnPinch
          panOnDrag
          selectionOnDrag={!compact}
          minZoom={0.25}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={compact ? 16 : 18}
            size={1}
            color="var(--border)"
          />
          <Controls showInteractive={!compact} position="bottom-left" />
          {!compact ? (
            <MiniMap pannable zoomable nodeColor={() => 'var(--text-accent)'} />
          ) : null}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function FlowEditorPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const history = useHistory();
  const toast = useAppToast();
  const [board, setBoard] = useState<FlowBoard | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const b = await flowsFacade.get(flowId);
        if (cancelled) return;
        setBoard(b);

        const [cardResult, subjectResult] = await Promise.allSettled([
          cardsFacade.listAllBySubject(b.subjectId),
          subjectsFacade.get(b.subjectId),
        ]);
        if (cancelled) return;

        if (cardResult.status === 'fulfilled') {
          setCards(cardResult.value);
        } else {
          setCards([]);
          toast.error(cardResult.reason);
        }

        if (subjectResult.status === 'fulfilled') {
          setSubjectName(subjectResult.value.name);
        }
      } catch (error) {
        toast.error(error);
        history.replace('/flows');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              aria-label="Voltar aos fluxos"
              onClick={() => history.push('/flows')}
            >
              <IonIcon slot="icon-only" icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            {board?.name ?? 'Fluxograma'}
            {subjectName ? (
              <span className="sc-flow-editor-sub"> · {subjectName}</span>
            ) : null}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} className="sc-flow-page">
        {loading || !board ? (
          <div className="sc-empty">
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <ReactFlowProvider>
            <FlowCanvas
              board={board}
              cards={cards}
              onBoardChange={setBoard}
            />
          </ReactFlowProvider>
        )}
      </IonContent>
    </IonPage>
  );
}
