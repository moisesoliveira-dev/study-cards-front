import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
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
  useIonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { subjectsFacade } from '../../modules/subjects/facades/subjects.facade';
import { topicsFacade } from '../../modules/topics/facades/topics.facade';
import { cardsFacade } from '../../modules/cards/facades/cards.facade';
import type { Subject } from '../../modules/subjects/types/subject.types';
import type { TopicTreeNode } from '../../modules/topics/types/topic.types';
import type { Card } from '../../modules/cards/types/card.types';
import { statusClass, statusLabel } from '../../modules/cards/types/card.types';
import { DriveTopBar } from '../components/DriveTopBar';
import { DriveFolderItem } from '../components/DriveFolderItem';
import { Field, TextArea } from '../components/Field';
import { DriveCardItem, FaceCard } from '../components/DriveCardItem';
import { FaceCardComposer } from '../components/FaceCardComposer';
import { DragItem, DropZone, useDriveDrop } from '../dnd/DragDrop';
import { useAppToast } from '../hooks/useAppToast';

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
  const [presentAlert] = useIonAlert();

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
  const [cardOpen, setCardOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSources, setMergeSources] = useState<Card[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Card | null>(null);

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

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((n) => n.name.toLowerCase().includes(q));
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
          setMergeSources([a, b]);
          setFront(`${a.front} + ${b.front}`);
          setBack(`• ${a.front}: ${a.back}\n• ${b.front}: ${b.back}`);
          setHint('');
          setTag('Síntese');
          setMergeOpen(true);
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
    [cards, isRoot, load, parentId, toast],
  );

  useDriveDrop(handleDrop);

  const createFolder = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await topicsFacade.create({
        subjectId,
        parentId: topicId ?? null,
        name,
        description,
      });
      setFolderOpen(false);
      setName('');
      setDescription('');
      toast.success('Pasta criada');
      await load();
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const createCard = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      await cardsFacade.create({
        subjectId,
        topicId: topicId ?? null,
        front,
        back,
        hint,
        tag,
      });
      setCardOpen(false);
      setFront('');
      setBack('');
      setHint('');
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
    if (mergeSources.length < 2 || !front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      const created = await cardsFacade.merge({
        subjectId,
        topicId: topicId ?? null,
        sourceCardIds: mergeSources.map((c) => c.id),
        front,
        back,
        hint,
        tag: tag || 'Síntese',
      });
      setMergeOpen(false);
      setMergeSources([]);
      setFront('');
      setBack('');
      setHint('');
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
    presentAlert({
      header: 'Excluir card?',
      message: 'Essa ação não pode ser desfeita.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            void (async () => {
              try {
                await cardsFacade.remove(id);
                setDetail(null);
                toast.success('Card excluído');
                await load();
              } catch (error) {
                toast.error(error);
              }
            })();
          },
        },
      ],
    });
  };

  const updateStatus = async (status: Card['status']) => {
    if (!detail) return;
    try {
      const updated = await cardsFacade.update(detail.id, { status });
      setDetail(updated);
      toast.success('Status atualizado');
      await load();
    } catch (error) {
      toast.error(error);
    }
  };

  const studyHref = isRoot
    ? `/study/${subjectId}?subjectId=${subjectId}&scope=subject&filter=REVIEW`
    : `/study/${topicId}?subjectId=${subjectId}&filter=REVIEW`;

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
        <div className="sc-shell">
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
            onNewFolder={() => setFolderOpen(true)}
            onNewCard={() => setCardOpen(true)}
          />

          <p className="sc-dnd-hint">
            Arraste card sobre card para unir · card sobre pasta para mover ·
            pasta sobre pasta para aninhar
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
              {filteredCards.map((card, index) => (
                <DropZone
                  key={card.id}
                  target={{ kind: 'card', id: card.id }}
                  className="sc-hand-slot"
                >
                  <DragItem
                    payload={{
                      kind: 'card',
                      id: card.id,
                      subjectId: card.subjectId,
                      topicId: card.topicId,
                      label: card.front,
                    }}
                    onClick={() => setDetail(card)}
                  >
                    <FaceCard
                      card={card}
                      style={{ ['--card-i' as string]: index } as CSSProperties}
                    />
                  </DragItem>
                </DropZone>
              ))}
              <button
                type="button"
                className="sc-face-card sc-face-add"
                onClick={() => setCardOpen(true)}
                aria-label="Criar card"
              >
                <div className="card-suit" style={{ color: 'var(--text-muted)' }}>
                  Novo
                </div>
                <div className="card-title" style={{ color: 'var(--text-muted)' }}>
                  + Criar card
                </div>
                <div className="card-body">
                  Conceito na frente, explicação no verso.
                </div>
              </button>
              {!filteredCards.length ? (
                <div className="sc-empty" style={{ width: '100%', flexBasis: '100%' }}>
                  Nenhum card aqui. Use <strong>+ Card</strong> ou o slot pontilhado.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="sc-list-view">
              {filteredCards.map((card) => (
                <DropZone key={card.id} target={{ kind: 'card', id: card.id }}>
                  <DragItem
                    payload={{
                      kind: 'card',
                      id: card.id,
                      subjectId: card.subjectId,
                      topicId: card.topicId,
                      label: card.front,
                    }}
                    onClick={() => setDetail(card)}
                  >
                    <DriveCardItem card={card} view="list" />
                  </DragItem>
                </DropZone>
              ))}
              {!filteredCards.length ? (
                <div className="sc-empty">
                  Nenhum card aqui. Use <strong>+ Card</strong>.
                </div>
              ) : null}
            </div>
          )}

          <div className="sc-section-label">Pastas</div>
          <div className="sc-grid">
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
                >
                  <DriveFolderItem
                    name={node.name}
                    subtitle={`${node.children.length} sub · abrir`}
                    color={subject?.color}
                  />
                </DragItem>
              </DropZone>
            ))}
            <DriveFolderItem
              name="Nova pasta"
              dashed
              onClick={() => setFolderOpen(true)}
            />
          </div>

          <div className="sc-bottom">
            <span>
              {cards.length} cards · {folders.length} pastas
            </span>
            <button
              type="button"
              className="sc-btn"
              onClick={() => history.push(studyHref)}
            >
              Revisar pendentes ↗
            </button>
          </div>
        </div>
      </IonContent>

      <IonModal isOpen={folderOpen} onDidDismiss={() => setFolderOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Nova pasta</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setFolderOpen(false)}>Fechar</IonButton>
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
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 16 }}
            disabled={saving || !name.trim()}
            onClick={() => void createFolder()}
          >
            Criar
          </button>
        </IonContent>
      </IonModal>

      <IonModal
        isOpen={cardOpen}
        onDidDismiss={() => setCardOpen(false)}
        className="sc-card-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Nova carta</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setCardOpen(false)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="sc-card-modal-content">
          <div className="sc-card-modal-stage">
            <p className="sc-card-modal-hint">
              Preencha como se estivesse virando a carta na mesa.
            </p>
            <FaceCardComposer
              front={front}
              back={back}
              tag={tag}
              hint={hint}
              onFront={setFront}
              onBack={setBack}
              onTag={setTag}
              onHint={setHint}
            />
            <button
              type="button"
              className="sc-btn primary sc-card-modal-submit"
              disabled={saving || !front.trim() || !back.trim()}
              onClick={() => void createCard()}
            >
              {saving ? 'Criando…' : 'Colocar na mesa'}
            </button>
          </div>
        </IonContent>
      </IonModal>

      <IonModal
        isOpen={mergeOpen}
        onDidDismiss={() => {
          setMergeOpen(false);
          setMergeSources([]);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Unir cards</IonTitle>
            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  setMergeOpen(false);
                  setMergeSources([]);
                }}
              >
                Fechar
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
            {mergeSources.length} cards serão ligados a este novo conceito.
          </p>
          <div className="sc-auth-fields">
            <Field
              label="Novo conceito"
              value={front}
              onChange={setFront}
              autoFocus
            />
            <TextArea
              label="Síntese / explicação"
              value={back}
              onChange={setBack}
            />
            <Field label="Tag" value={tag} onChange={setTag} />
            <Field label="Dica" value={hint} onChange={setHint} />
          </div>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 16 }}
            disabled={saving || !front.trim() || !back.trim()}
            onClick={() => void mergeCards()}
          >
            Criar conceito unido
          </button>
        </IonContent>
      </IonModal>

      <IonModal isOpen={Boolean(detail)} onDidDismiss={() => setDetail(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{detail?.front ?? 'Card'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setDetail(null)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {detail ? (
            <div className="sc-detail">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`card-status ${statusClass(detail.status)}`}>
                  {statusLabel(detail.status)}
                </span>
                <span className="thumb-tag">{detail.tag}</span>
              </div>
              <div className="sc-detail-block">
                <h4>Explicação</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{detail.back}</p>
              </div>
              {detail.hint ? (
                <div className="sc-detail-block">
                  <h4>Dica</h4>
                  <p>{detail.hint}</p>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => void updateStatus('KNOWN')}
                >
                  Marcar sabido
                </button>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => void updateStatus('REVIEW')}
                >
                  Marcar revisar
                </button>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => removeCard(detail.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ) : null}
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
