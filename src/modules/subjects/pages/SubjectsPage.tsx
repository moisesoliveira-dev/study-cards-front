import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useHistory } from 'react-router-dom';
import { subjectsFacade } from '../facades/subjects.facade';
import type { Subject } from '../types/subject.types';
import { DriveTopBar } from '../../../shared/components/DriveTopBar';
import { DriveFolderItem } from '../../../shared/components/DriveFolderItem';
import { useAppToast } from '../../../shared/hooks/useAppToast';

const COLORS = ['#BA7517', '#378ADD', '#1D9E75', '#7F77DD', '#D4537E', '#888780'];

export default function SubjectsPage() {
  const history = useHistory();
  const toast = useAppToast();
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
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell">
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
            <div className="sc-grid">
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
            </div>
          ) : (
            <div className="sc-list-view">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="sc-list-row"
                  onClick={() => history.push(`/subjects/${s.id}`)}
                >
                  <span className="list-icon">📁</span>
                  <span className="list-name">{s.name}</span>
                  <span className="list-tag">Grupo</span>
                  <span className="list-links">{s.description || '—'}</span>
                </button>
              ))}
            </div>
          )}

          <div className="sc-bottom">
            <span>{subjects.length} grupos</span>
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
