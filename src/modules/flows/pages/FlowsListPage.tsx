import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import {
  IonContent,
  IonPage,
  IonSpinner,
  useIonAlert,
  useIonViewWillEnter,
} from '@ionic/react';
import { IonIcon } from '@ionic/react';
import {
  addOutline,
  gitNetworkOutline,
  trashOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { flowsFacade } from '../facades/flows.facade';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import type { FlowBoard } from '../types/flow.types';
import type { Subject } from '../../subjects/types/subject.types';
import { Field } from '../../../shared/components/Field';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import {
  MotionShell,
  fadeUp,
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';

export default function FlowsListPage() {
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [presentAlert] = useIonAlert();
  const [flows, setFlows] = useState<FlowBoard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const filteredFlows = useMemo(() => {
    if (filterSubjectId === 'all') return flows;
    return flows.filter((f) => f.subjectId === filterSubjectId);
  }, [flows, filterSubjectId]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [f, s] = await Promise.all([
        flowsFacade.list(),
        subjectsFacade.list(),
      ]);
      setFlows(f);
      setSubjects(s);
      setSubjectId((prev) =>
        prev && s.some((item) => item.id === prev) ? prev : s[0]?.id || '',
      );
      setFilterSubjectId((prev) =>
        prev === 'all' || s.some((item) => item.id === prev) ? prev : 'all',
      );
    } catch (error) {
      if (!opts?.silent) {
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Falha ao carregar fluxogramas',
        );
      }
      toast.error(error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useIonViewWillEnter(() => {
    void load();
  });

  const openComposer = async () => {
    try {
      const latest = await subjectsFacade.list();
      setSubjects(latest);
      if (!latest.length) {
        toast.error(
          new Error(
            'Crie um grupo em Cartas (nível principal) antes de montar um fluxograma.',
          ),
        );
        return;
      }
      setName('');
      setSubjectId(
        filterSubjectId !== 'all' &&
          latest.some((s) => s.id === filterSubjectId)
          ? filterSubjectId
          : latest[0].id,
      );
      setComposing(true);
    } catch (error) {
      toast.error(error);
    }
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!subjectId || !trimmed) {
      toast.error(new Error('Informe um nome e escolha um grupo.'));
      return;
    }
    setSaving(true);
    try {
      const board = await flowsFacade.create({
        subjectId,
        name: trimmed,
      });
      setFlows((prev) => [board, ...prev.filter((f) => f.id !== board.id)]);
      setComposing(false);
      setName('');
      toast.success('Fluxograma criado');
      history.push(`/flows/${board.id}`);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    presentAlert({
      header: 'Excluir fluxograma?',
      message: 'Essa ação não pode ser desfeita.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            void (async () => {
              try {
                await flowsFacade.remove(id);
                setFlows((prev) => prev.filter((f) => f.id !== id));
                toast.success('Removido');
              } catch (error) {
                toast.error(error);
              }
            })();
          },
        },
      ],
    });
  };

  return (
    <IonPage>
      <IonContent>
        <MotionShell className="sc-flow-hub">
          <section className="sc-flow-stage" aria-hidden={false}>
            <div className="sc-flow-stage-glow" aria-hidden />
            <svg
              className="sc-flow-stage-graph"
              viewBox="0 0 640 220"
              fill="none"
              aria-hidden
            >
              <path
                className="sc-flow-stage-edge"
                d="M90 140C160 90 210 70 280 95"
              />
              <path
                className="sc-flow-stage-edge"
                d="M280 95C360 130 400 70 490 85"
              />
              <path
                className="sc-flow-stage-edge"
                d="M280 95C300 150 360 170 430 155"
              />
              <circle className="sc-flow-stage-node" cx="90" cy="140" r="14" />
              <circle className="sc-flow-stage-node" cx="280" cy="95" r="18" />
              <circle className="sc-flow-stage-node" cx="490" cy="85" r="12" />
              <circle className="sc-flow-stage-node" cx="430" cy="155" r="10" />
            </svg>

            <header className="sc-flow-hero">
              <div className="sc-flow-hero-copy">
                <p className="sc-flow-kicker">Ambiente · mapas</p>
                <h1 className="sc-flow-title">Fluxogramas</h1>
                <p className="sc-flow-lead">
                  Ligue cards num canvas vivo — pré-requisitos, sínteses e o
                  fio do que você está estudando.
                </p>
                {!loading && flows.length > 0 ? (
                  <p className="sc-flow-stats">
                    {flows.length} mapa{flows.length === 1 ? '' : 's'} ·{' '}
                    {subjects.length} grupo{subjects.length === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>
              <motion.button
                type="button"
                className="sc-btn primary sc-flow-cta"
                onClick={() => void openComposer()}
                whileTap={reduce ? undefined : tapScale}
              >
                <IonIcon icon={addOutline} />
                Novo mapa
              </motion.button>
            </header>
          </section>

          {composing ? (
            <motion.section
              className="sc-flow-composer"
              variants={reduce ? undefined : fadeUp}
              initial={reduce ? false : 'hidden'}
              animate="show"
            >
              <div className="sc-flow-composer-top">
                <div>
                  <p className="sc-flow-composer-eyebrow">Novo</p>
                  <h2>Criar fluxograma</h2>
                </div>
                <button
                  type="button"
                  className="sc-modal-x"
                  aria-label="Fechar"
                  onClick={() => setComposing(false)}
                >
                  ×
                </button>
              </div>
              <Field
                label="Nome"
                value={name}
                onChange={setName}
                placeholder="Ex.: Mapa de Redes"
                autoFocus
                onEnter={() => void create()}
              />
              <div className="sc-flow-subject-pick">
                <span className="sc-field-label">Grupo de cartas</span>
                <div className="sc-flow-subject-grid">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`sc-flow-subject-chip${subjectId === s.id ? ' is-active' : ''}`}
                      onClick={() => setSubjectId(s.id)}
                    >
                      <span
                        className="sc-flow-subject-swatch"
                        style={{ background: s.color }}
                      />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sc-flow-composer-actions">
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => setComposing(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="sc-btn primary"
                  disabled={saving || !subjectId || !name.trim()}
                  onClick={() => void create()}
                >
                  {saving ? <IonSpinner name="crescent" /> : 'Criar e abrir'}
                </button>
              </div>
            </motion.section>
          ) : null}

          {subjects.length > 1 && flows.length > 0 ? (
            <div className="sc-flow-filters" role="tablist" aria-label="Filtrar por grupo">
              <button
                type="button"
                role="tab"
                aria-selected={filterSubjectId === 'all'}
                className={`sc-flow-filter${filterSubjectId === 'all' ? ' is-active' : ''}`}
                onClick={() => setFilterSubjectId('all')}
              >
                Todos
              </button>
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={filterSubjectId === s.id}
                  className={`sc-flow-filter${filterSubjectId === s.id ? ' is-active' : ''}`}
                  onClick={() => setFilterSubjectId(s.id)}
                >
                  <span
                    className="sc-flow-subject-swatch"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}

          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : loadError ? (
            <div className="sc-flow-empty sc-flow-empty-error">
              <div className="sc-flow-empty-icon" aria-hidden>
                <IonIcon icon={gitNetworkOutline} />
              </div>
              <h2>Não foi possível carregar</h2>
              <p>{loadError}</p>
              <button
                type="button"
                className="sc-btn primary"
                onClick={() => void load()}
              >
                Tentar de novo
              </button>
            </div>
          ) : filteredFlows.length ? (
            <motion.div
              className="sc-flow-gallery"
              variants={reduce ? undefined : staggerContainer}
              initial={reduce ? false : 'hidden'}
              animate="show"
            >
              {filteredFlows.map((flow) => {
                const subject = subjectMap.get(flow.subjectId);
                const nodeCount = flow.nodes?.length ?? 0;
                const edgeCount = flow.edges?.length ?? 0;
                return (
                  <motion.article
                    key={flow.id}
                    className="sc-flow-tile"
                    variants={reduce ? undefined : staggerItem}
                    whileHover={reduce ? undefined : { y: -4 }}
                    style={
                      {
                        '--flow-accent': subject?.color ?? 'var(--rev)',
                      } as CSSProperties
                    }
                  >
                    <button
                      type="button"
                      className="sc-flow-tile-open"
                      onClick={() => history.push(`/flows/${flow.id}`)}
                    >
                      <div className="sc-flow-tile-preview" aria-hidden>
                        <span className="sc-flow-preview-orbit" />
                        <span className="sc-flow-preview-node n1" />
                        <span className="sc-flow-preview-node n2" />
                        <span className="sc-flow-preview-node n3" />
                        <span className="sc-flow-preview-line l1" />
                        <span className="sc-flow-preview-line l2" />
                        <span className="sc-flow-preview-badge">
                          {nodeCount || '·'}
                        </span>
                      </div>
                      <div className="sc-flow-tile-body">
                        <div className="sc-flow-tile-meta">
                          <span
                            className="sc-flow-subject-swatch"
                            style={{
                              background: subject?.color ?? 'var(--rev)',
                            }}
                          />
                          <span>{subject?.name ?? 'Grupo'}</span>
                        </div>
                        <h3>{flow.name}</h3>
                        <p>
                          {nodeCount} card{nodeCount === 1 ? '' : 's'} ·{' '}
                          {edgeCount} ligação{edgeCount === 1 ? '' : 'ões'}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="sc-flow-tile-delete"
                      aria-label="Excluir"
                      title="Excluir"
                      onClick={(e) => remove(flow.id, e)}
                    >
                      <IonIcon icon={trashOutline} />
                    </button>
                  </motion.article>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              className="sc-flow-empty"
              variants={reduce ? undefined : fadeUp}
              initial={reduce ? false : 'hidden'}
              animate="show"
            >
              <div className="sc-flow-empty-icon" aria-hidden>
                <IonIcon icon={gitNetworkOutline} />
              </div>
              <h2>
                {flows.length
                  ? 'Nada neste filtro'
                  : 'Nenhum mapa ainda'}
              </h2>
              <p>
                {!subjects.length
                  ? 'Fluxogramas usam os grupos da tela Cartas (Novo grupo). Pastas dentro de um grupo não aparecem aqui.'
                  : flows.length
                    ? 'Troque o filtro ou crie um fluxograma novo para este grupo.'
                    : 'Crie um fluxograma e arraste cards do grupo para o canvas.'}
              </p>
              {subjects.length ? (
                <motion.button
                  type="button"
                  className="sc-btn primary"
                  onClick={() => void openComposer()}
                  whileTap={reduce ? undefined : tapScale}
                >
                  {flows.length ? 'Novo mapa' : 'Criar o primeiro'}
                </motion.button>
              ) : (
                <button
                  type="button"
                  className="sc-btn primary"
                  onClick={() => history.push('/home')}
                >
                  Ir para Cartas
                </button>
              )}
            </motion.div>
          )}
        </MotionShell>
      </IonContent>
    </IonPage>
  );
}
