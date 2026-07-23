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
  useIonAlert,
} from '@ionic/react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { topicsFacade } from '../../topics/facades/topics.facade';
import { cardsFacade } from '../facades/cards.facade';
import type { Card } from '../types/card.types';
import type { TopicTreeNode } from '../../topics/types/topic.types';
import { FaceCard } from '../../../shared/components/DriveCardItem';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import {
  statusClass,
  statusLabel,
} from '../types/card.types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
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

export default function TopicCardsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const query = useQuery();
  const subjectId = query.get('subjectId');
  const focusCardId = query.get('cardId');
  const history = useHistory();
  const toast = useAppToast();
  const [presentAlert] = useIonAlert();

  const [topicName, setTopicName] = useState('Cards');
  const [children, setChildren] = useState<TopicTreeNode[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [childCards, setChildCards] = useState<Record<string, Card[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [detail, setDetail] = useState<Card | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [subName, setSubName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const tree = await topicsFacade.tree(subjectId);
      const node = findNode(tree, topicId);
      setTopicName(node?.name ?? 'Cards');
      setChildren(node?.children ?? []);
      const own = await cardsFacade.listByTopic(topicId);
      setCards(own);
      const map: Record<string, Card[]> = {};
      await Promise.all(
        (node?.children ?? []).map(async (child) => {
          map[child.id] = await cardsFacade.listByTopic(child.id);
        }),
      );
      setChildCards(map);
      if (focusCardId) {
        const found = own.find((c) => c.id === focusCardId);
        if (found) setDetail(found);
      }
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, subjectId, focusCardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = cardsFacade.countByStatus(cards);
  const filteredHand = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards.slice(0, 8);
    return cards
      .filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [cards, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const createCard = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      await cardsFacade.create({ topicId, front, back, hint, tag });
      setCreateOpen(false);
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

  const createSub = async () => {
    if (!subjectId || !subName.trim()) return;
    setSaving(true);
    try {
      await topicsFacade.create({
        subjectId,
        parentId: topicId,
        name: subName,
      });
      setSubOpen(false);
      setSubName('');
      toast.success('Subgrupo criado');
      await load();
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const merge = async () => {
    if (selected.length < 2 || !front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      const created = await cardsFacade.merge({
        topicId,
        sourceCardIds: selected,
        front,
        back,
        hint,
        tag: tag || 'Síntese',
      });
      setMergeOpen(false);
      setSelected([]);
      setSelectMode(false);
      setFront('');
      setBack('');
      setHint('');
      setTag('Síntese');
      toast.success('Novo conceito unido');
      await load();
      setDetail(created);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: Card['status']) => {
    if (!detail) return;
    try {
      const updated = await cardsFacade.update(detail.id, { status });
      setDetail(updated);
      await load();
    } catch (error) {
      toast.error(error);
    }
  };

  const removeCard = (id: string) => {
    presentAlert({
      header: 'Excluir card?',
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
                toast.success('Removido');
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

  const openMerge = () => {
    const sources = cards.filter((c) => selected.includes(c.id));
    setFront('');
    setBack(
      sources.map((s) => `• ${s.front}: ${s.back}`).join('\n'),
    );
    setHint('');
    setTag('Síntese');
    setMergeOpen(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={subjectId ? `/subjects/${subjectId}` : '/home'}
            />
          </IonButtons>
          <IonTitle>{topicName}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setCreateOpen(true)}>Novo card</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell">
          <div className="sc-table">
            <div className="sc-table-top">
              <div className="deck-info">
                <span className="deck-label">{topicName}</span>
                <span className="deck-count">{cards.length} cards</span>
              </div>
              <div className="progress-row">
                <span className="pip pip-ok" />
                <span className="pip-label">{counts.known} sabidos</span>
                <span className="pip pip-rev" />
                <span className="pip-label">{counts.review} revisar</span>
                <span className="pip pip-new" />
                <span className="pip-label">{counts.neu} novos</span>
              </div>
            </div>

            {loading ? (
              <div className="sc-empty">
                <IonSpinner name="crescent" />
              </div>
            ) : (
              <>
                <div className="sc-hand" role="list" aria-label="Cards">
                  {filteredHand.map((card) => (
                    <FaceCard
                      key={card.id}
                      card={card}
                      selected={selected.includes(card.id)}
                      onClick={() => {
                        if (selectMode) {
                          toggleSelect(card.id);
                        } else {
                          setDetail(card);
                        }
                      }}
                    />
                  ))}
                  {!filteredHand.length ? (
                    <div className="sc-empty">Nenhum card neste grupo.</div>
                  ) : null}
                </div>

                <div className="sc-groups">
                  {children.map((child, idx) => (
                    <div key={child.id} className="sc-group">
                      <div className="group-head">
                        <span
                          className="group-dot"
                          style={{
                            background: ['#7F77DD', '#1D9E75', '#BA7517', '#378ADD'][
                              idx % 4
                            ],
                          }}
                        />
                        <span className="group-name">{child.name}</span>
                        <button
                          type="button"
                          className="sc-btn"
                          onClick={() =>
                            history.push(
                              `/topics/${child.id}?subjectId=${subjectId}`,
                            )
                          }
                        >
                          Abrir
                        </button>
                      </div>
                      <div className="group-cards">
                        {(childCards[child.id] ?? []).map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            className="mini-card"
                            onClick={() =>
                              history.push(
                                `/topics/${child.id}?subjectId=${subjectId}&cardId=${card.id}`,
                              )
                            }
                          >
                            <div className="mini-title">{card.front}</div>
                            <div className="mini-tag">
                              {card.tag} · {statusLabel(card.status).toLowerCase()}
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="mini-card mini-add"
                          onClick={() =>
                            history.push(
                              `/topics/${child.id}?subjectId=${subjectId}`,
                            )
                          }
                          aria-label="Abrir subgrupo"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="sc-group">
                    <div className="group-head">
                      <span className="group-dot" style={{ background: '#888780' }} />
                      <span className="group-name">Novo subgrupo</span>
                    </div>
                    <div className="group-cards">
                      <button
                        type="button"
                        className="mini-card mini-add"
                        onClick={() => setSubOpen(true)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sc-bottom" style={{ marginTop: 20 }}>
                  <input
                    className="sc-search"
                    style={{ maxWidth: 200, paddingLeft: 12 }}
                    placeholder="Buscar conceito..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="sc-btn"
                      onClick={() => {
                        if (selectMode) {
                          setSelectMode(false);
                          setSelected([]);
                        } else {
                          setSelectMode(true);
                        }
                      }}
                    >
                      {selectMode ? 'Cancelar seleção' : 'Selecionar p/ unir'}
                    </button>
                    <button
                      type="button"
                      className="sc-btn primary"
                      onClick={() =>
                        history.push(
                          `/study/${topicId}?subjectId=${subjectId}&filter=REVIEW`,
                        )
                      }
                    >
                      Revisar agora ↗
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {selected.length >= 2 ? (
            <div className="sc-selection-bar">
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selected.length} cards selecionados
              </span>
              <button type="button" className="sc-btn primary" onClick={openMerge}>
                Unir em novo conceito
              </button>
            </div>
          ) : null}
        </div>
      </IonContent>

      <IonModal isOpen={!!detail} onDidDismiss={() => setDetail(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Conceito</IonTitle>
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
                <span className="card-links">{detail.linkCount} links</span>
              </div>
              <div className="sc-detail-block">
                <h4>Conceito</h4>
                <p>{detail.front}</p>
              </div>
              <div className="sc-detail-block">
                <h4>Explicação</h4>
                <p>{detail.back}</p>
              </div>
              {detail.hint ? (
                <div className="sc-detail-block">
                  <h4>Dica</h4>
                  <p>{detail.hint}</p>
                </div>
              ) : null}
              {detail.sourceIds.length ? (
                <div className="sc-detail-block">
                  <h4>Formado a partir de</h4>
                  <div className="sc-sources">
                    {detail.sourceIds.map((id) => {
                      const src = cards.find((c) => c.id === id);
                      return (
                        <span key={id} className="sc-chip">
                          {src?.front ?? id.slice(0, 8)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="sc-btn" onClick={() => void updateStatus('KNOWN')}>
                  Marcar sabido
                </button>
                <button type="button" className="sc-btn" onClick={() => void updateStatus('REVIEW')}>
                  Marcar revisar
                </button>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => toggleSelect(detail.id)}
                >
                  {selected.includes(detail.id) ? 'Remover da união' : 'Selecionar p/ unir'}
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

      <IonModal isOpen={createOpen} onDidDismiss={() => setCreateOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Novo card</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setCreateOpen(false)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <IonItem>
            <IonInput
              label="Conceito (título)"
              labelPlacement="stacked"
              value={front}
              onIonInput={(e) => setFront(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Explicação"
              labelPlacement="stacked"
              value={back}
              onIonInput={(e) => setBack(e.detail.value ?? '')}
              autoGrow
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Tag"
              labelPlacement="stacked"
              value={tag}
              onIonInput={(e) => setTag(e.detail.value ?? '')}
              placeholder="Conceito, API, Dado..."
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Dica"
              labelPlacement="stacked"
              value={hint}
              onIonInput={(e) => setHint(e.detail.value ?? '')}
            />
          </IonItem>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() => void createCard()}
          >
            Criar
          </button>
        </IonContent>
      </IonModal>

      <IonModal isOpen={mergeOpen} onDidDismiss={() => setMergeOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Unir cards</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setMergeOpen(false)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
            {selected.length} cards serão ligados a este novo conceito.
          </p>
          <IonItem>
            <IonInput
              label="Novo conceito"
              labelPlacement="stacked"
              value={front}
              onIonInput={(e) => setFront(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Síntese / explicação"
              labelPlacement="stacked"
              value={back}
              onIonInput={(e) => setBack(e.detail.value ?? '')}
              autoGrow
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Tag"
              labelPlacement="stacked"
              value={tag}
              onIonInput={(e) => setTag(e.detail.value ?? '')}
            />
          </IonItem>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() => void merge()}
          >
            Criar conceito unido
          </button>
        </IonContent>
      </IonModal>

      <IonModal isOpen={subOpen} onDidDismiss={() => setSubOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Novo subgrupo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSubOpen(false)}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <IonItem>
            <IonInput
              label="Nome"
              labelPlacement="stacked"
              value={subName}
              onIonInput={(e) => setSubName(e.detail.value ?? '')}
            />
          </IonItem>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() => void createSub()}
          >
            Criar
          </button>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
