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
} from '@ionic/react';
import { motion, useReducedMotion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { subjectsFacade } from '../facades/subjects.facade';
import type { Subject } from '../types/subject.types';
import { DriveTopBar } from '../../../shared/components/DriveTopBar';
import { DriveFolderItem } from '../../../shared/components/DriveFolderItem';
import { Field, TextArea } from '../../../shared/components/Field';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { useAuth } from '../../auth/context/AuthContext';
import { MotionShell, MotionStagger, tapScale } from '../../../shared/motion';

const COLORS = ['#BA7517', '#378ADD', '#1D9E75', '#7F77DD', '#D4537E', '#888780'];

export default function SubjectsPage() {
  const history = useHistory();
  const toast = useAppToast();
  const { user, logout } = useAuth();
  const reduce = useReducedMotion();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubjects(await subjectsFacade.list());
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [subjects, query]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await subjectsFacade.create({ name, description, color });
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Study Cards</IonTitle>
          <IonButtons slot="end">
            <span className="sc-user-chip">{user?.name || user?.email}</span>
            <IonButton
              onClick={() => {
                logout();
                history.replace('/login');
              }}
            >
              Sair
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MotionShell className="sc-shell">
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
          ) : view === 'grid' ? (
            <MotionStagger className="sc-grid" key={`grid-${filtered.length}`}>
              {filtered.map((s) => (
                <DriveFolderItem
                  key={s.id}
                  name={s.name}
                  subtitle={s.description || 'Abrir grupo'}
                  color={s.color}
                  onClick={() => history.push(`/subjects/${s.id}`)}
                />
              ))}
              <DriveFolderItem
                name="Novo grupo"
                dashed
                onClick={() => setOpen(true)}
              />
            </MotionStagger>
          ) : (
            <MotionStagger className="sc-list-view" key={`list-${filtered.length}`}>
              {filtered.map((s, i) => (
                <motion.button
                  key={s.id}
                  type="button"
                  className="sc-list-row"
                  onClick={() => history.push(`/subjects/${s.id}`)}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={reduce ? undefined : tapScale}
                >
                  <span className="list-icon">📁</span>
                  <span className="list-name">{s.name}</span>
                  <span className="list-tag">Grupo</span>
                  <span className="list-links">{s.description || '—'}</span>
                </motion.button>
              ))}
            </MotionStagger>
          )}

          <div className="sc-bottom">
            <span>{subjects.length} grupos</span>
          </div>
        </MotionShell>
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
          <div className="sc-auth-fields">
            <Field label="Nome" value={name} onChange={setName} autoFocus />
            <TextArea
              label="Descrição"
              value={description}
              onChange={setDescription}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '8px 0 16px', flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: color === c ? '2px solid #1a1917' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button type="button" className="sc-btn primary" disabled={saving} onClick={() => void create()}>
            {saving ? 'Salvando…' : 'Criar grupo'}
          </button>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
