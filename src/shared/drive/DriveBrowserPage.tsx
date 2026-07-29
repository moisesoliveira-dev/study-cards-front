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
import { cardsFacade } from '../../modules/cards/facades/cards.facade';
import { cardLevelsFacade } from '../../modules/cards/facades/card-levels.facade';
import type { CardLevel } from '../../modules/cards/types/card-level.types';
import type { Subject } from '../../modules/subjects/types/subject.types';
import type { TopicTreeNode } from '../../modules/topics/types/topic.types';
import type { Card } from '../../modules/cards/types/card.types';
import { CARD_ACCENT_COLORS } from '../../modules/cards/types/card.types';
import { DriveTopBar } from '../components/DriveTopBar';
import { DriveFolderItem } from '../components/DriveFolderItem';
import { Field, TextArea } from '../components/Field';
import { DriveCardItem, FaceCard } from '../components/DriveCardItem';
import { FaceCardComposer } from '../components/FaceCardComposer';
import { CardDocumentSheet } from '../components/CardDocumentSheet';
import { documentToPlainText } from '../components/DocumentEditor';
import { DragItem, DropZone, useDriveDrop } from '../dnd/DragDrop';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  ContextMenu,
  useContextMenu,
  type ContextMenuItem,
} from '../components/ContextMenu';
import { useAppToast } from '../hooks/useAppToast';
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
const FOLDER_COLORS = [
  '#BA7517',
  '#378ADD',
  '#1D9E75',
  '#7F77DD',
  '#D4537E',
  '#888780',
];

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

type Props = {
  subjectId: string;
  /** Se omitido, estamos na raiz do grupo (assunto). */
  topicId?: string;
};

export default function DriveBrowserPage({ subjectId, topicId }: Props) {
  const history = useHistory();
  const toast = useAppToast();
  const touchUi = useTouchUi();
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [folders, setFolders] = useState<TopicTreeNode[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [folderName, setFolderName] = useState('Grupo');
  const [parentId, setParentId] = useState<string | null>(null);
  const [path, setPath] = useState<TopicTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [folderOpen, setFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<TopicTreeNode | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSources, setMergeSources] = useState<Card[]>([]);
  const [raisedId, setRaisedId] = useState<string | null>(null);
  const [mergePickIds, setMergePickIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);
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

  const load = useCallback(async () => {
    setLoading(true);
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
        setCards(await cardsFacade.listRootBySubject(subjectId));
      } else {
        const node = findNode(t, topicId);
        const trail = buildPath(t, topicId) ?? [];
        setFolders(node?.children ?? []);
        setFolderName(node?.name ?? 'Pasta');
        setParentId(node?.parentId ?? null);
        setPath(trail);
        setCards(await cardsFacade.listByTopic(topicId));
      }
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
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

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        (n.description ?? '').toLowerCase().includes(q),
    );
  }, [folders, query]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q),
    );
  }, [cards, query]);

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

  const handleDrop = useCallback(
    async (event: {
      payload: {
        kind: string;
        id: string;
      };
      over: { kind: string; id?: string } | null;
      moved: boolean;
    }) => {
      if (!event.moved || !event.over) return;
      const { payload, over } = event;

      try {
        if (payload.kind === 'card' && over.kind === 'folder' && over.id) {
          await cardsFacade.move(payload.id, over.id);
          toast.success('Card movido para a pasta');
          await load();
          return;
        }

        if (payload.kind === 'card' && over.kind === 'card' && over.id) {
          if (payload.id === over.id) return;
          const a = cards.find((c) => c.id === payload.id);
          const b = cards.find((c) => c.id === over.id);
          if (!a || !b) return;

          // Une seleção atual + as duas do arraste (permite 3+)
          const picked = mergePickIds
            .map((id) => cards.find((c) => c.id === id))
            .filter((c): c is Card => Boolean(c));
          const byId = new Map<string, Card>();
          for (const c of [...picked, a, b]) byId.set(c.id, c);
          const sources = [...byId.values()];
          openMergeComposer(sources);
          return;
        }

        if (payload.kind === 'card' && over.kind === 'root') {
          const targetTopicId = isRoot ? null : parentId;
          await cardsFacade.move(payload.id, targetTopicId);
          toast.success(
            isRoot || !parentId
              ? 'Card na raiz do grupo'
              : 'Card movido para a pasta anterior',
          );
          await load();
          return;
        }

        if (payload.kind === 'folder' && over.kind === 'folder' && over.id) {
          if (payload.id === over.id) return;
          await topicsFacade.update(payload.id, { parentId: over.id });
          toast.success('Pasta movida');
          await load();
          return;
        }

        if (payload.kind === 'folder' && over.kind === 'root') {
          await topicsFacade.update(payload.id, {
            parentId: isRoot ? null : parentId,
          });
          toast.success('Pasta movida');
          await load();
        }
      } catch (error) {
        toast.error(error);
      }
    },
    [
      cards,
      isRoot,
      load,
      mergePickIds,
      openMergeComposer,
      parentId,
      toast,
    ],
  );

  useDriveDrop(handleDrop);

  const toggleMergePick = useCallback((card: Card) => {
    setMergePickIds((prev) => {
      if (prev.includes(card.id)) {
        return prev.filter((id) => id !== card.id);
      }
      return [...prev, card.id];
    });
    setRaisedId(card.id);
  }, []);

  const handleCardTap = useCallback(
    (card: Card, mode: 'face' | 'list' = 'face', e?: PointerEvent) => {
      const now = Date.now();
      const last = lastTapRef.current;
      const multiSelect = Boolean(e && (e.ctrlKey || e.metaKey || e.shiftKey));

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
    const sources = mergePickIds
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is Card => Boolean(c));
    if (sources.length < 2) {
      toast.error(
        new Error(
          touchUi
            ? 'Selecione pelo menos 2 cards (toque duplo).'
            : 'Selecione pelo menos 2 cards (Ctrl+clique ou menu).',
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
    setFolderColor(subject?.color || FOLDER_COLORS[0]);
    setFolderOpen(true);
  };

  const openEditFolder = (node: TopicTreeNode) => {
    setEditingFolder(node);
    setName(node.name);
    setDescription(node.description ?? '');
    setFolderColor(node.color || subject?.color || FOLDER_COLORS[0]);
    setFolderOpen(true);
  };

  const closeFolderModal = () => {
    setFolderOpen(false);
    setEditingFolder(null);
    setName('');
    setDescription('');
    setFolderColor(FOLDER_COLORS[0]);
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
      await load();
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const createCard = async () => {
    if (!front.trim()) return;
    const plain = documentToPlainText(docJson);
    const nextBack = back.trim() || plain.slice(0, 280) || front.trim();
    setSaving(true);
    try {
      await cardsFacade.create({
        subjectId,
        topicId: topicId ?? null,
        front,
        back: nextBack,
        document: docJson || null,
        levelId,
        icon,
        color,
        tag,
      });
      setCardOpen(false);
      setFront('');
      setBack('');
      setDocJson('');
      setLevelId(levels.find((l) => l.slug === 'basic')?.id ?? levels[0]?.id ?? null);
      setIcon(null);
      setColor(CARD_ACCENT_COLORS[0]);
      setTag('Conceito');
      toast.success('Card criado');
      await load();
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
      setMergePickIds([]);
      setRaisedId(null);
      setFront('');
      setBack('');
      setDocJson('');
      setLevelId(levels.find((l) => l.slug === 'basic')?.id ?? levels[0]?.id ?? null);
      setIcon(null);
      setColor(CARD_ACCENT_COLORS[0]);
      setTag('Conceito');
      toast.success('Cards unidos');
      await load();
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
        setRaisedId((prev) => (prev === id ? null : prev));
        window.dispatchEvent(
          new CustomEvent('sc-card-deleted', { detail: { id } }),
        );
        toast.success('Card excluído');
        await load();
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
            const sources = ids
              .map((id) => cards.find((c) => c.id === id))
              .filter((c): c is Card => Boolean(c));
            if (sources.length >= 2) openMergeComposer(sources);
          },
        });
      }

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
    [cards, mergePickIds, openCtx, openMergeComposer, toggleMergePick],
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
            onSelect: () => setCardOpen(true),
          },
          {
            id: 'folder',
            label: 'Nova pasta',
            icon: folderOutline,
            onSelect: openCreateFolder,
          },
        ],
        folderName,
      );
    },
    [folderName, openCtx],
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
      await load();
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
            onNewCard={() => setCardOpen(true)}
          />

          <p className="sc-dnd-hint">
            {touchUi
              ? 'Toque para abrir · toque duplo para marcar síntese (2+) · segure para opções'
              : 'Clique para abrir · Ctrl+clique para marcar síntese (2+) · arraste card sobre card para unir'}
          </p>

          {!isRoot ? (
            <DropZone target={{ kind: 'root' }}>
              <div className="sc-drop-root">
                Soltar um nível acima
                {parentId ? '' : ' (raiz do grupo)'}
              </div>
            </DropZone>
          ) : null}

          <div className="sc-section-label">Cards</div>
          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : view === 'grid' ? (
            <div className="sc-hand" role="list" aria-label="Cards">
              {filteredCards.map((card, index) => {
                const raised = raisedId === card.id;
                const picked = mergePickIds.includes(card.id);
                return (
                  <DropZone
                    key={card.id}
                    target={{ kind: 'card', id: card.id }}
                    className={`sc-hand-slot${raised ? ' is-raised' : ''}${picked ? ' is-picked' : ''}`}
                  >
                    <DragItem
                      payload={{
                        kind: 'card',
                        id: card.id,
                        subjectId: card.subjectId,
                        topicId: card.topicId,
                        label: card.front,
                      }}
                      onClick={(e) => handleCardTap(card, 'face', e)}
                      onLongPress={
                        touchUi ? () => setDetail(card) : undefined
                      }
                      onContextMenu={(e) => openCardContextMenu(e, card)}
                    >
                      <FaceCard
                        card={card}
                        selected={picked}
                        index={index}
                        style={{ ['--card-i' as string]: index } as CSSProperties}
                      />
                    </DragItem>
                  </DropZone>
                );
              })}
              <motion.button
                type="button"
                className="sc-face-card sc-face-add is-simple"
                onClick={() => setCardOpen(true)}
                aria-label="Criar card"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: filteredCards.length * 0.04 }}
                whileTap={reduce ? undefined : tapScale}
              >
                <div className="card-title" style={{ color: 'var(--text-muted)' }}>
                  Novo card
                </div>
                <div className="card-face-icon" style={{ color: 'var(--text-muted)' }}>
                  +
                </div>
              </motion.button>
              {!filteredCards.length ? (
                <div className="sc-empty" style={{ width: '100%', flexBasis: '100%' }}>
                  Nenhum card aqui. Use <strong>+ Card</strong> ou o slot pontilhado.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="sc-list-view">
              {filteredCards.map((card) => {
                const picked = mergePickIds.includes(card.id);
                return (
                  <DropZone key={card.id} target={{ kind: 'card', id: card.id }}>
                    <DragItem
                      payload={{
                        kind: 'card',
                        id: card.id,
                        subjectId: card.subjectId,
                        topicId: card.topicId,
                        label: card.front,
                      }}
                      onClick={(e) => handleCardTap(card, 'list', e)}
                      onLongPress={
                        touchUi ? () => setDetail(card) : undefined
                      }
                      onContextMenu={(e) => openCardContextMenu(e, card)}
                    >
                      <DriveCardItem
                        card={card}
                        view="list"
                        selected={picked}
                      />
                    </DragItem>
                  </DropZone>
                );
              })}
              {!filteredCards.length ? (
                <div className="sc-empty">
                  Nenhum card aqui. Use <strong>+ Card</strong>.
                </div>
              ) : null}
            </div>
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
                      ? 'Toque duplo em outro card para unir'
                      : 'Ctrl+clique em outro card para unir'
                    : `Pronto para criar a síntese com ${mergePickIds.length} cards`}
                </span>
              </div>
              <div className="sc-merge-bar-actions">
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => {
                    setMergePickIds([]);
                    setRaisedId(null);
                  }}
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
            <MotionStagger className="sc-grid" key={`folders-${filteredFolders.length}`}>
              {filteredFolders.map((node) => (
                <DropZone key={node.id} target={{ kind: 'folder', id: node.id }}>
                  <DragItem
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
                  </DragItem>
                </DropZone>
              ))}
              <DriveFolderItem
                name="Nova pasta"
                dashed
                onClick={openCreateFolder}
              />
            </MotionStagger>
          ) : (
            <MotionStagger
              className="sc-list-view"
              key={`folders-list-${filteredFolders.length}`}
            >
              {filteredFolders.map((node, i) => (
                <DropZone key={node.id} target={{ kind: 'folder', id: node.id }}>
                  <div
                    className="sc-list-row-wrap"
                    onContextMenu={(e) => openFolderContextMenu(e, node)}
                  >
                    <DragItem
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
                    </DragItem>
                    <button
                      type="button"
                      className="sc-list-delete"
                      aria-label={`Excluir ${node.name}`}
                      title="Excluir"
                      onClick={() => setDeleteFolder(node)}
                    >
                      ×
                    </button>
                  </div>
                </DropZone>
              ))}
              {!filteredFolders.length ? (
                <div className="sc-empty">Nenhuma pasta aqui.</div>
              ) : null}
            </MotionStagger>
          )}

          <div className="sc-bottom">
            <span>
              {cards.length} cards · {folders.length} pastas
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
      </IonContent>

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
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 0 16px',
              flexWrap: 'wrap',
            }}
          >
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setFolderColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border:
                    folderColor === c
                      ? '2px solid #1a1917'
                      : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
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
        onClose={() => setCardOpen(false)}
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
          void load();
        }}
        onDelete={removeCard}
        onOpenLinked={(linkedCard) => {
          setDetail(linkedCard);
          setRaisedId(linkedCard.id);
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
