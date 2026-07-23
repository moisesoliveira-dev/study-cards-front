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
import { useHistory, useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
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
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { useTheme } from '../../../shared/theme/ThemeContext';

const nodeTypes = { cardNode: CardFlowNode };

function cardToNodeData(card: Card): CardFlowNodeData {
  return {
    cardId: card.id,
    front: card.front,
    back: card.back,
    tag: card.tag,
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
        return {
          id: n.id,
          type: 'cardNode',
          position: n.position,
          data: card
            ? cardToNodeData(card)
            : {
                cardId,
                front: String(n.data?.front ?? 'Card removido'),
                back: String(n.data?.back ?? ''),
                tag: String(n.data?.tag ?? '—'),
                status: 'NEW',
                linkCount: 0,
              },
        };
      }),
    [board.nodes, cardMap],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      board.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        type: e.type ?? 'smoothstep',
        animated: true,
      })),
    [board.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    requestAnimationFrame(() => fitView({ padding: 0.2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  const persist = useCallback(
    async (nextNodes: Node[], nextEdges: Edge[]) => {
      setSaving(true);
      try {
        const updated = await flowsFacade.update(board.id, {
          nodes: nextNodes.map((n) => {
            const data = n.data as CardFlowNodeData;
            return {
              id: n.id,
              type: n.type,
              position: n.position,
              data: {
                cardId: data.cardId,
                front: data.front,
                tag: data.tag,
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

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          { ...connection, type: 'smoothstep', animated: true },
          eds,
        );
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes, scheduleSave, setEdges],
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
          x: window.innerWidth * 0.45,
          y: window.innerHeight * 0.35,
        });
      const node: Node = {
        id,
        type: 'cardNode',
        position: pos,
        data: cardToNodeData(card),
      };

      const linkEdges: Edge[] = [];
      for (const sourceId of card.sourceIds) {
        const sourceNodeId = `card-${sourceId}`;
        if (nodes.some((n) => n.id === sourceNodeId)) {
          linkEdges.push({
            id: `link-${sourceId}-${card.id}`,
            source: sourceNodeId,
            target: id,
            type: 'smoothstep',
            animated: true,
            label: 'síntese',
          });
        }
      }

      const nextNodes = [...nodes, node];
      const nextEdges = [...edges, ...linkEdges];
      setNodes(nextNodes);
      setEdges(nextEdges);
      scheduleSave(nextNodes, nextEdges);
    },
    [
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

  return (
    <div className="sc-flow-workspace">
      <aside className="sc-flow-palette">
        <div className="sc-flow-palette-head">
          <strong>Cards do grupo</strong>
          <span>{available.length} disponíveis</span>
        </div>
        <input
          className="sc-search"
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
              draggable
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
      </aside>

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
          <button
            type="button"
            className="sc-btn"
            disabled={!selected.length}
            onClick={removeSelected}
          >
            Remover seleção
          </button>
          <button
            type="button"
            className="sc-btn"
            onClick={() => fitView({ padding: 0.2 })}
          >
            Enquadrar
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          colorMode={resolved}
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color="var(--border)"
          />
          <Controls />
          <MiniMap pannable zoomable nodeColor={() => 'var(--text-accent)'} />
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
            <IonButton onClick={() => history.push('/flows')}>
              ← Fluxos
            </IonButton>
          </IonButtons>
          <IonTitle>
            {board?.name ?? 'Fluxograma'}
            {subjectName ? ` · ${subjectName}` : ''}
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
