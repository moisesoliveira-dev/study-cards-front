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
import { cardTagsFacade } from '../../cards/facades/card-tags.facade';
import type { CardTag } from '../../cards/types/card-tag.types';
import { colorsFacade } from '../../colors/facades/colors.facade';
import type { CatalogColor } from '../../colors/types/color.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { CadastrosSubNav } from '../components/CadastrosSubNav';

type Draft = {
  name: string;
  colorId: string;
  description: string;
};

const emptyDraft = (colorId = ''): Draft => ({
  name: '',
  colorId,
  description: '',
});

export default function CardTagsCadastroPage() {
  const toast = useAppToast();
  const [tags, setTags] = useState<CardTag[]>([]);
  const [colors, setColors] = useState<CatalogColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CardTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredTags = useMemo(() => {
    const q = listFilter.trim().toLocaleLowerCase('pt-BR');
    if (!q) return tags;
    return tags.filter((tag) => {
      const name = tag.name.toLocaleLowerCase('pt-BR');
      const desc = (tag.description ?? '').toLocaleLowerCase('pt-BR');
      const colorName = (tag.color?.name ?? '').toLocaleLowerCase('pt-BR');
      const hex = (tag.color?.hex ?? '').toLocaleLowerCase('pt-BR');
      return (
        name.includes(q) ||
        desc.includes(q) ||
        colorName.includes(q) ||
        hex.includes(q)
      );
    });
  }, [tags, listFilter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [tagList, colorList] = await Promise.all([
          cardTagsFacade.list(),
          colorsFacade.list(),
        ]);
        if (cancelled) return;
        setTags(tagList);
        setColors(colorList);
        setDraft((d) =>
          d.colorId
            ? d
            : emptyDraft(colorList[0]?.id ?? ''),
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(error);
          setTags([]);
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

  const createTag = async (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const colorId = draft.colorId.trim();
    if (!name || !colorId || creating) return;
    setCreating(true);
    try {
      const created = await cardTagsFacade.create({
        name,
        colorId,
        description: draft.description.trim() || null,
        position: tags.length,
      });
      setTags((prev) =>
        [...prev, created].sort(
          (a, b) =>
            a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
        ),
      );
      setDraft(emptyDraft(colorId));
      toast.success(`Tag “${created.name}” criada`);
    } catch (error) {
      toast.error(error);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (tag: CardTag) => {
    setEditingId(tag.id);
    setEditDraft({
      name: tag.name,
      colorId: tag.colorId,
      description: tag.description ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft(colors[0]?.id ?? ''));
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId || savingId) return;
    const name = editDraft.name.trim();
    const colorId = editDraft.colorId.trim();
    if (!name || !colorId) return;
    setSavingId(editingId);
    try {
      const updated = await cardTagsFacade.update(editingId, {
        name,
        colorId,
        description: editDraft.description.trim() || null,
      });
      setTags((prev) =>
        prev
          .map((t) => (t.id === updated.id ? updated : t))
          .sort(
            (a, b) =>
              a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
          ),
      );
      cancelEdit();
      toast.success('Tag atualizada');
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
      await cardTagsFacade.delete(target.id);
      setTags((prev) => prev.filter((t) => t.id !== target.id));
      if (editingId === target.id) cancelEdit();
      toast.success(`Tag “${target.name}” excluída`);
    } catch (error) {
      toast.error(error);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const colorOptions =
    colors.length === 0 ? (
      <option value="">Cadastre uma cor primeiro</option>
    ) : (
      colors.map((color) => (
        <option key={color.id} value={color.id}>
          {color.name} ({color.hex})
        </option>
      ))
    );

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
                Tags das cartas — o rótulo fixo (ex.: Conceito) e a cor associada.
              </p>
            </div>
          </header>

          <div className="sc-gh-layout">
            <CadastrosSubNav />

            <div className="sc-gh-main">
              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Nova tag</h2>
                  <p>
                    Cadastre aqui; ao criar cartas você escolhe do catálogo e a
                    cor vem junto.
                  </p>
                </div>
                <form onSubmit={(e) => void createTag(e)}>
                  <div className="sc-gh-fields">
                    <label className="sc-field">
                      <span className="sc-field-label">Nome</span>
                      <input
                        className="sc-field-input"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        placeholder="Ex.: Conceito"
                        disabled={creating}
                        required
                      />
                    </label>
                    <label className="sc-field">
                      <span className="sc-field-label">Cor</span>
                      <select
                        className="sc-field-input"
                        value={draft.colorId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, colorId: e.target.value }))
                        }
                        disabled={creating || colors.length === 0}
                        required
                      >
                        {colorOptions}
                      </select>
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
                      disabled={
                        creating ||
                        !draft.name.trim() ||
                        !draft.colorId.trim() ||
                        colors.length === 0
                      }
                    >
                      {creating ? 'Salvando…' : 'Criar tag'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Tags cadastradas</h2>
                  <p>Edite nome, cor ou descrição.</p>
                </div>

                <div className="sc-cadastro-list-wrap">
                  {tags.length > 0 ? (
                    <div className="sc-cadastro-list-filter">
                      <IonIcon icon={searchOutline} aria-hidden />
                      <input
                        type="search"
                        value={listFilter}
                        onChange={(e) => setListFilter(e.target.value)}
                        placeholder="Filtrar tags…"
                        aria-label="Filtrar tags"
                      />
                    </div>
                  ) : null}

                  {loading ? (
                    <div className="sc-cadastro-levels-loading">
                      <IonSpinner name="crescent" />
                    </div>
                  ) : null}

                  {!loading && !tags.length ? (
                    <p className="sc-cadastro-levels-empty">
                      Nenhuma tag cadastrada ainda.
                    </p>
                  ) : null}

                  {!loading && tags.length > 0 && filteredTags.length === 0 ? (
                    <p className="sc-cadastro-levels-empty">
                      Nenhuma tag com “{listFilter.trim()}”.
                    </p>
                  ) : null}

                  <ul className="sc-cadastro-level-list">
                    {filteredTags.map((tag) => {
                      const editing = editingId === tag.id;
                      const hex = tag.color?.hex ?? '#1D9E75';
                      return (
                        <li
                          key={tag.id}
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
                                  disabled={savingId === tag.id}
                                  required
                                  autoFocus
                                />
                              </label>
                              <label className="sc-field">
                                <span className="sc-field-label">Cor</span>
                                <select
                                  className="sc-field-input"
                                  value={editDraft.colorId}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({
                                      ...d,
                                      colorId: e.target.value,
                                    }))
                                  }
                                  disabled={
                                    savingId === tag.id || colors.length === 0
                                  }
                                  required
                                >
                                  {colorOptions}
                                </select>
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
                                  disabled={savingId === tag.id}
                                />
                              </label>
                              <div className="sc-cadastro-level-row-actions">
                                <button
                                  type="button"
                                  className="sc-btn"
                                  disabled={savingId === tag.id}
                                  onClick={cancelEdit}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="sc-btn primary"
                                  disabled={
                                    savingId === tag.id ||
                                    !editDraft.name.trim() ||
                                    !editDraft.colorId.trim()
                                  }
                                >
                                  {savingId === tag.id
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
                                  style={{ background: hex }}
                                  aria-hidden
                                />
                                <div className="sc-cadastro-level-copy">
                                  <strong>{tag.name}</strong>
                                  <p className="is-muted">
                                    {tag.color
                                      ? `${tag.color.name} · ${tag.color.hex}`
                                      : 'Sem cor'}
                                  </p>
                                  {tag.description ? (
                                    <p>{tag.description}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="sc-cadastro-row-actions">
                                <button
                                  type="button"
                                  className="sc-edit-icon"
                                  aria-label={`Editar ${tag.name}`}
                                  title="Editar"
                                  onClick={() => startEdit(tag)}
                                >
                                  <IonIcon icon={createOutline} />
                                </button>
                                <button
                                  type="button"
                                  className="sc-edit-icon sc-delete-icon"
                                  aria-label={`Excluir ${tag.name}`}
                                  title="Excluir"
                                  disabled={deleting}
                                  onClick={() => setPendingDelete(tag)}
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
          header="Excluir tag?"
          message={
            pendingDelete
              ? `A tag “${pendingDelete.name}” sairá do catálogo. Cartas que já usam o nome mantêm o texto.`
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
