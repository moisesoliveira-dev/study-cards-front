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
import { ContextMenu, useContextMenu } from '../../../shared/components/ContextMenu';
import type { ContextMenuItem } from '../../../shared/components/ContextMenu';
import {
  addOutline,
  arrowBackOutline,
  closeOutline,
  createOutline,
  documentTextOutline,
  expandOutline,
  gridOutline,
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
  FlowInspector,
  type FlowCanvasSettings,
} from '../../../shared/flow/FlowInspector';
import {
  getEdgeData,
  isSynthesisEdge,
  withEdgeFlags,
  type FlowEdgeData,
} from '../../../shared/flow/flow-edge.utils';
import {
  isValidFlowConnection,
  withBlockedSource,
} from '../../../shared/flow/flow-connection.utils';
import { FaceCardComposer } from '../../../shared/components/FaceCardComposer';
import { CardDocumentSheet } from '../../../shared/components/CardDocumentSheet';
import { documentToPlainText } from '../../../shared/components/DocumentEditor';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { useTheme } from '../../../shared/theme/ThemeContext';

const nodeTypes = { cardNode: CardFlowNode };
const edgeTypes = { flowEdge: CardFlowEdge };

const DEFAULT_SOURCE_HANDLE = 's-right-1';
const DEFAULT_TARGET_HANDLE = 't-left-1';

const DEFAULT_SETTINGS: FlowCanvasSettings = {
  snapToGrid: false,
  showMiniMap: true,
  showGrid: true,
  defaultSvgAnimate: true,
};

function loadSettings(flowId: string): FlowCanvasSettings {
  try {
    const raw = localStorage.getItem(`sc-flow-settings:${flowId}`);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as FlowCanvasSettings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

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
  onCardsChange,
}: {
  board: FlowBoard;
  cards: Card[];
  onBoardChange: (board: FlowBoard) => void;
  onCardsChange: (cards: Card[]) => void;
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
        const handleOffsets =
          (n.data?.handleOffsets as CardFlowNodeData['handleOffsets']) ??
          undefined;
        const blockIncoming = Boolean(n.data?.blockIncoming);
        const blockedSourceIds = Array.isArray(n.data?.blockedSourceIds)
          ? (n.data.blockedSourceIds as string[])
          : undefined;
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
          data: {
            ...baseData,
            handleOffsets,
            blockIncoming,
            blockedSourceIds,
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
          type: 'flowEdge',
          label: e.label,
          data: e.data,
          animated: false,
        }),
      ),
    [board.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [settings, setSettings] = useState<FlowCanvasSettings>(() =>
    loadSettings(board.id),
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSaving, setComposerSaving] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [docJson, setDocJson] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [hint, setHint] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [detail, setDetail] = useState<Card | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu();

  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedNodeIds.includes(n.id)),
    [nodes, selectedNodeIds],
  );
  const selectedEdges = useMemo(
    () => edges.filter((e) => selectedEdgeIds.includes(e.id)),
    [edges, selectedEdgeIds],
  );

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
    setSettings(loadSettings(board.id));
    requestAnimationFrame(() => fitView({ padding: compact ? 0.15 : 0.2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  useEffect(() => {
    if (!compact) setPaletteOpen(false);
  }, [compact]);

  useEffect(() => {
    localStorage.setItem(
      `sc-flow-settings:${board.id}`,
      JSON.stringify(settings),
    );
  }, [board.id, settings]);

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
            return {
              id: n.id,
              type: n.type,
              position: n.position,
              data: {
                cardId: data.cardId,
                front: data.front,
                tag: data.tag,
                icon: data.icon,
                handleOffsets: data.handleOffsets,
                blockIncoming: data.blockIncoming,
                blockedSourceIds: data.blockedSourceIds,
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
          (c.type === 'position' && c.dragging === false) || c.type === 'remove',
      );
      if (shouldSave) {
        scheduleSave(applyNodeChanges(changes, nodes), edges);
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
      if (!isValidFlowConnection(nodes, connection)) {
        toast.error(new Error('Conexão bloqueada pela validação deste nó'));
        return;
      }
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            type: 'flowEdge',
            animated: false,
            sourceHandle: connection.sourceHandle ?? DEFAULT_SOURCE_HANDLE,
            targetHandle: connection.targetHandle ?? DEFAULT_TARGET_HANDLE,
            data: {
              svgAnimate: settings.defaultSvgAnimate,
              pathType: 'smoothstep',
              dashed: false,
            } satisfies FlowEdgeData,
          },
          eds,
        ).map((e) => withEdgeFlags(e));
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes, scheduleSave, setEdges, settings.defaultSvgAnimate, toast],
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
      if (!isValidFlowConnection(nodes, newConnection)) {
        toast.error(new Error('Conexão bloqueada pela validação deste nó'));
        return;
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
    [nodes, scheduleSave, setEdges, toast],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => isValidFlowConnection(nodes, connection),
    [nodes],
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
    setSelectedNodeIds(params.nodes.map((n) => n.id));
    setSelectedEdgeIds(params.edges.map((e) => e.id));
    if (compact && (params.nodes.length || params.edges.length)) {
      setInspectorOpen(true);
    }
  }, [compact]);

  const updateEdge = useCallback(
    (edgeId: string, patch: Partial<Edge> & { data?: FlowEdgeData }) => {
      setEdges((eds) => {
        const next = eds.map((e) => {
          if (e.id !== edgeId) return e;
          const merged = withEdgeFlags({
            ...e,
            ...patch,
            data: {
              ...getEdgeData(e),
              ...(patch.data ?? {}),
            },
            label: patch.label !== undefined ? patch.label : e.label,
          });
          return merged;
        });
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes, scheduleSave, setEdges],
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<CardFlowNodeData>) => {
      setNodes((ns) => {
        const next = ns.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: {
              ...(n.data as CardFlowNodeData),
              ...patch,
            },
          };
        });
        scheduleSave(next, edgesRef.current);
        return next;
      });
    },
    [scheduleSave, setNodes],
  );

  const deleteEdgeById = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge || isSynthesisEdge(edge)) return;
      const next = edges.filter((e) => e.id !== edgeId);
      setEdges(next);
      setSelectedEdgeIds((ids) => ids.filter((id) => id !== edgeId));
      scheduleSave(nodes, next);
    },
    [edges, nodes, scheduleSave, setEdges],
  );

  const deleteNodesByIds = useCallback(
    (nodeIds: string[]) => {
      if (!nodeIds.length) return;
      const idSet = new Set(nodeIds);
      const nextNodes = nodes.filter((n) => !idSet.has(n.id));
      const nextEdges = edges.filter(
        (e) => !idSet.has(e.source) && !idSet.has(e.target),
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      scheduleSave(nextNodes, nextEdges);
    },
    [edges, nodes, scheduleSave, setEdges, setNodes],
  );

  const syncCardIntoGraph = useCallback(
    (card: Card) => {
      setNodes((ns) => {
        const next = ns.map((n) => {
          const data = n.data as CardFlowNodeData;
          if (data.cardId !== card.id) return n;
          return {
            ...n,
            data: {
              ...cardToNodeData(card),
              handleOffsets: data.handleOffsets,
              blockIncoming: data.blockIncoming,
              blockedSourceIds: data.blockedSourceIds,
            },
          };
        });
        scheduleSave(next, edgesRef.current);
        return next;
      });
    },
    [scheduleSave, setNodes],
  );

  const openCardEditor = useCallback(
    (cardId: string) => {
      const card = cardMap.get(cardId);
      if (!card) {
        void cardsFacade
          .get(cardId)
          .then((fetched) => {
            onCardsChange([...cards.filter((c) => c.id !== fetched.id), fetched]);
            setDetail(fetched);
          })
          .catch((error) => toast.error(error));
        return;
      }
      setDetail(card);
      if (compact) setInspectorOpen(false);
    },
    [cardMap, cards, compact, onCardsChange, toast],
  );

  const openComposer = useCallback(() => {
    setFront('');
    setBack('');
    setDocJson('');
    setTag('Conceito');
    setHint('');
    setIcon(null);
    setComposerOpen(true);
    if (compact) {
      setPaletteOpen(false);
      setInspectorOpen(false);
    }
  }, [compact]);

  const handleCardChanged = useCallback(
    (updated: Card) => {
      setDetail(updated);
      onCardsChange(cards.map((c) => (c.id === updated.id ? updated : c)));
      syncCardIntoGraph(updated);
    },
    [cards, onCardsChange, syncCardIntoGraph],
  );

  const handleCardDelete = useCallback(
    async (id: string) => {
      try {
        await cardsFacade.remove(id);
        onCardsChange(cards.filter((c) => c.id !== id));
        deleteNodesByIds([`card-${id}`]);
        setDetail(null);
        toast.success('Carta excluída');
      } catch (error) {
        toast.error(error);
      }
    },
    [cards, deleteNodesByIds, onCardsChange, toast],
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const cardId = (node.data as CardFlowNodeData | undefined)?.cardId;
      if (cardId) openCardEditor(cardId);
    },
    [openCardEditor],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const data = node.data as CardFlowNodeData;
      const otherSelected = selectedNodeIds.filter((id) => id !== node.id);
      const items: ContextMenuItem[] = [
        {
          id: 'edit',
          label: 'Editar carta / documento',
          icon: documentTextOutline,
          onSelect: () => openCardEditor(data.cardId),
        },
        {
          id: 'focus',
          label: 'Enquadrar nó',
          icon: expandOutline,
          onSelect: () =>
            fitView({
              nodes: [{ id: node.id }],
              padding: 0.4,
              duration: 280,
            }),
        },
        {
          id: 'block-in',
          label: data.blockIncoming
            ? 'Permitir entradas'
            : 'Bloquear entradas',
          separator: true,
          onSelect: () =>
            updateNodeData(node.id, { blockIncoming: !data.blockIncoming }),
        },
      ];

      if (otherSelected.length === 1) {
        const sourceId = otherSelected[0];
        const source = nodes.find((n) => n.id === sourceId);
        const sourceName =
          (source?.data as CardFlowNodeData | undefined)?.front ?? 'nó selecionado';
        const alreadyBlocked = data.blockedSourceIds?.includes(sourceId);
        items.push({
          id: 'block-from-selected',
          label: alreadyBlocked
            ? `Desbloquear receber de “${sourceName}”`
            : `Bloquear receber de “${sourceName}”`,
          onSelect: () =>
            updateNodeData(
              node.id,
              withBlockedSource(data, sourceId, !alreadyBlocked),
            ),
        });
      }

      items.push({
        id: 'remove',
        label: 'Remover do fluxograma',
        icon: trashOutline,
        danger: true,
        separator: true,
        onSelect: () => deleteNodesByIds([node.id]),
      });

      setSelectedNodeIds([node.id, ...otherSelected]);
      setSelectedEdgeIds([]);
      openCtx(event, items, data.front || 'Nó');
    },
    [
      deleteNodesByIds,
      fitView,
      nodes,
      openCardEditor,
      openCtx,
      selectedNodeIds,
      updateNodeData,
    ],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const data = getEdgeData(edge);
      const synthesis = isSynthesisEdge(edge);
      const items: ContextMenuItem[] = [
        {
          id: 'animate',
          label: data.svgAnimate === false ? 'Ativar Animating SVG' : 'Desativar Animating SVG',
          onSelect: () =>
            updateEdge(edge.id, {
              data: { ...data, svgAnimate: !(data.svgAnimate ?? true) },
            }),
        },
        {
          id: 'dash',
          label: data.dashed ? 'Linha contínua' : 'Linha tracejada',
          onSelect: () =>
            updateEdge(edge.id, {
              data: { ...data, dashed: !data.dashed },
            }),
        },
        {
          id: 'smooth',
          label: 'Formato: suave',
          separator: true,
          onSelect: () =>
            updateEdge(edge.id, {
              data: { ...data, pathType: 'smoothstep' },
            }),
        },
        {
          id: 'bezier',
          label: 'Formato: curva',
          onSelect: () =>
            updateEdge(edge.id, {
              data: { ...data, pathType: 'bezier' },
            }),
        },
        {
          id: 'step',
          label: 'Formato: degrau',
          onSelect: () =>
            updateEdge(edge.id, {
              data: { ...data, pathType: 'step' },
            }),
        },
        {
          id: 'straight',
          label: 'Formato: reta',
          onSelect: () =>
            updateEdge(edge.id, {
              data: { ...data, pathType: 'straight' },
            }),
        },
      ];
      if (!synthesis) {
        items.push({
          id: 'delete',
          label: 'Remover conexão',
          icon: trashOutline,
          danger: true,
          separator: true,
          onSelect: () => deleteEdgeById(edge.id),
        });
      }
      setSelectedEdgeIds([edge.id]);
      setSelectedNodeIds([]);
      openCtx(event, items, synthesis ? 'Conexão · síntese' : 'Conexão');
    },
    [deleteEdgeById, openCtx, updateEdge],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      const items: ContextMenuItem[] = [
        {
          id: 'new-card',
          label: 'Nova carta',
          icon: createOutline,
          onSelect: openComposer,
        },
        {
          id: 'palette',
          label: compact ? 'Abrir cards' : 'Focar lista de cards',
          icon: addOutline,
          onSelect: () => {
            if (compact) setPaletteOpen(true);
            else setInspectorOpen(true);
          },
        },
        {
          id: 'fit',
          label: 'Enquadrar tudo',
          icon: expandOutline,
          separator: true,
          onSelect: () => fitView({ padding: compact ? 0.15 : 0.2 }),
        },
        {
          id: 'grid',
          label: settings.showGrid ? 'Ocultar grade' : 'Mostrar grade',
          icon: gridOutline,
          onSelect: () =>
            setSettings((s) => ({ ...s, showGrid: !s.showGrid })),
        },
        {
          id: 'snap',
          label: settings.snapToGrid
            ? 'Desligar encaixe na grade'
            : 'Encaixar na grade',
          onSelect: () =>
            setSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid })),
        },
        {
          id: 'format',
          label: 'Abrir painel Formatar',
          separator: true,
          onSelect: () => setInspectorOpen(true),
        },
      ];
      openCtx(event, items, 'Fluxograma');
    },
    [compact, fitView, openComposer, openCtx, settings.showGrid, settings.snapToGrid],
  );

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
              type: 'flowEdge',
              animated: false,
              label: 'síntese',
              data: {
                kind: 'synthesis',
                svgAnimate: settings.defaultSvgAnimate,
                pathType: 'smoothstep',
              },
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
      settings.defaultSvgAnimate,
    ],
  );

  const createCard = useCallback(async () => {
    if (!front.trim()) return;
    const plain = documentToPlainText(docJson);
    const nextBack = back.trim() || plain.slice(0, 280);
    if (!nextBack) return;
    setComposerSaving(true);
    try {
      const created = await cardsFacade.create({
        subjectId: board.subjectId,
        topicId: null,
        front,
        back: nextBack,
        document: docJson || null,
        hint,
        icon,
        tag,
      });
      onCardsChange([created, ...cards]);
      setComposerOpen(false);
      setFront('');
      setBack('');
      setDocJson('');
      setHint('');
      setIcon(null);
      setTag('Conceito');
      toast.success('Carta criada');
      addCard(created);
    } catch (error) {
      toast.error(error);
    } finally {
      setComposerSaving(false);
    }
  }, [
    addCard,
    back,
    board.subjectId,
    cards,
    docJson,
    front,
    hint,
    icon,
    onCardsChange,
    tag,
    toast,
  ]);

  const removeSelected = useCallback(() => {
    if (selectedEdgeIds.length) {
      const removable = selectedEdgeIds.filter((id) => {
        const edge = edges.find((e) => e.id === id);
        return edge && !isSynthesisEdge(edge);
      });
      if (removable.length) {
        const removeSet = new Set(removable);
        const nextEdges = edges.filter((e) => !removeSet.has(e.id));
        setEdges(nextEdges);
        setSelectedEdgeIds([]);
        scheduleSave(nodes, nextEdges);
      }
    }
    if (selectedNodeIds.length) {
      deleteNodesByIds(selectedNodeIds);
    }
  }, [
    deleteNodesByIds,
    edges,
    nodes,
    scheduleSave,
    selectedEdgeIds,
    selectedNodeIds,
    setEdges,
  ]);

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
      <button
        type="button"
        className="sc-btn primary sc-flow-palette-create"
        onClick={openComposer}
      >
        <IonIcon icon={createOutline} />
        <span>Nova carta</span>
      </button>
      <input
        className="sc-search sc-flow-palette-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar card…"
        aria-label="Buscar card"
      />
      <div className="sc-flow-palette-list">
        {available.map((card) => (
          <div
            key={card.id}
            className="sc-flow-palette-row"
            onContextMenu={(e) =>
              openCtx(
                e,
                [
                  {
                    id: 'add',
                    label: 'Adicionar ao mapa',
                    icon: addOutline,
                    onSelect: () => addCard(card),
                  },
                  {
                    id: 'edit',
                    label: 'Editar carta',
                    icon: documentTextOutline,
                    onSelect: () => openCardEditor(card.id),
                  },
                ],
                card.front,
              )
            }
          >
            <button
              type="button"
              className="sc-flow-palette-item"
              draggable={!compact}
              onDragStart={(e) => onDragStart(e, card)}
              onClick={() => addCard(card)}
            >
              <span className="sc-flow-palette-tag">{card.tag}</span>
              <span className="sc-flow-palette-title">{card.front}</span>
            </button>
            <button
              type="button"
              className="sc-flow-palette-edit"
              aria-label={`Editar ${card.front}`}
              title="Editar carta"
              onClick={() => openCardEditor(card.id)}
            >
              <IonIcon icon={documentTextOutline} />
            </button>
          </div>
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
      className={`sc-flow-workspace${compact ? ' is-compact' : ''}${paletteOpen ? ' is-palette-open' : ''}${inspectorOpen ? ' is-inspector-open' : ''}`}
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
              disabled={!selectedNodeIds.length && !selectedEdgeIds.length}
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
              onClick={openComposer}
              aria-label="Nova carta"
              title="Nova carta"
            >
              <IonIcon icon={createOutline} />
              {!compact ? <span>Nova carta</span> : null}
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
          isValidConnection={isValidConnection}
          onBeforeDelete={onBeforeDelete}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onSelectionChange={onSelectionChange}
          onMoveStart={closeCtx}
          onPaneClick={closeCtx}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: 'flowEdge',
            animated: false,
            data: {
              svgAnimate: settings.defaultSvgAnimate,
              pathType: 'smoothstep',
            },
          }}
          fitView
          colorMode={resolved}
          deleteKeyCode={compact ? null : ['Backspace', 'Delete']}
          edgesReconnectable
          snapToGrid={settings.snapToGrid}
          snapGrid={[16, 16]}
          panOnScroll={!compact}
          zoomOnPinch
          panOnDrag
          selectionOnDrag={!compact}
          minZoom={0.25}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          {settings.showGrid ? (
            <Background
              variant={BackgroundVariant.Dots}
              gap={compact ? 16 : 18}
              size={1}
              color="var(--border)"
            />
          ) : null}
          <Controls showInteractive={!compact} position="bottom-left" />
          {!compact && settings.showMiniMap ? (
            <MiniMap pannable zoomable nodeColor={() => 'var(--text-accent)'} />
          ) : null}
        </ReactFlow>
      </div>

      <FlowInspector
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        compact={compact}
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
        allNodes={nodes}
        settings={settings}
        onSettingsChange={setSettings}
        onUpdateEdge={updateEdge}
        onDeleteEdge={deleteEdgeById}
        onDeleteNodes={deleteNodesByIds}
        onUpdateNodeData={updateNodeData}
        onEditCard={openCardEditor}
        onCreateCard={openComposer}
      />

      <FaceCardComposer
        open={composerOpen}
        front={front}
        back={back}
        docJson={docJson}
        tag={tag}
        hint={hint}
        icon={icon}
        saving={composerSaving}
        title="Nova carta no fluxo"
        submitLabel="Criar e colocar no mapa"
        onFront={setFront}
        onBack={setBack}
        onDocJson={setDocJson}
        onTag={setTag}
        onHint={setHint}
        onIcon={setIcon}
        onClose={() => setComposerOpen(false)}
        onSubmit={() => void createCard()}
      />

      <CardDocumentSheet
        card={detail}
        onClose={() => setDetail(null)}
        onChanged={handleCardChanged}
        onDelete={(id) => void handleCardDelete(id)}
        onOpenLinked={(linked) => {
          onCardsChange(
            cards.some((c) => c.id === linked.id)
              ? cards.map((c) => (c.id === linked.id ? linked : c))
              : [linked, ...cards],
          );
          setDetail(linked);
        }}
      />

      <ContextMenu menu={ctxMenu} onClose={closeCtx} />
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
              onCardsChange={setCards}
            />
          </ReactFlowProvider>
        )}
      </IonContent>
    </IonPage>
  );
}
