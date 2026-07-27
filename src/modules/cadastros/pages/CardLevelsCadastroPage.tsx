import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  IonAlert,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  createOutline,
  layersOutline,
  searchOutline,
  trashOutline,
} from 'ionicons/icons';
import { cardLevelsFacade } from '../../cards/facades/card-levels.facade';
import type { CardLevel } from '../../cards/types/card-level.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';

type Draft = {
  name: string;
  description: string;
};

const emptyDraft = (): Draft => ({
  name: '',
  description: '',
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
  const [listFilter, setListFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CardLevel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredLevels = useMemo(() => {
    const q = listFilter.trim().toLocaleLowerCase('pt-BR');
    if (!q) return levels;
    return levels.filter((level) => {
      const name = level.name.toLocaleLowerCase('pt-BR');
      const desc = (level.description ?? '').toLocaleLowerCase('pt-BR');
      return name.includes(q) || desc.includes(q);
    });
  }, [levels, listFilter]);

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

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await cardLevelsFacade.delete(target.id);
      setLevels((prev) => prev.filter((l) => l.id !== target.id));
      if (editingId === target.id) cancelEdit();
      toast.success(`Nível “${target.name}” excluído`);
    } catch (error) {
      toast.error(error);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Cadastros</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell sc-gh">
          <header className="sc-gh-page-head">
            <div>
              <h1 className="sc-gh-title">Cadastros</h1>
              <p className="sc-gh-subtitle">
                Dados reutilizados no app — níveis das cartas e futuros
                cadastros.
              </p>
            </div>
          </header>

          <div className="sc-gh-layout">
            <nav className="sc-gh-nav" aria-label="Cadastros">
              <button
                type="button"
                className="sc-gh-nav-item is-active"
                aria-current="page"
              >
                <IonIcon icon={layersOutline} />
                Níveis
              </button>
            </nav>

            <div className="sc-gh-main">
              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Novo nível</h2>
                  <p>Nome obrigatório; descrição é opcional.</p>
                </div>
                <form onSubmit={(e) => void createLevel(e)}>
                  <div className="sc-gh-fields">
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
                          setDraft((d) => ({
                            ...d,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Opcional"
                        disabled={creating}
                      />
                    </label>
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
                  <p>Edite nome ou descrição de um nível existente.</p>
                </div>

                <div className="sc-cadastro-list-wrap">
                  {levels.length > 0 ? (
                    <div className="sc-cadastro-list-filter">
                      <IonIcon icon={searchOutline} aria-hidden />
                      <input
                        type="search"
                        value={listFilter}
                        onChange={(e) => setListFilter(e.target.value)}
                        placeholder="Filtrar níveis…"
                        aria-label="Filtrar níveis"
                      />
                    </div>
                  ) : null}

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

                  {!loading && levels.length > 0 && filteredLevels.length === 0 ? (
                    <p className="sc-cadastro-levels-empty">
                      Nenhum nível com “{listFilter.trim()}”.
                    </p>
                  ) : null}

                  <ul className="sc-cadastro-level-list">
                    {filteredLevels.map((level) => {
                      const editing = editingId === level.id;
                      return (
                        <li
                          key={level.id}
                          className={`sc-cadastro-level-row${editing ? ' is-editing' : ''}`}
                        >
                          {editing ? (
                            <form
                              className="sc-cadastro-edit-form"
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
                                    savingId === level.id ||
                                    !editDraft.name.trim()
                                  }
                                >
                                  {savingId === level.id
                                    ? 'Salvando…'
                                    : 'Salvar'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="sc-cadastro-level-meta">
                                <div className="sc-cadastro-level-copy">
                                  <strong>{level.name}</strong>
                                  {level.description ? (
                                    <p>{level.description}</p>
                                  ) : (
                                    <p className="is-muted">Sem descrição</p>
                                  )}
                                </div>
                              </div>
                              <div className="sc-cadastro-row-actions">
                                <button
                                  type="button"
                                  className="sc-edit-icon"
                                  aria-label={`Editar ${level.name}`}
                                  title="Editar"
                                  onClick={() => startEdit(level)}
                                >
                                  <IonIcon icon={createOutline} />
                                </button>
                                <button
                                  type="button"
                                  className="sc-edit-icon sc-delete-icon"
                                  aria-label={`Excluir ${level.name}`}
                                  title="Excluir"
                                  disabled={deleting}
                                  onClick={() => setPendingDelete(level)}
                                >
                                  <IonIcon icon={trashOutline} />
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>

        <IonAlert
          isOpen={Boolean(pendingDelete)}
          header="Excluir nível?"
          message={
            pendingDelete
              ? `O nível “${pendingDelete.name}” será removido. Cartas que o usam ficam sem nível.`
              : undefined
          }
          onDidDismiss={() => {
            if (!deleting) setPendingDelete(null);
          }}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: deleting ? 'Excluindo…' : 'Excluir',
              role: 'destructive',
              handler: () => {
                void confirmDelete();
                return false;
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
