import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { subjectsFacade } from '../../modules/subjects/facades/subjects.facade';
import { topicsFacade } from '../../modules/topics/facades/topics.facade';
import { decksFacade } from '../../modules/decks/facades/decks.facade';
import { cardsFacade } from '../../modules/cards/facades/cards.facade';
import { cardLevelsFacade } from '../../modules/cards/facades/card-levels.facade';
import type { CardLevel } from '../../modules/cards/types/card-level.types';
import type { Subject } from '../../modules/subjects/types/subject.types';
import type { TopicTreeNode } from '../../modules/topics/types/topic.types';
import type { Deck } from '../../modules/decks/types/deck.types';
import type { Card } from '../../modules/cards/types/card.types';
import { CARD_ACCENT_COLORS } from '../../modules/cards/types/card.types';
import { DriveTopBar } from '../components/DriveTopBar';
import { DriveFolderItem } from '../components/DriveFolderItem';
import { Field, TextArea } from '../components/Field';
import { DriveCardItem, FaceCard } from '../components/DriveCardItem';
import { FaceCardComposer } from '../components/FaceCardComposer';
import { CardDocumentSheet } from '../components/CardDocumentSheet';
import { documentToPlainText } from '../components/DocumentEditor';
import {
  CardSortableContext,
  DeckSortableContext,
  DriveDndProvider,
  FolderSortableContext,
  HallDroppable,
  RootDroppable,
  SortableCard,
  SortableDeck,
  SortableFolder,
  type DriveDropEvent,
} from '../dnd/DragDrop';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MergeSourcePicker } from '../components/MergeSourcePicker';
import {
  ContextMenu,
  useContextMenu,
  type ContextMenuItem,
} from '../components/ContextMenu';
import { useAppToast } from '../hooks/useAppToast';
import { useCatalogColors } from '../hooks/useCatalogColors';
import { CatalogColorPicker } from '../components/CatalogColorPicker';
import { MotionShell, MotionStagger, tapScale } from '../motion';
import { motion, useReducedMotion } from 'framer-motion';
import {
  createOutline,
  documentTextOutline,
  folderOutline,
  openOutline,
  pencilOutline,
  trashOutline,
} from 'ionicons/icons';

const DOUBLE_TAP_MS = 340;

function useTouchUi() {
  const [touchUi, setTouchUi] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (max-width: 820px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (max-width: 820px)');
    const sync = () => setTouchUi(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return touchUi;
}

function findNode(
  nodes: TopicTreeNode[],
  id: string,
): TopicTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const child = findNode(n.children, id);
    if (child) return child;
  }
  return null;
}

function buildPath(
  nodes: TopicTreeNode[],
  topicId: string,
  trail: TopicTreeNode[] = [],
): TopicTreeNode[] | null {
  for (const n of nodes) {
    const next = [...trail, n];
    if (n.id === topicId) return next;
    const found = buildPath(n.children, topicId, next);
    if (found) return found;
  }
  return null;
}

/** Atualiza a lista local após um move — sem refetch / spinner. */
function applyMovedCard(
  list: Card[],
  moved: Card,
  currentTopicId: string | null,
  beforeCardId?: string | null,
): Card[] {
  if (moved.topicId !== currentTopicId) {
    return list.filter((c) => c.id !== moved.id);
  }

  const had = list.some((c) => c.id === moved.id);
  let next = had
    ? list.map((c) => (c.id === moved.id ? moved : c))
    : [...list, moved];

  if (beforeCardId) {
    next = next.map((c) => {
      if (c.id === moved.id) return c;
      if (c.deckId !== moved.deckId) return c;
      if (c.position >= moved.position) {
        return { ...c, position: c.position + 1 };
      }
      return c;
    });
  }

  return next;
}

function applyMovedDeck(
  list: Deck[],
  moved: Deck,
  beforeDeckId?: string | null,
): Deck[] {
  const had = list.some((d) => d.id === moved.id);
  let next = had
    ? list.map((d) => (d.id === moved.id ? moved : d))
    : [...list, moved];

  if (beforeDeckId) {
    next = next.map((d) => {
      if (d.id === moved.id) return d;
      if (d.position >= moved.position) {
        return { ...d, position: d.position + 1 };
      }
      return d;
    });
  }

  return next.sort((a, b) => a.position - b.position);
}

/**
 * beforeId no sentido da API (inserir antes de X), alinhado ao arrayMove do dnd-kit.
 * null = ir para o final. undefined = não houve mudança de índice.
 */
function beforeIdForReorder(
  orderedIds: string[],
  activeId: string,
  overId: string,
): string | null | undefined {
  const oldIndex = orderedIds.indexOf(activeId);
  const newIndex = orderedIds.indexOf(overId);
  if (newIndex < 0) return undefined;

  // Veio de outro container → ocupa o lugar do over
  if (oldIndex < 0) return overId;

  if (oldIndex === newIndex) return undefined;

  // Para frente: fica no lugar do over → inserir antes do próximo
  if (oldIndex < newIndex) {
    return orderedIds[newIndex + 1] ?? null;
  }
  // Para trás: fica no lugar do over → inserir antes do over
  return overId;
}

type Props = {
  subjectId: string;
  /** Se omitido, estamos na raiz do grupo (assunto). */
  topicId?: string;
};

export default function DriveBrowserPage({ subjectId, topicId }: Props) {
  const history = useHistory();
  const toast = useAppToast();
  const touchUi = useTouchUi();
  const { colors: catalogColors, loading: catalogColorsLoading } =
    useCatalogColors();
  const fallbackColor =
    catalogColors[0]?.hex ?? CARD_ACCENT_COLORS[0];
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [folders, setFolders] = useState<TopicTreeNode[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deckName, setDeckNameInput] = useState('');
  const [deckColor, setDeckColor] = useState<string>(CARD_ACCENT_COLORS[3]);
  const [folderName, setFolderName] = useState('Grupo');
  const [parentId, setParentId] = useState<string | null>(null);
  const [path, setPath] = useState<TopicTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [folderOpen, setFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<TopicTreeNode | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [createDeckId, setCreateDeckId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSources, setMergeSources] = useState<Card[]>([]);
  const [raisedId, setRaisedId] = useState<string | null>(null);
  const [mergePickIds, setMergePickIds] = useState<string[]>([]);
  const [mergePickCards, setMergePickCards] = useState<Record<string, Card>>(
    {},
  );
  const [mergePickerOpen, setMergePickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderColor, setFolderColor] = useState<string>(CARD_ACCENT_COLORS[0]);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [docJson, setDocJson] = useState('');
  const [levelId, setLevelId] = useState<string | null>(null);
  const [levels, setLevels] = useState<CardLevel[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(CARD_ACCENT_COLORS[0]);
  const [tag, setTag] = useState('Conceito');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Card | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<TopicTreeNode | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu();

  const isRoot = !topicId;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [s, t] = await Promise.all([
        subjectsFacade.get(subjectId),
        topicsFacade.tree(subjectId),
      ]);
      setSubject(s);

      if (isRoot) {
        setFolders(t);
        setFolderName(s.name);
        setParentId(null);
        setPath([]);
        const [rootCards, rootDecks] = await Promise.all([
          cardsFacade.listRootBySubject(subjectId),
          decksFacade.list(subjectId, null),
        ]);
        setCards(rootCards);
        setDecks(rootDecks);
      } else {
        const node = findNode(t, topicId);
        const trail = buildPath(t, topicId) ?? [];
        setFolders(node?.children ?? []);
        setFolderName(node?.name ?? 'Pasta');
        setParentId(node?.parentId ?? null);
        setPath(trail);
        const [topicCards, topicDecks] = await Promise.all([
          cardsFacade.listByTopic(topicId),
          decksFacade.list(subjectId, topicId),
        ]);
        setCards(topicCards);
        setDecks(topicDecks);
      }
    } catch (error) {
      toast.error(error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, topicId, isRoot]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setLevelsLoading(true);
    void cardLevelsFacade
      .list()
      .then((list) => {
        if (cancelled) return;
        setLevels(list);
        setLevelId((prev) => {
          if (prev && list.some((l) => l.id === prev)) return prev;
          return list.find((l) => l.slug === 'basic')?.id ?? list[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) setLevels([]);
      })
      .finally(() => {
        if (!cancelled) setLevelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hallCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => !c.deckId)
      .filter((c) => {
        if (!q) return true;
        return (
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          c.tag.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.position - b.position);
  }, [cards, query]);

  const cardsByDeck = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Card[]>();
    for (const deck of decks) map.set(deck.id, []);
    for (const c of cards) {
      if (!c.deckId) continue;
      if (
        q &&
        !(
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          c.tag.toLowerCase().includes(q)
        )
      ) {
        continue;
      }
      const list = map.get(c.deckId) ?? [];
      list.push(c);
      map.set(c.deckId, list);
    }
    for (const [id, list] of map) {
      map.set(
        id,
        [...list].sort((a, b) => a.position - b.position),
      );
    }
    return map;
  }, [cards, decks, query]);

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        (n.description ?? '').toLowerCase().includes(q),
    );
  }, [folders, query]);

  const orderedDecks = useMemo(
    () => [...decks].sort((a, b) => a.position - b.position),
    [decks],
  );

  const orderedFolders = useMemo(
    () => [...filteredFolders].sort((a, b) => a.position - b.position),
    [filteredFolders],
  );

  const filteredCards = hallCards;

  const hallCardIds = useMemo(
    () => filteredCards.map((c) => c.id),
    [filteredCards],
  );
  const deckIds = useMemo(
    () => orderedDecks.map((d) => d.id),
    [orderedDecks],
  );
  const folderIds = useMemo(
    () => orderedFolders.map((f) => f.id),
    [orderedFolders],
  );

  const backHref = isRoot
    ? '/home'
    : parentId
      ? `/topics/${parentId}?subjectId=${subjectId}`
      : `/subjects/${subjectId}`;

  const openFolder = (id: string) => {
    history.push(`/topics/${id}?subjectId=${subjectId}`);
  };

  const openMergeComposer = useCallback((sources: Card[]) => {
    if (sources.length < 2) return;
    setMergeSources(sources);
    setFront(sources.map((c) => c.front).join(' + '));
    setBack(sources.map((c) => `• ${c.front}: ${c.back}`).join('\n'));
    setDocJson('');
    setLevelId(levels.find((l) => l.slug === 'basic')?.id ?? levels[0]?.id ?? null);
    setIcon(null);
    setColor(CARD_ACCENT_COLORS[3]);
    setTag('Síntese');
    setMergeOpen(true);
  }, [levels]);

  const clearMergePicks = () => {
    setMergePickIds([]);
    setMergePickCards({});
    setRaisedId(null);
  };

  const upsertMergePick = useCallback((card: Card) => {
    setMergePickIds((prev) =>
      prev.includes(card.id) ? prev : [...prev, card.id],
    );
    setMergePickCards((prev) => ({ ...prev, [card.id]: card }));
  }, []);

  const toggleMergePick = useCallback((card: Card) => {
    setMergePickIds((prev) => {
      if (prev.includes(card.id)) {
        return prev.filter((id) => id !== card.id);
      }
      return [...prev, card.id];
    });
    setMergePickCards((prev) => {
      if (prev[card.id]) {
        const next = { ...prev };
        delete next[card.id];
        return next;
      }
      return { ...prev, [card.id]: card };
    });
    setRaisedId(card.id);
  }, []);

  const resolveMergeSources = useCallback(
    (ids: string[]) => {
      const byId = new Map<string, Card>();
      for (const id of ids) {
        const card =
          mergePickCards[id] ?? cards.find((c) => c.id === id) ?? null;
        if (card) byId.set(id, card);
      }
      return [...byId.values()];
    },
    [cards, mergePickCards],
  );

  const commitMovedCard = useCallback(
    (moved: Card, beforeCardId?: string | null) => {
      const currentTopicId = topicId ?? null;
      setCards((prev) =>
        applyMovedCard(prev, moved, currentTopicId, beforeCardId),
      );
      setMergePickCards((prev) =>
        prev[moved.id] ? { ...prev, [moved.id]: moved } : prev,
      );
      setDetail((prev) => (prev?.id === moved.id ? moved : prev));
    },
    [topicId],
  );

  const handleDrop = useCallback(
    async (event: DriveDropEvent) => {
      if (!event.moved || !event.over) return;
      const { payload, over } = event;

      try {
        if (payload.kind === 'card' && over.kind === 'folder' && over.id) {
          const moved = await cardsFacade.move(payload.id, {
            topicId: over.id,
            deckId: null,
          });
          toast.success('Card movido para a pasta');
          commitMovedCard(moved);
          return;
        }

        if (payload.kind === 'card' && over.kind === 'deck' && over.id) {
          const moved = await cardsFacade.move(payload.id, {
            topicId: topicId ?? null,
            deckId: over.id,
          });
          toast.success('Card movido para o deck');
          commitMovedCard(moved);
          return;
        }

        if (payload.kind === 'card' && over.kind === 'hall') {
          const moved = await cardsFacade.move(payload.id, {
            topicId: topicId ?? null,
            deckId: null,
          });
          toast.success('Card no Hall');
          commitMovedCard(moved);
          return;
        }

        if (payload.kind === 'card' && over.kind === 'card' && over.id) {
          if (payload.id === over.id) return;
          const target = cards.find((c) => c.id === over.id);
          if (!target) return;

          const orderedIds = cards
            .filter((c) => c.deckId === target.deckId)
            .sort((a, b) => a.position - b.position)
            .map((c) => c.id);

          const beforeCardId = beforeIdForReorder(
            orderedIds,
            payload.id,
            over.id,
          );
          if (beforeCardId === undefined) return;

          const moved = await cardsFacade.move(payload.id, {
            topicId: topicId ?? null,
            deckId: target.deckId,
            ...(beforeCardId ? { beforeCardId } : {}),
          });
          toast.success('Posição atualizada');
          commitMovedCard(moved, beforeCardId);
          return;
        }

        if (payload.kind === 'card' && over.kind === 'root') {
          const targetTopicId = isRoot ? null : parentId;
          const moved = await cardsFacade.move(payload.id, {
            topicId: targetTopicId,
            deckId: null,
          });
          toast.success(
            isRoot || !parentId
              ? 'Card na raiz do grupo'
              : 'Card movido para a pasta anterior',
          );
          commitMovedCard(moved);
          return;
        }

        if (payload.kind === 'folder' && over.kind === 'folder' && over.id) {
          if (payload.id === over.id) return;
          const edge = over.edge ?? 'into';

          if (edge === 'into') {
            await topicsFacade.update(payload.id, { parentId: over.id });
            toast.success('Pasta movida');
            await load({ silent: true });
            return;
          }

          const orderedIds = [...folders]
            .sort((a, b) => a.position - b.position)
            .map((f) => f.id);

          const beforeTopicId = beforeIdForReorder(
            orderedIds,
            payload.id,
            over.id,
          );
          if (beforeTopicId === undefined) return;

          await topicsFacade.move(payload.id, {
            ...(beforeTopicId ? { beforeTopicId } : {}),
          });
          toast.success('Pasta reordenada');
          await load({ silent: true });
          return;
        }

        if (payload.kind === 'folder' && over.kind === 'root') {
          await topicsFacade.update(payload.id, {
            parentId: isRoot ? null : parentId,
          });
          toast.success('Pasta movida');
          await load({ silent: true });
          return;
        }

        if (payload.kind === 'deck' && over.kind === 'deck' && over.id) {
          if (payload.id === over.id) return;

          const orderedIds = [...decks]
            .sort((a, b) => a.position - b.position)
            .map((d) => d.id);

          const beforeDeckId = beforeIdForReorder(
            orderedIds,
            payload.id,
            over.id,
          );
          if (beforeDeckId === undefined) return;

          const moved = await decksFacade.move(payload.id, {
            ...(beforeDeckId ? { beforeDeckId } : {}),
          });
          toast.success('Deck reordenado');
          setDecks((prev) => applyMovedDeck(prev, moved, beforeDeckId));
        }
      } catch (error) {
        toast.error(error);
      }
    },
    [cards, commitMovedCard, decks, isRoot, load, parentId, toast, topicId],
  );

  const handleCardTap = useCallback(
    (
      card: Card,
      mode: 'face' | 'list' = 'face',
      e?: { shiftKey?: boolean },
    ) => {
      const now = Date.now();
      const last = lastTapRef.current;
      const multiSelect = Boolean(e && e.shiftKey);

      // Desktop: Ctrl/Cmd/Shift+clique marca para síntese (2+)
      if (!touchUi && multiSelect) {
        toggleMergePick(card);
        return;
      }

      if (mode === 'list') {
        if (touchUi) {
          if (last && last.id === card.id && now - last.at <= DOUBLE_TAP_MS) {
            lastTapRef.current = null;
            toggleMergePick(card);
            return;
          }
          lastTapRef.current = { id: card.id, at: now };
          setRaisedId(card.id);
          return;
        }
        setDetail(card);
        return;
      }

      if (touchUi) {
        if (last && last.id === card.id && now - last.at <= DOUBLE_TAP_MS) {
          lastTapRef.current = null;
          toggleMergePick(card);
          return;
        }
        lastTapRef.current = { id: card.id, at: now };
        setRaisedId(card.id);
        setDetail(card);
        return;
      }

      setRaisedId(card.id);
      setDetail(card);
    },
    [toggleMergePick, touchUi],
  );

  const openMergeFromPicks = () => {
    const sources = resolveMergeSources(mergePickIds);
    if (sources.length < 2) {
      toast.error(
        new Error(
          touchUi
            ? 'Selecione pelo menos 2 cards (toque duplo ou de outros grupos).'
            : 'Selecione pelo menos 2 cards (Shift+clique, menu ou outros grupos).',
        ),
      );
      return;
    }
    openMergeComposer(sources);
  };

  const openCreateFolder = () => {
    setEditingFolder(null);
    setName('');
    setDescription('');
    setFolderColor(subject?.color || fallbackColor);
    setFolderOpen(true);
  };

  const openEditFolder = (node: TopicTreeNode) => {
    setEditingFolder(node);
    setName(node.name);
    setDescription(node.description ?? '');
    setFolderColor(node.color || subject?.color || fallbackColor);
    setFolderOpen(true);
  };

  const closeFolderModal = () => {
    setFolderOpen(false);
    setEditingFolder(null);
    setName('');
    setDescription('');
    setFolderColor(fallbackColor);
  };

  const saveFolder = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingFolder) {
        await topicsFacade.update(editingFolder.id, {
          name,
          description: description.trim() || null,
          color: folderColor,
        });
        toast.success('Pasta atualizada');
      } else {
        await topicsFacade.create({
          subjectId,
          parentId: topicId ?? null,
          name,
          description,
          color: folderColor,
        });
        toast.success('Pasta criada');
      }
      closeFolderModal();
      await load({ silent: true });
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const openCreateDeck = () => {
    setEditingDeck(null);
    setDeckNameInput('');
    setDeckColor(catalogColors[3]?.hex ?? fallbackColor);
    setDeckModalOpen(true);
  };

  const openEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setDeckNameInput(deck.name);
    setDeckColor(deck.color || catalogColors[3]?.hex || fallbackColor);
    setDeckModalOpen(true);
  };

  const closeDeckModal = () => {
    setDeckModalOpen(false);
    setEditingDeck(null);
    setDeckNameInput('');
    setDeckColor(catalogColors[3]?.hex ?? fallbackColor);
  };

  const saveDeck = async () => {
    if (!deckName.trim()) return;
    setSaving(true);
    try {
      if (editingDeck) {
        const updated = await decksFacade.update(editingDeck.id, {
          name: deckName,
          color: deckColor,
        });
        setDecks((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d)),
        );
        toast.success('Deck atualizado');
      } else {
        const deck = await decksFacade.create({
          subjectId,
          topicId: topicId ?? null,
          name: deckName,
          color: deckColor,
        });
        setDecks((prev) => [...prev, deck]);
        toast.success('Deck criado');
      }
      closeDeckModal();
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const removeDeck = async (id: string) => {
    try {
      await decksFacade.remove(id);
      toast.success('Deck excluído');
      setDecks((prev) => prev.filter((d) => d.id !== id));
      setCards((prev) =>
        prev.map((c) => (c.deckId === id ? { ...c, deckId: null } : c)),
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const openCreateCard = (deckId: string | null = null) => {
    setCreateDeckId(deckId);
    setCardOpen(true);
  };

  const closeCardComposer = () => {
    setCardOpen(false);
    setCreateDeckId(null);
  };

  const createCard = async () => {
    if (!front.trim()) return;
    const plain = documentToPlainText(docJson);
    const nextBack = back.trim() || plain.slice(0, 280) || front.trim();
    const targetDeckId = createDeckId;
    setSaving(true);
    try {
      const created = await cardsFacade.create({
        subjectId,
        topicId: topicId ?? null,
        deckId: targetDeckId,
        front,
        back: nextBack,
        document: docJson || null,
        levelId,
        icon,
        color,
        tag,
      });
      closeCardComposer();
      setFront('');
      setBack('');
      setDocJson('');
      setLevelId(levels.find((l) => l.slug === 'basic')?.id ?? levels[0]?.id ?? null);
      setIcon(null);
      setColor(CARD_ACCENT_COLORS[0]);
      setTag('Conceito');
      toast.success(
        targetDeckId ? 'Card criado no deck' : 'Card criado',
      );
      setCards((prev) => [...prev, created]);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const mergeCards = async () => {
    if (mergeSources.length < 2 || !front.trim()) return;
    const plain = documentToPlainText(docJson);
    const nextBack = back.trim() || plain.slice(0, 280);
    if (!nextBack) return;
    setSaving(true);
    try {
      const created = await cardsFacade.merge({
        subjectId,
        topicId: topicId ?? null,
        sourceCardIds: mergeSources.map((c) => c.id),
        front,
        back: nextBack,
        document: docJson || null,
        levelId,
        icon,
        color,
        tag: tag || 'Síntese',
      });
      setMergeOpen(false);
      setMergeSources([]);
      clearMergePicks();
      setFront('');
      setBack('');
      setDocJson('');
      setLevelId(levels.find((l) => l.slug === 'basic')?.id ?? levels[0]?.id ?? null);
      setIcon(null);
      setColor(CARD_ACCENT_COLORS[0]);
      setTag('Conceito');
      toast.success('Cards unidos');
      await load({ silent: true });
      setDetail(created);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const removeCard = (id: string) => {
    void (async () => {
      try {
        await cardsFacade.remove(id);
        setDetail(null);
        setMergePickIds((prev) => prev.filter((pickId) => pickId !== id));
        setMergePickCards((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setRaisedId((prev) => (prev === id ? null : prev));
        window.dispatchEvent(
          new CustomEvent('sc-card-deleted', { detail: { id } }),
        );
        toast.success('Card excluído');
        setCards((prev) => prev.filter((c) => c.id !== id));
      } catch (error) {
        toast.error(error);
      }
    })();
  };

  const openCardContextMenu = useCallback(
    (e: MouseEvent, card: Card) => {
      const picked = mergePickIds.includes(card.id);
      const selectionCount = picked
        ? mergePickIds.length
        : mergePickIds.length + 1;
      const items: ContextMenuItem[] = [
        {
          id: 'open',
          label: 'Abrir carta',
          icon: documentTextOutline,
          onSelect: () => setDetail(card),
        },
        {
          id: 'merge',
          label: picked ? 'Tirar da síntese' : 'Marcar para síntese',
          onSelect: () => toggleMergePick(card),
        },
      ];

      if (selectionCount >= 2) {
        items.push({
          id: 'merge-now',
          label: `Criar síntese (${selectionCount})`,
          onSelect: () => {
            const ids = picked
              ? mergePickIds
              : [...new Set([...mergePickIds, card.id])];
            if (!picked) upsertMergePick(card);
            const sources = resolveMergeSources(ids);
            if (sources.length >= 2) openMergeComposer(sources);
          },
        });
      }

      items.push({
        id: 'merge-browse',
        label: 'Buscar em outros grupos…',
        onSelect: () => {
          upsertMergePick(card);
          setMergePickerOpen(true);
        },
      });

      items.push({
        id: 'delete',
        label: 'Excluir carta',
        icon: trashOutline,
        danger: true,
        separator: true,
        onSelect: () => removeCard(card.id),
      });

      openCtx(e, items, card.front);
    },
    [
      mergePickIds,
      openCtx,
      openMergeComposer,
      resolveMergeSources,
      toggleMergePick,
      upsertMergePick,
    ],
  );

  const openFolderContextMenu = useCallback(
    (e: MouseEvent, node: TopicTreeNode) => {
      openCtx(
        e,
        [
          {
            id: 'open',
            label: 'Abrir pasta',
            icon: openOutline,
            onSelect: () => openFolder(node.id),
          },
          {
            id: 'rename',
            label: 'Renomear / editar',
            icon: pencilOutline,
            onSelect: () => openEditFolder(node),
          },
          {
            id: 'delete',
            label: 'Excluir pasta',
            icon: trashOutline,
            danger: true,
            separator: true,
            onSelect: () => setDeleteFolder(node),
          },
        ],
        node.name,
      );
    },
    [openCtx],
  );

  const openBlankContextMenu = useCallback(
    (e: MouseEvent) => {
      openCtx(
        e,
        [
          {
            id: 'card',
            label: 'Nova carta',
            icon: createOutline,
            onSelect: () => openCreateCard(null),
          },
          {
            id: 'folder',
            label: 'Nova pasta',
            icon: folderOutline,
            onSelect: openCreateFolder,
          },
          {
            id: 'merge-browse',
            label: 'Síntese de outros grupos…',
            onSelect: () => setMergePickerOpen(true),
          },
        ],
        folderName,
      );
    },
    [folderName, openCtx],
  );

  const openDeckContextMenu = useCallback(
    (e: MouseEvent, deck: Deck) => {
      e.preventDefault();
      e.stopPropagation();
      openCtx(
        e,
        [
          {
            id: 'card-in-deck',
            label: 'Nova carta neste deck',
            icon: createOutline,
            onSelect: () => openCreateCard(deck.id),
          },
          {
            id: 'edit-deck',
            label: 'Editar deck',
            icon: pencilOutline,
            onSelect: () => openEditDeck(deck),
          },
          {
            id: 'delete-deck',
            label: 'Excluir deck',
            icon: trashOutline,
            danger: true,
            separator: true,
            onSelect: () => void removeDeck(deck.id),
          },
        ],
        deck.name,
      );
    },
    [openCtx],
  );

  const confirmDeleteFolder = async () => {
    if (!deleteFolder) return;
    setDeletingFolder(true);
    try {
      await topicsFacade.remove(deleteFolder.id);
      setDeleteFolder(null);
      toast.success('Pasta excluída');
      if (topicId === deleteFolder.id) {
        history.replace(
          deleteFolder.parentId
            ? `/topics/${deleteFolder.parentId}?subjectId=${subjectId}`
            : `/subjects/${subjectId}`,
        );
        return;
      }
      await load({ silent: true });
    } catch (error) {
      toast.error(error);
    } finally {
      setDeletingFolder(false);
    }
  };

  const studyHref = isRoot
    ? `/study/${subjectId}?subjectId=${subjectId}&scope=subject`
    : `/study/${topicId}?subjectId=${subjectId}`;

  const reduce = useReducedMotion();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} />
          </IonButtons>
          <IonTitle>{folderName}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <DriveDndProvider onDrop={handleDrop}>
        <MotionShell className="sc-shell" onContextMenu={openBlankContextMenu}>
          <div className="sc-crumb">
            <button type="button" onClick={() => history.push('/home')}>
              Study Cards
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => history.push(`/subjects/${subjectId}`)}
            >
              {subject?.name ?? '…'}
            </button>
            {path.map((node) => (
              <span key={node.id} style={{ display: 'contents' }}>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => openFolder(node.id)}
                >
                  {node.name}
                </button>
              </span>
            ))}
          </div>

          <DriveTopBar
            query={query}
            onQuery={setQuery}
            view={view}
            onView={setView}
            onNewFolder={openCreateFolder}
            onNewCard={() => openCreateCard(null)}
            extra={
              <motion.button
                type="button"
                className="sc-btn"
                onClick={() => setMergePickerOpen(true)}
                whileTap={reduce ? undefined : tapScale}
              >
                Unir grupos
              </motion.button>
            }
          />

          <p className="sc-dnd-hint">
            {touchUi
              ? 'Toque para abrir · toque duplo / Shift para síntese · arraste cartas e decks para ordenar'
              : 'Clique para abrir · Shift+clique para síntese · arraste cartas e decks para ordenar'}
          </p>

          {!isRoot ? (
            <RootDroppable>
              <div className="sc-drop-root">
                Soltar um nível acima
                {parentId ? '' : ' (raiz do grupo)'}
              </div>
            </RootDroppable>
          ) : null}

          <div className="sc-section-label">Hall</div>
          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : view === 'grid' ? (
            <HallDroppable className="sc-hall-drop">
              <CardSortableContext ids={hallCardIds}>
                <div className="sc-hand" role="list" aria-label="Hall">
                  {filteredCards.map((card, index) => {
                    const raised = raisedId === card.id;
                    const picked = mergePickIds.includes(card.id);
                    return (
                      <SortableCard
                        key={card.id}
                        payload={{
                          kind: 'card',
                          id: card.id,
                          subjectId: card.subjectId,
                          topicId: card.topicId,
                          label: card.front,
                        }}
                        className={`sc-hand-slot${raised ? ' is-raised' : ''}${picked ? ' is-picked' : ''}`}
                        onClick={(e) => handleCardTap(card, 'face', e)}
                        onContextMenu={(e) => openCardContextMenu(e, card)}
                      >
                        <FaceCard
                          card={card}
                          selected={picked}
                          index={index}
                          style={
                            {
                              ['--card-i' as string]: index,
                            } as CSSProperties
                          }
                        />
                      </SortableCard>
                    );
                  })}
                  <motion.button
                    type="button"
                    className="sc-face-card sc-face-add is-simple"
                    onClick={() => openCreateCard(null)}
                    aria-label="Criar card"
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: filteredCards.length * 0.04 }}
                    whileTap={reduce ? undefined : tapScale}
                  >
                    <div
                      className="card-title"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Novo card
                    </div>
                    <div
                      className="card-face-icon"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      +
                    </div>
                  </motion.button>
                  {!filteredCards.length ? (
                    <div
                      className="sc-empty"
                      style={{ width: '100%', flexBasis: '100%' }}
                    >
                      Nenhuma carta no Hall. Crie com <strong>+ Card</strong> ou
                      solte um deck aqui.
                    </div>
                  ) : null}
                </div>
              </CardSortableContext>
            </HallDroppable>
          ) : (
            <HallDroppable className="sc-hall-drop">
              <CardSortableContext ids={hallCardIds} layout="vertical">
                <div className="sc-list-view">
                  {filteredCards.map((card) => {
                    const picked = mergePickIds.includes(card.id);
                    return (
                      <SortableCard
                        key={card.id}
                        payload={{
                          kind: 'card',
                          id: card.id,
                          subjectId: card.subjectId,
                          topicId: card.topicId,
                          label: card.front,
                        }}
                        onClick={(e) => handleCardTap(card, 'list', e)}
                        onContextMenu={(e) => openCardContextMenu(e, card)}
                      >
                        <DriveCardItem
                          card={card}
                          view="list"
                          selected={picked}
                        />
                      </SortableCard>
                    );
                  })}
                  {!filteredCards.length ? (
                    <div className="sc-empty">
                      Nenhuma carta no Hall. Use <strong>+ Card</strong>.
                    </div>
                  ) : null}
                </div>
              </CardSortableContext>
            </HallDroppable>
          )}

          {mergePickIds.length > 0 ? (
            <div className="sc-merge-bar">
              <div className="sc-merge-bar-copy">
                <strong>
                  {mergePickIds.length} selecionado
                  {mergePickIds.length === 1 ? '' : 's'}
                </strong>
                <span>
                  {mergePickIds.length < 2
                    ? touchUi
                      ? 'Toque duplo em outro card — ou busque outros grupos'
                      : 'Shift+clique em outro card — ou busque outros grupos'
                    : `Pronto para criar a síntese com ${mergePickIds.length} cards`}
                </span>
              </div>
              <div className="sc-merge-bar-actions">
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => setMergePickerOpen(true)}
                >
                  Outros grupos
                </button>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={clearMergePicks}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="sc-btn primary"
                  disabled={mergePickIds.length < 2}
                  onClick={openMergeFromPicks}
                >
                  Criar síntese
                </button>
              </div>
            </div>
          ) : null}

          <div className="sc-section-label">Pastas</div>
          {view === 'grid' ? (
            <FolderSortableContext ids={folderIds} layout="grid">
              <MotionStagger
                className="sc-grid"
                key={`folders-${filteredFolders.length}`}
              >
                {orderedFolders.map((node) => (
                  <SortableFolder
                    key={node.id}
                    payload={{
                      kind: 'folder',
                      id: node.id,
                      subjectId,
                      parentId: node.parentId,
                      label: node.name,
                    }}
                    onClick={() => openFolder(node.id)}
                    onContextMenu={(e) => openFolderContextMenu(e, node)}
                  >
                    <DriveFolderItem
                      name={node.name}
                      subtitle={node.description || 'Abrir pasta'}
                      color={node.color || subject?.color}
                      onClick={() => openFolder(node.id)}
                      onDelete={() => setDeleteFolder(node)}
                      onContextMenu={(e) => openFolderContextMenu(e, node)}
                    />
                  </SortableFolder>
                ))}
                <DriveFolderItem
                  name="Nova pasta"
                  dashed
                  onClick={openCreateFolder}
                />
              </MotionStagger>
            </FolderSortableContext>
          ) : (
            <FolderSortableContext ids={folderIds} layout="list">
              <MotionStagger
                className="sc-list-view"
                key={`folders-list-${filteredFolders.length}`}
              >
                {orderedFolders.map((node, i) => (
                  <SortableFolder
                    key={node.id}
                    payload={{
                      kind: 'folder',
                      id: node.id,
                      subjectId,
                      parentId: node.parentId,
                      label: node.name,
                    }}
                    onClick={() => openFolder(node.id)}
                    onContextMenu={(e) => openFolderContextMenu(e, node)}
                  >
                    <div
                      className="sc-list-row-wrap"
                      onContextMenu={(e) => openFolderContextMenu(e, node)}
                    >
                      <motion.div
                        className="sc-list-row"
                        initial={reduce ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileTap={reduce ? undefined : tapScale}
                      >
                        <span className="list-icon">📁</span>
                        <span className="list-name">{node.name}</span>
                        <span className="list-tag">Pasta</span>
                        <span
                          className="list-links"
                          title={node.description || undefined}
                        >
                          {node.description || '—'}
                        </span>
                      </motion.div>
                      <button
                        type="button"
                        className="sc-list-delete"
                        aria-label={`Excluir ${node.name}`}
                        title="Excluir"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFolder(node);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </SortableFolder>
                ))}
                {!filteredFolders.length ? (
                  <div className="sc-empty">Nenhuma pasta aqui.</div>
                ) : null}
              </MotionStagger>
            </FolderSortableContext>
          )}

          <div className="sc-section-label">Cards</div>
          <div className="sc-decks">
            <DeckSortableContext ids={deckIds}>
              {orderedDecks.map((deck) => {
                const deckCards = cardsByDeck.get(deck.id) ?? [];
                const deckCardIds = deckCards.map((c) => c.id);
                return (
                  <SortableDeck
                    key={deck.id}
                    className="sc-deck"
                    payload={{
                      kind: 'deck',
                      id: deck.id,
                      subjectId: deck.subjectId,
                      topicId: deck.topicId,
                      label: deck.name,
                    }}
                    style={
                      {
                        borderColor: deck.color,
                        ['--deck-accent' as string]: deck.color,
                      } as CSSProperties
                    }
                    onContextMenu={(e) => openDeckContextMenu(e, deck)}
                  >
                    <div className="sc-deck-top">
                      <span
                        className="sc-deck-dot"
                        style={{ background: deck.color }}
                        aria-hidden
                      />
                      <strong>{deck.name}</strong>
                      <span className="sc-deck-count">
                        {deckCards.length} carta
                        {deckCards.length === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        className="sc-deck-edit"
                        aria-label={`Editar deck ${deck.name}`}
                        title="Editar"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDeck(deck);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="sc-deck-x"
                        aria-label={`Excluir deck ${deck.name}`}
                        title="Excluir deck"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeDeck(deck.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <CardSortableContext ids={deckCardIds}>
                      <div className="sc-deck-hand" role="list">
                        {deckCards.map((card, index) => {
                          const picked = mergePickIds.includes(card.id);
                          return (
                            <SortableCard
                              key={card.id}
                              payload={{
                                kind: 'card',
                                id: card.id,
                                subjectId: card.subjectId,
                                topicId: card.topicId,
                                label: card.front,
                              }}
                              className={`sc-hand-slot is-deck${picked ? ' is-picked' : ''}`}
                              style={
                                {
                                  ['--slot-i' as string]: index,
                                } as CSSProperties
                              }
                              onClick={(e) => handleCardTap(card, 'face', e)}
                              onContextMenu={(e) =>
                                openCardContextMenu(e, card)
                              }
                            >
                              <FaceCard
                                card={card}
                                selected={picked}
                                index={index}
                                inDeck
                                style={
                                  {
                                    ['--card-i' as string]: index,
                                  } as CSSProperties
                                }
                              />
                            </SortableCard>
                          );
                        })}
                        {!deckCards.length ? (
                          <div className="sc-deck-empty">
                            Arraste cartas do Hall para este deck
                          </div>
                        ) : null}
                      </div>
                    </CardSortableContext>
                  </SortableDeck>
                );
              })}
            </DeckSortableContext>
            <button
              type="button"
              className="sc-deck is-new"
              onClick={openCreateDeck}
            >
              + Novo deck
            </button>
            {!decks.length ? (
              <div className="sc-empty" style={{ flexBasis: '100%' }}>
                Organize cartas em decks. Arraste do Hall para um deck.
              </div>
            ) : null}
          </div>

          <div className="sc-bottom">
            <span>
              {hallCards.length} no Hall · {decks.length} decks ·{' '}
              {folders.length} pastas
            </span>
            <motion.button
              type="button"
              className="sc-btn"
              onClick={() => history.push(studyHref)}
              whileTap={reduce ? undefined : tapScale}
            >
              Estudar ↗
            </motion.button>
          </div>
        </MotionShell>
        </DriveDndProvider>
      </IonContent>

      <IonModal
        isOpen={deckModalOpen}
        onDidDismiss={closeDeckModal}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{editingDeck ? 'Editar deck' : 'Novo deck'}</IonTitle>
            <IonButtons slot="end">
              <button
                type="button"
                className="sc-modal-x"
                aria-label="Fechar"
                onClick={closeDeckModal}
              >
                ×
              </button>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <div className="sc-auth-fields">
            <Field
              label="Nome"
              value={deckName}
              onChange={setDeckNameInput}
              autoFocus
            />
          </div>
          <p
            style={{
              margin: '12px 0 6px',
              fontSize: 13,
              color: 'var(--text-muted)',
            }}
          >
            Cor da borda
          </p>
          <CatalogColorPicker
            colors={catalogColors}
            loading={catalogColorsLoading}
            value={deckColor}
            onChange={setDeckColor}
            style={{ padding: '4px 0 16px' }}
          />
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 4 }}
            disabled={saving || !deckName.trim()}
            onClick={() => void saveDeck()}
          >
            {saving
              ? 'Salvando…'
              : editingDeck
                ? 'Salvar'
                : 'Criar deck'}
          </button>
        </IonContent>
      </IonModal>

      <IonModal isOpen={folderOpen} onDidDismiss={closeFolderModal}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              {editingFolder ? 'Editar pasta' : 'Nova pasta'}
            </IonTitle>
            <IonButtons slot="end">
              <button
                type="button"
                className="sc-modal-x"
                aria-label="Fechar"
                onClick={closeFolderModal}
              >
                ×
              </button>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <div className="sc-auth-fields">
            <Field label="Nome" value={name} onChange={setName} autoFocus />
            <TextArea
              label="Descrição"
              value={description}
              onChange={setDescription}
            />
          </div>
          <CatalogColorPicker
            colors={catalogColors}
            loading={catalogColorsLoading}
            value={folderColor}
            onChange={setFolderColor}
            style={{ padding: '8px 0 16px' }}
          />
          <button
            type="button"
            className="sc-btn primary"
            disabled={saving || !name.trim()}
            onClick={() => void saveFolder()}
          >
            {saving
              ? 'Salvando…'
              : editingFolder
                ? 'Salvar alterações'
                : 'Criar pasta'}
          </button>
        </IonContent>
      </IonModal>

      <FaceCardComposer
        open={cardOpen}
        title={
          createDeckId
            ? `Nova carta · ${decks.find((d) => d.id === createDeckId)?.name ?? 'Deck'}`
            : undefined
        }
        front={front}
        back={back}
        docJson={docJson}
        tag={tag}
        levelId={levelId}
        levels={levels}
        levelsLoading={levelsLoading}
        icon={icon}
        color={color}
        saving={saving}
        onFront={setFront}
        onBack={setBack}
        onDocJson={setDocJson}
        onTag={setTag}
        onLevelId={setLevelId}
        onIcon={setIcon}
        onColor={setColor}
        onClose={closeCardComposer}
        onSubmit={() => void createCard()}
      />

      <FaceCardComposer
        open={mergeOpen}
        title="Síntese"
        submitLabel="Criar síntese"
        sourceCards={mergeSources.map((c) => ({ id: c.id, front: c.front }))}
        front={front}
        back={back}
        docJson={docJson}
        tag={tag || 'Síntese'}
        levelId={levelId}
        levels={levels}
        levelsLoading={levelsLoading}
        icon={icon}
        color={color}
        saving={saving}
        onFront={setFront}
        onBack={setBack}
        onDocJson={setDocJson}
        onTag={setTag}
        onLevelId={setLevelId}
        onIcon={setIcon}
        onColor={setColor}
        onClose={() => {
          setMergeOpen(false);
          setMergeSources([]);
          setDocJson('');
        }}
        onSubmit={() => void mergeCards()}
      />

      <CardDocumentSheet
        card={detail}
        onClose={() => {
          setDetail(null);
          setRaisedId(null);
        }}
        onChanged={(updated) => {
          setDetail(updated);
          setCards((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
          setMergePickCards((prev) =>
            prev[updated.id] ? { ...prev, [updated.id]: updated } : prev,
          );
        }}
        onDelete={removeCard}
        onOpenLinked={(linkedCard) => {
          setDetail(linkedCard);
          setRaisedId(linkedCard.id);
        }}
      />

      <MergeSourcePicker
        open={mergePickerOpen}
        currentSubjectId={subjectId}
        alreadyPickedIds={mergePickIds}
        onClose={() => setMergePickerOpen(false)}
        onConfirm={(picked) => {
          for (const card of picked) upsertMergePick(card);
          setMergePickerOpen(false);
          toast.success(
            picked.length === 1
              ? '1 card adicionado à síntese'
              : `${picked.length} cards adicionados à síntese`,
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteFolder)}
        title="Excluir pasta?"
        message={`A pasta “${deleteFolder?.name ?? ''}” e o conteúdo interno serão removidos. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir pasta"
        confirming={deletingFolder}
        onCancel={() => setDeleteFolder(null)}
        onConfirm={() => void confirmDeleteFolder()}
      />

      <ContextMenu menu={ctxMenu} onClose={closeCtx} />
    </IonPage>
  );
}
