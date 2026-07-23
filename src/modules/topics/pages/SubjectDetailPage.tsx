import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useHistory, useParams } from 'react-router-dom';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import { topicsFacade } from '../facades/topics.facade';
import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Subject } from '../../subjects/types/subject.types';
import type { TopicTreeNode } from '../types/topic.types';
import type { Card } from '../../cards/types/card.types';
import { DriveTopBar } from '../../../shared/components/DriveTopBar';
import { DriveFolderItem } from '../../../shared/components/DriveFolderItem';
import { Field, TextArea } from '../../../shared/components/Field';
import { DriveCardItem } from '../../../shared/components/DriveCardItem';
import { DragItem, DropZone, useDriveDrop } from '../../../shared/dnd/DragDrop';
import { useAppToast } from '../../../shared/hooks/useAppToast';

function flattenTopics(nodes: TopicTreeNode[]): TopicTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTopics(n.children)]);
}

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const history = useHistory();
  const toast = useAppToast();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tree, setTree] = useState<TopicTreeNode[]>([]);
  const [looseCards, setLooseCards] = useState<Card[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, rootCards] = await Promise.all([
        subjectsFacade.get(subjectId),
        topicsFacade.tree(subjectId),
        cardsFacade.listRootBySubject(subjectId),
      ]);
      setSubject(s);
      setTree(t);
      setLooseCards(rootCards);
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const folders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;
    return tree.filter((n) => n.name.toLowerCase().includes(q));
  }, [tree, query]);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return looseCards;
    return looseCards.filter(
      (c) =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q),
    );
  }, [looseCards, query]);

  const handleDrop = useCallback(
    async (detail: {
      payload: { kind: string; id: string; label?: string };
      over: { kind: string; id?: string } | null;
      moved: boolean;
    }) => {
      if (!detail.moved || !detail.over) return;
      const { payload, over } = detail;

      try {
        if (payload.kind === 'card' && over.kind === 'folder' && over.id) {
          await cardsFacade.move(payload.id, over.id);
          toast.success('Card movido para a pasta');
          await load();
          return;
        }

        if (payload.kind === 'card' && over.kind === 'card' && over.id) {
          if (payload.id === over.id) return;
          const a = looseCards.find((c) => c.id === payload.id);
          const b = looseCards.find((c) => c.id === over.id);
          if (!a || !b) return;
          setMergeSources([a, b]);
          setFront(`${a.front} + ${b.front}`);
          setBack(`• ${a.front}: ${a.back}\n• ${b.front}: ${b.back}`);
          setHint('');
          setTag('Síntese');
          setMergeOpen(true);
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
          await topicsFacade.update(payload.id, { parentId: null });
          toast.success('Pasta na raiz');
          await load();
        }
      } catch (error) {
        toast.error(error);
      }
    },
    [load, looseCards, toast],
  );

  useDriveDrop(handleDrop);

  const createTopic = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await topicsFacade.create({ subjectId, name, description });
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
        topicId: null,
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

  const totalTopics = flattenTopics(tree).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>{subject?.name ?? 'Grupo'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell">
          <div className="sc-crumb">
            <button type="button" onClick={() => history.push('/home')}>
              Study Cards
            </button>
            <span>/</span>
            <span>{subject?.name ?? '…'}</span>
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
            Arraste card sobre card para unir · card sobre pasta para mover · pasta
            sobre pasta para aninhar
          </p>

          <div className="sc-section-label">Pastas</div>
          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : (
            <div className="sc-grid">
              {folders.map((node) => (
                <DropZone key={node.id} target={{ kind: 'folder', id: node.id }}>
                  <DragItem
                    payload={{
                      kind: 'folder',
                      id: node.id,
                      subjectId,
                      parentId: node.parentId,
                      label: node.name,
                    }}
                    onClick={() =>
                      history.push(`/topics/${node.id}?subjectId=${subjectId}`)
                    }
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
          )}

          <div className="sc-section-label">Cards</div>
          {view === 'grid' ? (
            <div className="sc-grid">
              {cards.map((card) => (
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
                    <DriveCardItem card={card} />
                  </DragItem>
                </DropZone>
              ))}
              {!cards.length && !loading ? (
                <div className="sc-empty" style={{ gridColumn: '1 / -1' }}>
                  Nenhum card na raiz. Use <strong>+ Card</strong> ou arraste de
                  uma pasta.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="sc-list-view">
              {cards.map((card) => (
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
              {!cards.length && !loading ? (
                <div className="sc-empty">
                  Nenhum card na raiz. Use <strong>+ Card</strong> para criar.
                </div>
              ) : null}
            </div>
          )}

          <div className="sc-bottom">
            <span>
              {looseCards.length} cards · {totalTopics} pastas
            </span>
            <button
              type="button"
              className="sc-btn"
              onClick={() => {
                history.push(
                  `/study/${subjectId}?subjectId=${subjectId}&scope=subject&filter=REVIEW`,
                );
              }}
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
            disabled={saving}
            onClick={() => void createTopic()}
          >
            Criar
          </button>
        </IonContent>
      </IonModal>

      <IonModal isOpen={cardOpen} onDidDismiss={() => setCardOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Novo card</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setCardOpen(false)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <div className="sc-auth-fields">
            <Field
              label="Conceito (título)"
              value={front}
              onChange={setFront}
              autoFocus
            />
            <TextArea label="Explicação" value={back} onChange={setBack} />
            <Field
              label="Tag"
              value={tag}
              onChange={setTag}
              placeholder="Conceito, API, Dado..."
            />
            <Field label="Dica" value={hint} onChange={setHint} />
          </div>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 16 }}
            disabled={saving || !front.trim() || !back.trim()}
            onClick={() => void createCard()}
          >
            Criar
          </button>
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
            <Field label="Novo conceito" value={front} onChange={setFront} autoFocus />
            <TextArea label="Síntese / explicação" value={back} onChange={setBack} />
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
            <div className="sc-auth-fields">
              <div>
                <div className="sc-field-label">Explicação</div>
                <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                  {detail.back}
                </p>
              </div>
              {detail.hint ? (
                <div>
                  <div className="sc-field-label">Dica</div>
                  <p style={{ margin: '6px 0 0' }}>{detail.hint}</p>
                </div>
              ) : null}
              <div>
                <div className="sc-field-label">Tag</div>
                <p style={{ margin: '6px 0 0' }}>{detail.tag}</p>
              </div>
            </div>
          ) : null}
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
