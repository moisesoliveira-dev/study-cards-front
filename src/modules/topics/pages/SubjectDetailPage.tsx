import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonModal,
  IonPage,
  IonSpinner,
  IonTextarea,
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
import { DriveCardItem } from '../../../shared/components/DriveCardItem';
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        subjectsFacade.get(subjectId),
        topicsFacade.tree(subjectId),
      ]);
      setSubject(s);
      setTree(t);
      const rootIds = t.map((n) => n.id);
      const cards = rootIds.length
        ? (
            await Promise.all(rootIds.map((id) => cardsFacade.listByTopic(id)))
          ).flat()
        : [];
      setLooseCards(cards);
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

  const createTopic = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await topicsFacade.create({ subjectId, name, description });
      setOpen(false);
      setName('');
      setDescription('');
      toast.success('Grupo criado');
      await load();
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
            onNew={() => setOpen(true)}
            newLabel="Novo grupo"
          />

          <div className="sc-section-label">Grupos</div>
          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : (
            <div className="sc-grid">
              {folders.map((node) => (
                <DriveFolderItem
                  key={node.id}
                  name={node.name}
                  subtitle={`${node.children.length} sub · abrir`}
                  color={subject?.color}
                  onClick={() =>
                    history.push(`/topics/${node.id}?subjectId=${subjectId}`)
                  }
                />
              ))}
              <DriveFolderItem
                name="Novo grupo"
                dashed
                onClick={() => setOpen(true)}
              />
            </div>
          )}

          <div className="sc-section-label">Cards soltos</div>
          {view === 'grid' ? (
            <div className="sc-grid">
              {cards.map((card) => (
                <DriveCardItem
                  key={card.id}
                  card={card}
                  onClick={() =>
                    history.push(
                      `/topics/${card.topicId}?subjectId=${subjectId}&cardId=${card.id}`,
                    )
                  }
                />
              ))}
              {!cards.length && !loading ? (
                <div className="sc-empty" style={{ gridColumn: '1 / -1' }}>
                  Sem cards neste nível. Abra um grupo para criar.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="sc-list-view">
              {cards.map((card) => (
                <DriveCardItem
                  key={card.id}
                  card={card}
                  view="list"
                  onClick={() =>
                    history.push(
                      `/topics/${card.topicId}?subjectId=${subjectId}&cardId=${card.id}`,
                    )
                  }
                />
              ))}
            </div>
          )}

          <div className="sc-bottom">
            <span>
              {looseCards.length} cards · {totalTopics} grupos
            </span>
            <button
              type="button"
              className="sc-btn"
              onClick={() => {
                const first = tree[0];
                if (first) {
                  history.push(
                    `/study/${first.id}?subjectId=${subjectId}&filter=REVIEW`,
                  );
                }
              }}
            >
              Revisar pendentes ↗
            </button>
          </div>
        </div>
      </IonContent>

      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Novo grupo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setOpen(false)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <IonItem>
            <IonInput
              label="Nome"
              labelPlacement="stacked"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Descrição"
              labelPlacement="stacked"
              value={description}
              onIonInput={(e) => setDescription(e.detail.value ?? '')}
              autoGrow
            />
          </IonItem>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() => void createTopic()}
          >
            Criar
          </button>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
