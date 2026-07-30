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
  searchOutline,
  trashOutline,
} from 'ionicons/icons';
import { colorsFacade } from '../../colors/facades/colors.facade';
import type { CatalogColor } from '../../colors/types/color.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { CadastrosSubNav } from '../components/CadastrosSubNav';

type Draft = {
  name: string;
  hex: string;
  description: string;
};

const emptyDraft = (): Draft => ({
  name: '',
  hex: '#1D9E75',
  description: '',
});

export default function ColorsCadastroPage() {
  const toast = useAppToast();
  const [colors, setColors] = useState<CatalogColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CatalogColor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredColors = useMemo(() => {
    const q = listFilter.trim().toLocaleLowerCase('pt-BR');
    if (!q) return colors;
    return colors.filter((color) => {
      const name = color.name.toLocaleLowerCase('pt-BR');
      const hex = color.hex.toLocaleLowerCase('pt-BR');
      const desc = (color.description ?? '').toLocaleLowerCase('pt-BR');
      return name.includes(q) || hex.includes(q) || desc.includes(q);
    });
  }, [colors, listFilter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await colorsFacade.list();
        if (!cancelled) setColors(list);
      } catch (error) {
        if (!cancelled) {
          toast.error(error);
          setColors([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const createColor = async (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const hex = draft.hex.trim();
    if (!name || !hex || creating) return;
    setCreating(true);
    try {
      const created = await colorsFacade.create({
        name,
        hex,
        description: draft.description.trim() || null,
        position: colors.length,
      });
      setColors((prev) =>
        [...prev, created].sort(
          (a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
        ),
      );
      setDraft(emptyDraft());
      toast.success(`Cor “${created.name}” criada`);
    } catch (error) {
      toast.error(error);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (color: CatalogColor) => {
    setEditingId(color.id);
    setEditDraft({
      name: color.name,
      hex: color.hex,
      description: color.description ?? '',
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
    const hex = editDraft.hex.trim();
    if (!name || !hex) return;
    setSavingId(editingId);
    try {
      const updated = await colorsFacade.update(editingId, {
        name,
        hex,
        description: editDraft.description.trim() || null,
      });
      setColors((prev) =>
        prev
          .map((c) => (c.id === updated.id ? updated : c))
          .sort(
            (a, b) =>
              a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
          ),
      );
      cancelEdit();
      toast.success('Cor atualizada');
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
      await colorsFacade.delete(target.id);
      setColors((prev) => prev.filter((c) => c.id !== target.id));
      if (editingId === target.id) cancelEdit();
      toast.success(`Cor “${target.name}” excluída`);
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
                Cores do sistema — usadas em cartas, pastas, decks e grupos.
              </p>
            </div>
          </header>

          <div className="sc-gh-layout">
            <CadastrosSubNav />

            <div className="sc-gh-main">
              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Nova cor</h2>
                  <p>Cadastre aqui; no restante do app só se escolhe do catálogo.</p>
                </div>
                <form onSubmit={(e) => void createColor(e)}>
                  <div className="sc-gh-fields">
                    <label className="sc-field">
                      <span className="sc-field-label">Nome</span>
                      <input
                        className="sc-field-input"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        placeholder="Ex.: Verde destaque"
                        disabled={creating}
                        required
                      />
                    </label>
                    <label className="sc-field">
                      <span className="sc-field-label">Hex</span>
                      <div className="sc-cadastro-color-hex-row">
                        <input
                          type="color"
                          className="sc-cadastro-color-native"
                          value={
                            /^#[0-9A-Fa-f]{6}$/.test(draft.hex)
                              ? draft.hex
                              : '#1D9E75'
                          }
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              hex: e.target.value.toUpperCase(),
                            }))
                          }
                          disabled={creating}
                          aria-label="Seletor de cor"
                        />
                        <input
                          className="sc-field-input"
                          value={draft.hex}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, hex: e.target.value }))
                          }
                          placeholder="#1D9E75"
                          disabled={creating}
                          required
                        />
                      </div>
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
                      disabled={creating || !draft.name.trim() || !draft.hex.trim()}
                    >
                      {creating ? 'Salvando…' : 'Criar cor'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Cores cadastradas</h2>
                  <p>Edite nome, hex ou descrição.</p>
                </div>

                <div className="sc-cadastro-list-wrap">
                  {colors.length > 0 ? (
                    <div className="sc-cadastro-list-filter">
                      <IonIcon icon={searchOutline} aria-hidden />
                      <input
                        type="search"
                        value={listFilter}
                        onChange={(e) => setListFilter(e.target.value)}
                        placeholder="Filtrar cores…"
                        aria-label="Filtrar cores"
                      />
                    </div>
                  ) : null}

                  {loading ? (
                    <div className="sc-cadastro-levels-loading">
                      <IonSpinner name="crescent" />
                    </div>
                  ) : null}

                  {!loading && !colors.length ? (
                    <p className="sc-cadastro-levels-empty">
                      Nenhuma cor cadastrada ainda.
                    </p>
                  ) : null}

                  {!loading && colors.length > 0 && filteredColors.length === 0 ? (
                    <p className="sc-cadastro-levels-empty">
                      Nenhuma cor com “{listFilter.trim()}”.
                    </p>
                  ) : null}

                  <ul className="sc-cadastro-level-list">
                    {filteredColors.map((color) => {
                      const editing = editingId === color.id;
                      return (
                        <li
                          key={color.id}
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
                                  disabled={savingId === color.id}
                                  required
                                  autoFocus
                                />
                              </label>
                              <label className="sc-field">
                                <span className="sc-field-label">Hex</span>
                                <div className="sc-cadastro-color-hex-row">
                                  <input
                                    type="color"
                                    className="sc-cadastro-color-native"
                                    value={
                                      /^#[0-9A-Fa-f]{6}$/.test(editDraft.hex)
                                        ? editDraft.hex
                                        : '#1D9E75'
                                    }
                                    onChange={(e) =>
                                      setEditDraft((d) => ({
                                        ...d,
                                        hex: e.target.value.toUpperCase(),
                                      }))
                                    }
                                    disabled={savingId === color.id}
                                    aria-label="Seletor de cor"
                                  />
                                  <input
                                    className="sc-field-input"
                                    value={editDraft.hex}
                                    onChange={(e) =>
                                      setEditDraft((d) => ({
                                        ...d,
                                        hex: e.target.value,
                                      }))
                                    }
                                    disabled={savingId === color.id}
                                    required
                                  />
                                </div>
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
                                  disabled={savingId === color.id}
                                />
                              </label>
                              <div className="sc-cadastro-level-row-actions">
                                <button
                                  type="button"
                                  className="sc-btn"
                                  disabled={savingId === color.id}
                                  onClick={cancelEdit}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="sc-btn primary"
                                  disabled={
                                    savingId === color.id ||
                                    !editDraft.name.trim() ||
                                    !editDraft.hex.trim()
                                  }
                                >
                                  {savingId === color.id
                                    ? 'Salvando…'
                                    : 'Salvar'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="sc-cadastro-level-meta">
                                <span
                                  className="sc-cadastro-color-dot"
                                  style={{ background: color.hex }}
                                  aria-hidden
                                />
                                <div className="sc-cadastro-level-copy">
                                  <strong>{color.name}</strong>
                                  <p className="is-muted">{color.hex}</p>
                                  {color.description ? (
                                    <p>{color.description}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="sc-cadastro-row-actions">
                                <button
                                  type="button"
                                  className="sc-edit-icon"
                                  aria-label={`Editar ${color.name}`}
                                  title="Editar"
                                  onClick={() => startEdit(color)}
                                >
                                  <IonIcon icon={createOutline} />
                                </button>
                                <button
                                  type="button"
                                  className="sc-edit-icon sc-delete-icon"
                                  aria-label={`Excluir ${color.name}`}
                                  title="Excluir"
                                  disabled={deleting}
                                  onClick={() => setPendingDelete(color)}
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
          header="Excluir cor?"
          message={
            pendingDelete
              ? `A cor “${pendingDelete.name}” sairá do catálogo. Itens que já usam o hex ${pendingDelete.hex} mantêm a cor.`
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
