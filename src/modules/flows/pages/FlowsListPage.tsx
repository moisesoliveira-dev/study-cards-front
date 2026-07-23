import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { flowsFacade } from '../facades/flows.facade';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import type { FlowBoard } from '../types/flow.types';
import type { Subject } from '../../subjects/types/subject.types';
import { Field } from '../../../shared/components/Field';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { MotionShell, MotionStagger, staggerItem, tapScale } from '../../../shared/motion';
import { motion, useReducedMotion } from 'framer-motion';

export default function FlowsListPage() {
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [presentAlert] = useIonAlert();
  const [flows, setFlows] = useState<FlowBoard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Fluxograma');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        flowsFacade.list(),
        subjectsFacade.list(),
      ]);
      setFlows(f);
      setSubjects(s);
      if (!subjectId && s[0]) setSubjectId(s[0].id);
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!subjectId || !name.trim()) return;
    setSaving(true);
    try {
      const board = await flowsFacade.create({ subjectId, name });
      setOpen(false);
      setName('Fluxograma');
      toast.success('Fluxograma criado');
      history.push(`/flows/${board.id}`);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Fluxogramas</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setOpen(true)}>+ Novo</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MotionShell className="sc-shell">
          <p className="sc-flow-lead">
            Monte relações entre cards em um canvas. Cada fluxograma fica ligado
            a um grupo de cartas.
          </p>

          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : flows.length ? (
            <MotionStagger className="sc-flow-list">
              {flows.map((flow) => {
                const subject = subjectMap.get(flow.subjectId);
                return (
                  <motion.div
                    key={flow.id}
                    className="sc-flow-list-item"
                    variants={reduce ? undefined : staggerItem}
                    initial={reduce ? false : 'hidden'}
                    animate="show"
                  >
                    <button
                      type="button"
                      className="sc-flow-list-main"
                      onClick={() => history.push(`/flows/${flow.id}`)}
                    >
                      <span
                        className="sc-flow-list-dot"
                        style={{ background: subject?.color ?? 'var(--rev)' }}
                      />
                      <span className="sc-flow-list-copy">
                        <strong>{flow.name}</strong>
                        <small>
                          {subject?.name ?? 'Grupo'} · {flow.nodes.length} nós ·{' '}
                          {flow.edges.length} ligações
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="sc-btn"
                      onClick={() => remove(flow.id)}
                    >
                      Excluir
                    </button>
                  </motion.div>
                );
              })}
            </MotionStagger>
          ) : (
            <div className="sc-empty">
              <p>Nenhum fluxograma ainda.</p>
              <motion.button
                type="button"
                className="sc-btn primary"
                onClick={() => setOpen(true)}
                whileTap={reduce ? undefined : tapScale}
              >
                Criar o primeiro
              </motion.button>
            </div>
          )}
        </MotionShell>
      </IonContent>

      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Novo fluxograma</IonTitle>
            <IonButtons slot="end">
              <button
                type="button"
                className="sc-modal-x"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding sc-form">
          <div className="sc-auth-fields">
            <Field label="Nome" value={name} onChange={setName} autoFocus />
            <label className="sc-field">
              <span className="sc-field-label">Grupo de cartas</span>
              <select
                className="sc-field-input"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="sc-btn primary"
            style={{ marginTop: 16 }}
            disabled={saving || !subjectId || !name.trim()}
            onClick={() => void create()}
          >
            {saving ? <IonSpinner name="crescent" /> : 'Criar'}
          </button>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
