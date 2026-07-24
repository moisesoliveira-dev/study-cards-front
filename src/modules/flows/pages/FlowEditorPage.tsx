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
  useIonViewWillEnter,
} from '@ionic/react';
import { IonIcon } from '@ionic/react';
import { ContextMenu, useContextMenu } from '../../../shared/components/ContextMenu';
import type { ContextMenuItem } from '../../../shared/components/ContextMenu';
import {
  addOutline,
  arrowBackOutline,
  brushOutline,
  closeOutline,
  createOutline,
  documentTextOutline,
  downloadOutline,
  expandOutline,
  gitNetworkOutline,
  gridOutline,
  layersOutline,
  trashOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
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
import { SubFlowGroupNode } from '../../../shared/flow/SubFlowGroupNode';
import { FlowEraser } from '../../../shared/flow/FlowEraser';
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
import {
  buildNodeMap,
  clearNodeMotionClasses,
  downloadFlowImage,
  findGroupAtPoint,
  getAbsolutePosition,
  getNodeSize,
  getTreeDescendantIds,
  moveNodesByDelta,
  nodesAbsoluteBounds,
  pushApartCollisions,
  resolveSubflowParenting,
  sortNodesForSubflow,
} from '../../../shared/flow/flow-tools.utils';
import { FaceCardComposer } from '../../../shared/components/FaceCardComposer';
import { CardDocumentSheet } from '../../../shared/components/CardDocumentSheet';
import { documentToPlainText } from '../../../shared/components/DocumentEditor';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { useTheme } from '../../../shared/theme/ThemeContext';

const nodeTypes = {
  cardNode: CardFlowNode,
  groupNode: SubFlowGroupNode,
};
const edgeTypes = { flowEdge: CardFlowEdge };

const DEFAULT_SOURCE_HANDLE = 's-right-1';
const DEFAULT_TARGET_HANDLE = 't-left-1';

const DEFAULT_SETTINGS: FlowCanvasSettings = {
  snapToGrid: false,
  showMiniMap: true,
  showGrid: true,
  defaultSvgAnimate: true,
  dragTree: false,
  nodeCollisions: false,
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

  const initialNodes: Node[] = useMemo(() => {
    const mapped: Node[] = [];
    for (const n of board.nodes) {
      if (n.type === 'groupNode') {
        mapped.push({
          id: n.id,
          type: 'groupNode',
          position: n.position,
          parentId: n.parentId,
          extent: n.extent === 'parent' ? ('parent' as const) : undefined,
          expandParent: n.expandParent,
          style: n.style ?? {
            width: n.width ?? 320,
            height: n.height ?? 220,
          },
          width: n.width,
          height: n.height,
          data: {
            label: String(n.data?.label ?? 'Subfluxo'),
          },
          zIndex: -1,
        });
        continue;
      }

      const cardId = String(n.data?.cardId ?? '');
      const card = cardMap.get(cardId);
      // Drop nodes for cards that no longer exist (keep flow in sync)
      if (!card) continue;

      const handleOffsets =
        (n.data?.handleOffsets as CardFlowNodeData['handleOffsets']) ??
        undefined;
      const blockIncoming = Boolean(n.data?.blockIncoming);
      const blockedSourceIds = Array.isArray(n.data?.blockedSourceIds)
        ? (n.data.blockedSourceIds as string[])
        : undefined;
      mapped.push({
        id: n.id,
        type: 'cardNode',
        position: n.position,
        parentId: n.parentId,
        extent: n.extent === 'parent' ? ('parent' as const) : undefined,
        expandParent: n.expandParent ?? Boolean(n.parentId),
        data: {
          ...cardToNodeData(card),
          handleOffsets,
          blockIncoming,
          blockedSourceIds,
        },
      });
    }

    const keptIds = new Set(mapped.map((n) => n.id));
    // Drop group children whose parent was removed, and empty parent links
    const withoutDangling = mapped.filter(
      (n) => !n.parentId || keptIds.has(n.parentId),
    );

    // Parents must come before children for React Flow subflows
    return withoutDangling.sort((a, b) => {
      const aGroup = a.type === 'groupNode' ? 0 : 1;
      const bGroup = b.type === 'groupNode' ? 0 : 1;
      if (aGroup !== bGroup) return aGroup - bGroup;
      if (a.parentId && !b.parentId) return 1;
      if (!a.parentId && b.parentId) return -1;
      return 0;
    });
  }, [board.nodes, cardMap]);

  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));
    return board.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) =>
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
      );
  }, [board.edges, initialNodes]);

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
  const [eraserActive, setEraserActive] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const lastDragPosRef = useRef<{ id: string; x: number; y: number } | null>(
    null,
  );
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  /** Cards deleted in this session — blocks autosave from resurrecting nodes. */
  const deletedCardIdsRef = useRef<Set<string>>(new Set());

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
    deletedCardIdsRef.current = new Set();
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
        const knownCards = new Set(cardsRef.current.map((c) => c.id));
        const banned = deletedCardIdsRef.current;
        const removeIds = new Set<string>();
        for (const n of nextNodes) {
          if (n.type === 'groupNode') continue;
          const cardId = (n.data as CardFlowNodeData | undefined)?.cardId;
          const fromId =
            n.id.startsWith('card-') && n.id.length > 5 ? n.id.slice(5) : '';
          const resolved = cardId || fromId;
          if (
            !resolved ||
            !knownCards.has(resolved) ||
            banned.has(resolved)
          ) {
            removeIds.add(n.id);
          }
        }
        let expanded = true;
        while (expanded) {
          expanded = false;
          for (const n of nextNodes) {
            if (
              n.parentId &&
              removeIds.has(n.parentId) &&
              !removeIds.has(n.id)
            ) {
              removeIds.add(n.id);
              expanded = true;
            }
          }
        }
        const cleanNodes = nextNodes.filter((n) => !removeIds.has(n.id));
        const kept = new Set(cleanNodes.map((n) => n.id));
        const cleanEdges = nextEdges.filter(
          (e) => kept.has(e.source) && kept.has(e.target),
        );

        const updated = await flowsFacade.update(board.id, {
          nodes: cleanNodes.map((n) => {
            if (n.type === 'groupNode') {
              return {
                id: n.id,
                type: n.type,
                position: n.position,
                parentId: n.parentId,
                extent: n.extent === 'parent' ? 'parent' : undefined,
                expandParent: n.expandParent,
                width:
                  n.width ??
                  (typeof n.style?.width === 'number'
                    ? n.style.width
                    : undefined),
                height:
                  n.height ??
                  (typeof n.style?.height === 'number'
                    ? n.style.height
                    : undefined),
                style: (n.style as Record<string, unknown>) ?? undefined,
                data: n.data as Record<string, unknown>,
              };
            }
            const data = n.data as CardFlowNodeData;
            return {
              id: n.id,
              type: n.type,
              position: n.position,
              parentId: n.parentId,
              extent: n.extent === 'parent' ? 'parent' : undefined,
              expandParent: n.expandParent,
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
          edges: cleanEdges.map((e) => ({
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

  /** Drop canvas nodes when their cards disappear; refresh labels from live cards. */
  const syncGraphWithCards = useCallback(() => {
    const known = new Map(cardsRef.current.map((c) => [c.id, c]));
    const banned = deletedCardIdsRef.current;
    const ns = nodesRef.current;
    const eds = edgesRef.current;
    const removeIds = new Set<string>();
    for (const n of ns) {
      if (n.type === 'groupNode') continue;
      const cardId = (n.data as CardFlowNodeData | undefined)?.cardId;
      const fromId =
        n.id.startsWith('card-') && n.id.length > 5 ? n.id.slice(5) : '';
      const resolved = cardId || fromId;
      if (!resolved || !known.has(resolved) || banned.has(resolved)) {
        removeIds.add(n.id);
      }
    }
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const n of ns) {
        if (n.parentId && removeIds.has(n.parentId) && !removeIds.has(n.id)) {
          removeIds.add(n.id);
          expanded = true;
        }
      }
    }

    let changed = removeIds.size > 0;
    const nextNodes = ns
      .filter((n) => !removeIds.has(n.id))
      .map((n) => {
        if (n.type === 'groupNode') return n;
        const data = n.data as CardFlowNodeData;
        const card = known.get(data.cardId);
        if (!card) return n;
        if (
          data.front === card.front &&
          data.tag === card.tag &&
          data.icon === card.icon &&
          data.status === card.status &&
          data.linkCount === card.linkCount
        ) {
          return n;
        }
        changed = true;
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

    if (!changed) return;

    const kept = new Set(nextNodes.map((n) => n.id));
    const nextEdges = eds.filter(
      (e) => kept.has(e.source) && kept.has(e.target),
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (removeIds.size) scheduleSave(nextNodes, nextEdges);
  }, [scheduleSave, setEdges, setNodes]);

  useEffect(() => {
    syncGraphWithCards();
  }, [cards, syncGraphWithCards]);

  // Persist once if the loaded board still had deleted-card leftovers
  useEffect(() => {
    const hadOrphans = board.nodes.some((n) => {
      if (n.type === 'groupNode') return false;
      const cardId = String(n.data?.cardId ?? '');
      return Boolean(cardId) && !cardMap.has(cardId);
    });
    if (!hadOrphans) return;
    scheduleSave(initialNodes, initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

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

  const onNodeDragStart = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      lastDragPosRef.current = {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      };
      // Temporarily unlock extent so the node can leave / enter groups
      if (node.parentId && node.extent === 'parent') {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? { ...n, extent: undefined } : n,
          ),
        );
      }
    },
    [setNodes],
  );

  const onNodeDrag = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      if (settings.dragTree) {
        const last = lastDragPosRef.current;
        if (last && last.id === node.id) {
          const delta = {
            x: node.position.x - last.x,
            y: node.position.y - last.y,
          };
          const descendants = getTreeDescendantIds(node.id, edges);
          if (descendants.size && (delta.x || delta.y)) {
            setNodes((ns) => moveNodesByDelta(ns, descendants, delta));
          }
          lastDragPosRef.current = {
            id: node.id,
            x: node.position.x,
            y: node.position.y,
          };
        }
      }

      if (node.type === 'groupNode') return;

      setNodes((ns) => {
        const withLive = ns.map((n) =>
          n.id === node.id ? { ...n, position: node.position } : n,
        );
        const live = withLive.find((n) => n.id === node.id) ?? node;
        const size = getNodeSize(live);
        const abs = getAbsolutePosition(live, buildNodeMap(withLive));
        const center = {
          x: abs.x + size.width / 2,
          y: abs.y + size.height / 2,
        };
        const hoverGroup = findGroupAtPoint(withLive, center, node.id);
        const hoverId = hoverGroup?.id;

        let collideIds = new Set<string>();
        if (settings.nodeCollisions) {
          const mw = size.width;
          const mh = size.height;
          const mx = live.position.x;
          const my = live.position.y;
          for (const other of withLive) {
            if (
              other.id === node.id ||
              other.type === 'groupNode' ||
              (other.parentId ?? null) !== (live.parentId ?? null)
            ) {
              continue;
            }
            const ow = getNodeSize(other).width;
            const oh = getNodeSize(other).height;
            const overlapX =
              (mw + ow) / 2 + 8 - Math.abs(mx + mw / 2 - (other.position.x + ow / 2));
            const overlapY =
              (mh + oh) / 2 + 8 - Math.abs(my + mh / 2 - (other.position.y + oh / 2));
            if (overlapX > 0 && overlapY > 0) collideIds.add(other.id);
          }
          if (collideIds.size) collideIds.add(node.id);
        }

        return withLive.map((n) => {
          if (n.type === 'groupNode') {
            const cls =
              n.id === hoverId ? 'sc-flow-group-drop-target' : undefined;
            return n.className === cls ? n : { ...n, className: cls };
          }
          const cls = collideIds.has(n.id) ? 'sc-flow-node-collide' : undefined;
          return n.className === cls ? n : { ...n, className: cls };
        });
      });
    },
    [edges, setNodes, settings.dragTree, settings.nodeCollisions],
  );

  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      setNodes((ns) => {
        let next = ns.map((n) =>
          n.id === node.id ? { ...n, position: node.position } : n,
        );

        if (node.type !== 'groupNode') {
          next = resolveSubflowParenting(next, {
            ...node,
            position: node.position,
          });
          if (settings.nodeCollisions) {
            next = pushApartCollisions(next, node.id).nodes;
          }
        }

        next = next.map((n) => {
          if (n.className === 'sc-flow-node-settle') return n;
          return n.className ? { ...n, className: undefined } : n;
        });
        next = next.map((n) =>
          n.parentId && n.type !== 'groupNode'
            ? { ...n, extent: 'parent' as const, expandParent: true }
            : n,
        );
        scheduleSave(next, edgesRef.current);
        return next;
      });
      window.setTimeout(() => {
        setNodes((ns) => clearNodeMotionClasses(ns));
      }, 220);
      lastDragPosRef.current = null;
    },
    [scheduleSave, setNodes, settings.nodeCollisions],
  );

  const createSubFlow = useCallback(() => {
    const selected = nodes.filter(
      (n) => selectedNodeIds.includes(n.id) && n.type !== 'groupNode',
    );
    const groupId = `group-${crypto.randomUUID().slice(0, 8)}`;

    if (!selected.length) {
      const center = screenToFlowPosition({
        x: window.innerWidth * 0.5,
        y: window.innerHeight * (compact ? 0.42 : 0.38),
      });
      const groupNode: Node = {
        id: groupId,
        type: 'groupNode',
        position: { x: center.x - 160, y: center.y - 110 },
        style: { width: 320, height: 220 },
        data: { label: 'Subfluxo' },
        zIndex: -1,
      };
      const nextNodes = sortNodesForSubflow([groupNode, ...nodes]);
      setNodes(nextNodes);
      scheduleSave(nextNodes, edges);
      setSelectedNodeIds([groupId]);
      toast.success('Subfluxo vazio criado — arraste cards para dentro');
      return;
    }

    const bounds = nodesAbsoluteBounds(selected);
    const groupNode: Node = {
      id: groupId,
      type: 'groupNode',
      position: { x: bounds.x, y: bounds.y },
      style: { width: bounds.width, height: bounds.height },
      data: { label: 'Subfluxo' },
      zIndex: -1,
    };
    const selectedIds = new Set(selected.map((n) => n.id));
    const nextNodes = sortNodesForSubflow([
      groupNode,
      ...nodes.map((n) => {
        if (!selectedIds.has(n.id)) return n;
        return {
          ...n,
          parentId: groupId,
          extent: 'parent' as const,
          expandParent: true,
          position: {
            x: n.position.x - bounds.x,
            y: n.position.y - bounds.y,
          },
        };
      }),
    ]);
    setNodes(nextNodes);
    scheduleSave(nextNodes, edges);
    setSelectedNodeIds([groupId]);
    toast.success('Subfluxo criado');
  }, [
    compact,
    edges,
    nodes,
    scheduleSave,
    screenToFlowPosition,
    selectedNodeIds,
    setNodes,
    toast,
  ]);

  const ungroupSelected = useCallback(() => {
    const groups = nodes.filter(
      (n) => selectedNodeIds.includes(n.id) && n.type === 'groupNode',
    );
    if (!groups.length) {
      toast.error(new Error('Selecione um subfluxo para desagrupar'));
      return;
    }
    const groupIds = new Set(groups.map((g) => g.id));
    const nextNodes = nodes
      .filter((n) => !groupIds.has(n.id))
      .map((n) => {
        if (!n.parentId || !groupIds.has(n.parentId)) return n;
        const parent = groups.find((g) => g.id === n.parentId);
        return {
          ...n,
          parentId: undefined,
          extent: undefined,
          expandParent: undefined,
          position: {
            x: n.position.x + (parent?.position.x ?? 0),
            y: n.position.y + (parent?.position.y ?? 0),
          },
        };
      });
    setNodes(nextNodes);
    scheduleSave(nextNodes, edges);
    setSelectedNodeIds([]);
    toast.success('Subfluxo desagrupado');
  }, [edges, nodes, scheduleSave, selectedNodeIds, setNodes, toast]);

  const ungroupByIds = useCallback(
    (ids: string[]) => {
      const groups = nodes.filter(
        (n) => ids.includes(n.id) && n.type === 'groupNode',
      );
      if (!groups.length) return;
      const groupIds = new Set(groups.map((g) => g.id));
      const nextNodes = nodes
        .filter((n) => !groupIds.has(n.id))
        .map((n) => {
          if (!n.parentId || !groupIds.has(n.parentId)) return n;
          const parent = groups.find((g) => g.id === n.parentId);
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            expandParent: undefined,
            position: {
              x: n.position.x + (parent?.position.x ?? 0),
              y: n.position.y + (parent?.position.y ?? 0),
            },
          };
        });
      setNodes(nextNodes);
      scheduleSave(nextNodes, edges);
      setSelectedNodeIds([]);
      toast.success('Subfluxo desagrupado');
    },
    [edges, nodes, scheduleSave, setNodes, toast],
  );

  const handleEraser = useCallback(
    (nodeIds: string[], edgeIds: string[]) => {
      const removeNodes = new Set(nodeIds);
      for (const n of nodes) {
        if (n.parentId && removeNodes.has(n.parentId)) removeNodes.add(n.id);
      }
      const nextNodes = nodes.filter((n) => !removeNodes.has(n.id));
      const nextEdges = edges.filter((e) => {
        if (removeNodes.has(e.source) || removeNodes.has(e.target)) return false;
        if (edgeIds.includes(e.id) && !isSynthesisEdge(e)) return false;
        return true;
      });
      setNodes(nextNodes);
      setEdges(nextEdges);
      scheduleSave(nextNodes, nextEdges);
    },
    [edges, nodes, scheduleSave, setEdges, setNodes],
  );

  const downloadImage = useCallback(async () => {
    try {
      await downloadFlowImage(
        `${(board.name || 'fluxograma').replace(/\s+/g, '-').toLowerCase()}.png`,
      );
      toast.success('Imagem baixada');
    } catch (error) {
      toast.error(error);
    }
  }, [board.name, toast]);

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
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((ns) => {
        const next = ns.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: {
              ...(n.data as Record<string, unknown>),
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
      for (const n of nodes) {
        if (n.parentId && idSet.has(n.parentId)) idSet.add(n.id);
      }
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

  /** Remove every canvas node that represents this card (by data.cardId or id). */
  const removeCardFromGraph = useCallback(
    (cardId: string) => {
      deletedCardIdsRef.current.add(cardId);
      const ns = nodesRef.current;
      const eds = edgesRef.current;
      const removeIds = new Set<string>();
      for (const n of ns) {
        if (n.type === 'groupNode') continue;
        const dataId = (n.data as CardFlowNodeData | undefined)?.cardId;
        const fromId =
          n.id.startsWith('card-') && n.id.length > 5 ? n.id.slice(5) : '';
        if (
          dataId === cardId ||
          fromId === cardId ||
          n.id === `card-${cardId}` ||
          n.id === cardId
        ) {
          removeIds.add(n.id);
        }
      }
      if (!removeIds.size) {
        // Still persist so server-side prune runs
        scheduleSave(ns, eds);
        return;
      }
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const n of ns) {
          if (n.parentId && removeIds.has(n.parentId) && !removeIds.has(n.id)) {
            removeIds.add(n.id);
            expanded = true;
          }
        }
      }
      const nextNodes = ns.filter((n) => !removeIds.has(n.id));
      const kept = new Set(nextNodes.map((n) => n.id));
      const nextEdges = eds.filter(
        (e) => kept.has(e.source) && kept.has(e.target),
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeIds((ids) => ids.filter((id) => !removeIds.has(id)));
      setSelectedEdgeIds([]);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persist(nextNodes, nextEdges);
    },
    [persist, scheduleSave, setEdges, setNodes],
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
        const nextCards = cardsRef.current.filter((c) => c.id !== id);
        cardsRef.current = nextCards;
        onCardsChange(nextCards);
        removeCardFromGraph(id);
        setDetail(null);
        toast.success('Carta excluída');
      } catch (error) {
        toast.error(error);
      }
    },
    [onCardsChange, removeCardFromGraph, toast],
  );

  useEffect(() => {
    const onCardDeleted = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      const nextCards = cardsRef.current.filter((c) => c.id !== id);
      cardsRef.current = nextCards;
      onCardsChange(nextCards);
      removeCardFromGraph(id);
    };
    window.addEventListener('sc-card-deleted', onCardDeleted);
    return () => window.removeEventListener('sc-card-deleted', onCardDeleted);
  }, [onCardsChange, removeCardFromGraph]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const cardId = (node.data as CardFlowNodeData | undefined)?.cardId;
      if (cardId) openCardEditor(cardId);
    },
    [openCardEditor],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const otherSelected = selectedNodeIds.filter((id) => id !== node.id);

      if (node.type === 'groupNode') {
        const label =
          String((node.data as { label?: string })?.label ?? 'Subfluxo');
        const items: ContextMenuItem[] = [
          {
            id: 'rename',
            label: 'Renomear subfluxo',
            icon: createOutline,
            onSelect: () => {
              const next = window.prompt('Nome do subfluxo', label);
              if (next == null) return;
              updateNodeData(node.id, { label: next.trim() || 'Subfluxo' });
            },
          },
          {
            id: 'ungroup',
            label: 'Desagrupar subfluxo',
            icon: gitNetworkOutline,
            onSelect: () => ungroupByIds([node.id]),
          },
          {
            id: 'focus',
            label: 'Enquadrar grupo',
            icon: expandOutline,
            onSelect: () =>
              fitView({
                nodes: [{ id: node.id }],
                padding: 0.35,
                duration: 280,
              }),
          },
          {
            id: 'remove',
            label: 'Remover grupo e cards',
            icon: trashOutline,
            danger: true,
            separator: true,
            onSelect: () => deleteNodesByIds([node.id]),
          },
        ];
        setSelectedNodeIds([node.id]);
        setSelectedEdgeIds([]);
        openCtx(event, items, label);
        return;
      }

      const data = node.data as CardFlowNodeData;
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
          id: 'subflow',
          label: 'Criar subfluxo com seleção',
          icon: layersOutline,
          separator: true,
          onSelect: createSubFlow,
        },
        {
          id: 'block-in',
          label: data.blockIncoming
            ? 'Permitir entradas'
            : 'Bloquear entradas',
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
      createSubFlow,
      deleteNodesByIds,
      fitView,
      nodes,
      openCardEditor,
      openCtx,
      selectedNodeIds,
      ungroupByIds,
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
          id: 'subflow',
          label: 'Criar subfluxo (seleção ou vazio)',
          icon: layersOutline,
          separator: true,
          onSelect: createSubFlow,
        },
        {
          id: 'fit',
          label: 'Enquadrar tudo',
          icon: expandOutline,
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
          id: 'download',
          label: 'Download Image',
          icon: downloadOutline,
          separator: true,
          onSelect: () => void downloadImage(),
        },
        {
          id: 'format',
          label: 'Abrir painel Formatar',
          onSelect: () => setInspectorOpen(true),
        },
      ];
      openCtx(event, items, 'Fluxograma');
    },
    [
      compact,
      createSubFlow,
      downloadImage,
      fitView,
      openComposer,
      openCtx,
      settings.showGrid,
      settings.snapToGrid,
    ],
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

      const group = findGroupAtPoint(nodes, pos);
      let node: Node = {
        id,
        type: 'cardNode',
        position: pos,
        data: cardToNodeData(card),
      };
      if (group) {
        const groupAbs = getAbsolutePosition(
          group,
          new Map(nodes.map((n) => [n.id, n])),
        );
        node = {
          ...node,
          parentId: group.id,
          extent: 'parent',
          expandParent: true,
          position: {
            x: pos.x - groupAbs.x,
            y: pos.y - groupAbs.y,
          },
        };
      }

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

      const nextNodes = sortNodesForSubflow([...nodes, node]);
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
              className={`sc-btn sc-flow-tool-btn${eraserActive ? ' is-active' : ''}`}
              onClick={() => setEraserActive((v) => !v)}
              aria-label="Borracha"
              title="Borracha — arraste sobre nós e conexões"
            >
              <IonIcon icon={brushOutline} />
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              onClick={createSubFlow}
              aria-label="Subfluxo"
              title={
                selectedNodeIds.some((id) => {
                  const n = nodes.find((x) => x.id === id);
                  return n && n.type !== 'groupNode';
                })
                  ? 'Criar subfluxo com a seleção'
                  : 'Criar subfluxo vazio (solte cards dentro)'
              }
            >
              <IonIcon icon={layersOutline} />
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              disabled={!selectedNodeIds.some((id) => nodes.find((n) => n.id === id)?.type === 'groupNode')}
              onClick={ungroupSelected}
              aria-label="Desagrupar"
              title="Desagrupar subfluxo"
            >
              <IonIcon icon={gitNetworkOutline} />
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              onClick={() => void downloadImage()}
              aria-label="Baixar PNG"
              title="Baixar imagem PNG"
            >
              <IonIcon icon={downloadOutline} />
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              disabled={!selectedNodeIds.length && !selectedEdgeIds.length}
              onClick={removeSelected}
              aria-label="Remover seleção"
              title="Remover seleção"
            >
              <IonIcon icon={trashOutline} />
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              onClick={openComposer}
              aria-label="Nova carta"
              title="Nova carta"
            >
              <IonIcon icon={createOutline} />
            </button>
            <button
              type="button"
              className="sc-btn sc-flow-tool-btn"
              onClick={() => fitView({ padding: compact ? 0.15 : 0.2 })}
              aria-label="Enquadrar"
              title="Enquadrar tudo"
            >
              <IonIcon icon={expandOutline} />
            </button>
            {compact ? (
              <button
                type="button"
                className="sc-btn primary sc-flow-tool-btn"
                onClick={() => setPaletteOpen(true)}
                aria-label="Adicionar card"
                title="Abrir lista de cards"
              >
                <IonIcon icon={addOutline} />
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
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
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
          deleteKeyCode={compact || eraserActive ? null : ['Backspace', 'Delete']}
          edgesReconnectable={!eraserActive}
          nodesDraggable={!eraserActive}
          nodesConnectable={!eraserActive}
          elementsSelectable={!eraserActive}
          snapToGrid={settings.snapToGrid}
          snapGrid={[16, 16]}
          panOnScroll={!compact}
          zoomOnPinch
          panOnDrag={eraserActive ? false : true}
          selectionOnDrag={!compact && !eraserActive}
          minZoom={0.25}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className={eraserActive ? 'sc-flow-erasing' : undefined}
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
          <FlowEraser active={eraserActive} onErase={handleEraser} />
          {eraserActive ? (
            <Panel position="top-center" className="sc-flow-eraser-hint">
              Eraser ativo — arraste sobre nós/conexões
            </Panel>
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
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [board, setBoard] = useState<FlowBoard | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [loading, setLoading] = useState(true);
  /** Remount canvas after each fresh fetch so nodes/edges match the server. */
  const [sessionKey, setSessionKey] = useState(0);
  const loadGen = useRef(0);

  const loadFlow = useCallback(async () => {
    if (!flowId) return;
    const gen = ++loadGen.current;
    setLoading(true);
    try {
      const b = await flowsFacade.get(flowId);
      if (gen !== loadGen.current) return;
      setBoard(b);

      const [cardResult, subjectResult] = await Promise.allSettled([
        cardsFacade.listAllBySubject(b.subjectId),
        subjectsFacade.get(b.subjectId),
      ]);
      if (gen !== loadGen.current) return;

      if (cardResult.status === 'fulfilled') {
        setCards(cardResult.value);
      } else {
        setCards([]);
        toastRef.current.error(cardResult.reason);
      }

      if (subjectResult.status === 'fulfilled') {
        setSubjectName(subjectResult.value.name);
      } else {
        setSubjectName('');
      }

      setSessionKey((k) => k + 1);
    } catch (error) {
      if (gen !== loadGen.current) return;
      toastRef.current.error(error);
      history.replace('/flows');
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }, [flowId, history]);

  // Fresh board + cards every time you open / return to this screen
  useIonViewWillEnter(() => {
    void loadFlow();
  });

  // Reload when switching between different flow ids in the stack
  useEffect(() => {
    void loadFlow();
  }, [flowId, loadFlow]);

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
          <ReactFlowProvider key={`${board.id}-${sessionKey}`}>
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
