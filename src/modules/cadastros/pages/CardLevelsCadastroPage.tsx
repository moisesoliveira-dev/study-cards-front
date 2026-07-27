import { type FormEvent, useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { cardLevelsFacade } from '../../cards/facades/card-levels.facade';
import type { CardLevel } from '../../cards/types/card-level.types';
import { CARD_ACCENT_COLORS } from '../../cards/types/card.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';

type Draft = {
  name: string;
  description: string;
  color: string;
};

const emptyDraft = (): Draft => ({
  name: '',
  description: '',
  color: CARD_ACCENT_COLORS[0],
});

export default function CardLevelsCadastroPage() {
  const toast = useAppToast();
  const [levels, setLevels] = useState<CardLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await cardLevelsFacade.list();
        if (!cancelled) setLevels(list);
      } catch (error) {
        if (!cancelled) {
          toast.error(error);
          setLevels([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const createLevel = async (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await cardLevelsFacade.create({
        name,
        description: draft.description.trim() || null,
        color: draft.color || null,
        position: levels.length,
      });
      setLevels((prev) =>
        [...prev, created].sort(
          (a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
        ),
      );
      setDraft(emptyDraft());
      toast.success(`Nível “${created.name}” criado`);
    } catch (error) {
      toast.error(error);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (level: CardLevel) => {
    setEditingId(level.id);
    setEditDraft({
      name: level.name,
      description: level.description ?? '',
      color: (level.color ?? CARD_ACCENT_COLORS[0]).toUpperCase(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft());
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId || savingId) return;
    const name = editDraft.name.trim();
    if (!name) return;
    setSavingId(editingId);
    try {
      const updated = await cardLevelsFacade.update(editingId, {
        name,
        description: editDraft.description.trim() || null,
        color: editDraft.color || null,
      });
      setLevels((prev) =>
        prev
          .map((l) => (l.id === updated.id ? updated : l))
          .sort(
            (a, b) =>
              a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
          ),
      );
      cancelEdit();
      toast.success(`Nível “${updated.name}” atualizado`);
    } catch (error) {
      toast.error(error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Níveis</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell sc-gh">
          <header className="sc-gh-page-head">
            <div>
              <h1 className="sc-gh-title">Níveis</h1>
              <p className="sc-gh-subtitle">
                Cadastre e edite os níveis usados nas cartas (Básico, Extra,
                etc.).
              </p>
            </div>
          </header>

          <div className="sc-cadastro-levels">
            <section className="sc-gh-box">
              <div className="sc-gh-box-head">
                <h2>Novo nível</h2>
                <p>Nome obrigatório; descrição e cor são opcionais.</p>
              </div>
              <form
                className="sc-cadastro-level-form"
                onSubmit={(e) => void createLevel(e)}
              >
                <label className="sc-field">
                  <span className="sc-field-label">Nome</span>
                  <input
                    className="sc-field-input"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="Ex.: Expert"
                    disabled={creating}
                    required
                  />
                </label>
                <label className="sc-field">
                  <span className="sc-field-label">Descrição</span>
                  <input
                    className="sc-field-input"
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, description: e.target.value }))
                    }
                    placeholder="Opcional"
                    disabled={creating}
                  />
                </label>
                <div
                  className="sc-cadastro-level-colors"
                  role="group"
                  aria-label="Cor"
                >
                  <span className="sc-cadastro-level-colors-label">Cor</span>
                  <div className="sc-card-accent-swatches">
                    {CARD_ACCENT_COLORS.map((c) => {
                      const active = draft.color.toUpperCase() === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`sc-card-accent-swatch${active ? ' is-active' : ''}`}
                          style={{ background: c }}
                          aria-label={`Cor ${c}`}
                          aria-pressed={active}
                          disabled={creating}
                          onClick={() => setDraft((d) => ({ ...d, color: c }))}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="sc-gh-box-foot">
                  <button
                    type="submit"
                    className="sc-btn primary"
                    disabled={creating || !draft.name.trim()}
                  >
                    {creating ? 'Salvando…' : 'Criar nível'}
                  </button>
                </div>
              </form>
            </section>

            <section className="sc-gh-box">
              <div className="sc-gh-box-head">
                <h2>Níveis cadastrados</h2>
                <p>Edite nome, descrição ou cor de um nível existente.</p>
              </div>

              {loading ? (
                <div className="sc-cadastro-levels-loading">
                  <IonSpinner name="crescent" />
                </div>
              ) : null}

              {!loading && !levels.length ? (
                <p className="sc-cadastro-levels-empty">
                  Nenhum nível cadastrado ainda.
                </p>
              ) : null}

              <ul className="sc-cadastro-level-list">
                {levels.map((level) => {
                  const editing = editingId === level.id;
                  return (
                    <li key={level.id} className="sc-cadastro-level-row">
                      {editing ? (
                        <form
                          className="sc-cadastro-level-form is-edit"
                          onSubmit={(e) => void saveEdit(e)}
                        >
                          <label className="sc-field">
                            <span className="sc-field-label">Nome</span>
                            <input
                              className="sc-field-input"
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  name: e.target.value,
                                }))
                              }
                              disabled={savingId === level.id}
                              required
                              autoFocus
                            />
                          </label>
                          <label className="sc-field">
                            <span className="sc-field-label">Descrição</span>
                            <input
                              className="sc-field-input"
                              value={editDraft.description}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  description: e.target.value,
                                }))
                              }
                              disabled={savingId === level.id}
                            />
                          </label>
                          <div
                            className="sc-cadastro-level-colors"
                            role="group"
                            aria-label="Cor"
                          >
                            <span className="sc-cadastro-level-colors-label">
                              Cor
                            </span>
                            <div className="sc-card-accent-swatches">
                              {CARD_ACCENT_COLORS.map((c) => {
                                const active =
                                  editDraft.color.toUpperCase() === c;
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    className={`sc-card-accent-swatch${active ? ' is-active' : ''}`}
                                    style={{ background: c }}
                                    aria-pressed={active}
                                    disabled={savingId === level.id}
                                    onClick={() =>
                                      setEditDraft((d) => ({ ...d, color: c }))
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <div className="sc-cadastro-level-row-actions">
                            <button
                              type="button"
                              className="sc-btn"
                              disabled={savingId === level.id}
                              onClick={cancelEdit}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="sc-btn primary"
                              disabled={
                                savingId === level.id || !editDraft.name.trim()
                              }
                            >
                              {savingId === level.id ? 'Salvando…' : 'Salvar'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="sc-cadastro-level-meta">
                            <span
                              className="sc-cadastro-level-dot"
                              style={{
                                background:
                                  level.color || 'var(--text-secondary)',
                              }}
                              aria-hidden
                            />
                            <div>
                              <strong>{level.name}</strong>
                              {level.description ? (
                                <p>{level.description}</p>
                              ) : (
                                <p className="is-muted">Sem descrição</p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="sc-btn"
                            onClick={() => startEdit(level)}
                          >
                            Editar
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
