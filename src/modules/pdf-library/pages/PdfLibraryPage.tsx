import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
  useIonAlert,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  addOutline,
  cloudUploadOutline,
  documentTextOutline,
  folderOpenOutline,
  gridOutline,
  libraryOutline,
  listOutline,
  bookOutline,
  pencilOutline,
  searchOutline,
  star,
  starOutline,
  trashOutline,
} from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { pdfLibraryFacade } from '../facades/pdf-library.facade';
import { PdfReaderSheet } from '../components/PdfReaderSheet';
import type {
  PdfDocument,
  PdfGroup,
} from '../types/pdf-library.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import {
  MotionShell,
  fadeUp,
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';

const GROUP_COLORS = [
  '#7C5CFC',
  '#378ADD',
  '#1D9E75',
  '#BA7517',
  '#D4537E',
  '#D85A30',
];

type Collection = 'all' | 'favorites' | 'ungrouped' | string;
type ViewMode = 'grid' | 'list';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PdfLibraryPage() {
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [presentAlert] = useIonAlert();
  const fileInput = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<PdfGroup[]>([]);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [collection, setCollection] = useState<Collection>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadGroupId, setUploadGroupId] = useState('');
  const [editing, setEditing] = useState<PdfDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [reading, setReading] = useState<PdfDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pdfLibraryFacade.list();
      setGroups(result.groups);
      setDocuments(result.documents);
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useIonViewWillEnter(() => {
    void load();
  });

  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const document of documents) {
      if (document.groupId) {
        result.set(document.groupId, (result.get(document.groupId) ?? 0) + 1);
      }
    }
    return result;
  }, [documents]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return documents.filter((document) => {
      if (collection === 'favorites' && !document.favorite) return false;
      if (collection === 'ungrouped' && document.groupId) return false;
      if (
        !['all', 'favorites', 'ungrouped'].includes(collection) &&
        document.groupId !== collection
      ) {
        return false;
      }
      if (!normalized) return true;
      const groupName = document.groupId
        ? groupMap.get(document.groupId)?.name
        : '';
      return `${document.title} ${document.originalName} ${groupName}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalized);
    });
  }, [collection, documents, groupMap, query]);

  const selectedLabel =
    collection === 'all'
      ? 'Toda a biblioteca'
      : collection === 'favorites'
        ? 'Favoritos'
        : collection === 'ungrouped'
          ? 'Sem coleção'
          : (groupMap.get(collection)?.name ?? 'Coleção');

  const createGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const group = await pdfLibraryFacade.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        color: groupColor,
      });
      setGroups((current) => [...current, group]);
      setCollection(group.id);
      setGroupDialog(false);
      setGroupName('');
      setGroupDescription('');
      toast.success('Coleção criada');
    } catch (error) {
      toast.error(error);
    }
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error(new Error('Escolha um arquivo PDF.'));
      return;
    }
    setPendingFile(file);
    setUploadTitle(file.name.replace(/\.pdf$/i, ''));
    setUploadGroupId(
      !['all', 'favorites', 'ungrouped'].includes(collection) ? collection : '',
    );
    if (fileInput.current) fileInput.current.value = '';
  };

  const upload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const document = await pdfLibraryFacade.upload(pendingFile, {
        title: uploadTitle.trim() || undefined,
        groupId: uploadGroupId || undefined,
      });
      setDocuments((current) => [document, ...current]);
      setPendingFile(null);
      toast.success('PDF adicionado à biblioteca');
    } catch (error) {
      toast.error(error);
    } finally {
      setUploading(false);
    }
  };

  const toggleFavorite = async (document: PdfDocument) => {
    try {
      const updated = await pdfLibraryFacade.updateDocument(document.id, {
        favorite: !document.favorite,
      });
      setDocuments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const saveEdit = async () => {
    if (!editing || !editTitle.trim()) return;
    try {
      const updated = await pdfLibraryFacade.updateDocument(editing.id, {
        title: editTitle.trim(),
        groupId: editGroupId || null,
      });
      setDocuments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditing(null);
      toast.success('PDF organizado');
    } catch (error) {
      toast.error(error);
    }
  };

  const removeDocument = (document: PdfDocument) => {
    presentAlert({
      header: 'Excluir PDF?',
      message: `“${document.title}” será removido definitivamente da biblioteca.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            void (async () => {
              try {
                await pdfLibraryFacade.removeDocument(document.id);
                setDocuments((current) =>
                  current.filter((item) => item.id !== document.id),
                );
                toast.success('PDF removido');
              } catch (error) {
                toast.error(error);
              }
            })();
          },
        },
      ],
    });
  };

  const removeGroup = (group: PdfGroup) => {
    presentAlert({
      header: 'Excluir coleção?',
      message:
        'Os PDFs serão mantidos e passarão para “Sem coleção”.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir coleção',
          role: 'destructive',
          handler: () => {
            void (async () => {
              try {
                await pdfLibraryFacade.removeGroup(group.id);
                setGroups((current) =>
                  current.filter((item) => item.id !== group.id),
                );
                setDocuments((current) =>
                  current.map((item) =>
                    item.groupId === group.id
                      ? { ...item, groupId: null }
                      : item,
                  ),
                );
                setCollection('all');
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
        <MotionShell className="sc-pdf-library">
          <header className="sc-pdf-hero">
            <div className="sc-pdf-hero-mark" aria-hidden>
              <IonIcon icon={libraryOutline} />
            </div>
            <div className="sc-pdf-hero-copy">
              <p className="sc-pdf-kicker">Seu acervo de estudos</p>
              <h1>Biblioteca</h1>
              <p>
                Guarde artigos, apostilas e livros em coleções bonitas e fáceis
                de encontrar.
              </p>
            </div>
            <motion.button
              type="button"
              className="sc-btn primary sc-pdf-upload-cta"
              whileTap={reduce ? undefined : tapScale}
              onClick={() => fileInput.current?.click()}
            >
              <IonIcon icon={cloudUploadOutline} />
              Adicionar PDF
            </motion.button>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </header>

          <div className="sc-pdf-workspace">
            <aside className="sc-pdf-collections">
              <div className="sc-pdf-collections-head">
                <span>Coleções</span>
                <button
                  type="button"
                  title="Nova coleção"
                  aria-label="Nova coleção"
                  onClick={() => setGroupDialog(true)}
                >
                  <IonIcon icon={addOutline} />
                </button>
              </div>
              <button
                type="button"
                className={collection === 'all' ? 'is-active' : ''}
                onClick={() => setCollection('all')}
              >
                <IonIcon icon={libraryOutline} />
                <span>Toda a biblioteca</span>
                <em>{documents.length}</em>
              </button>
              <button
                type="button"
                className={collection === 'favorites' ? 'is-active' : ''}
                onClick={() => setCollection('favorites')}
              >
                <IonIcon icon={starOutline} />
                <span>Favoritos</span>
                <em>{documents.filter((item) => item.favorite).length}</em>
              </button>
              <button
                type="button"
                className={collection === 'ungrouped' ? 'is-active' : ''}
                onClick={() => setCollection('ungrouped')}
              >
                <IonIcon icon={folderOpenOutline} />
                <span>Sem coleção</span>
                <em>{documents.filter((item) => !item.groupId).length}</em>
              </button>
              <div className="sc-pdf-collection-divider" />
              {groups.map((group) => (
                <div className="sc-pdf-group-row" key={group.id}>
                  <button
                    type="button"
                    className={collection === group.id ? 'is-active' : ''}
                    onClick={() => setCollection(group.id)}
                    title={group.description || group.name}
                  >
                    <span
                      className="sc-pdf-group-dot"
                      style={{ background: group.color }}
                    />
                    <span>{group.name}</span>
                    <em>{counts.get(group.id) ?? 0}</em>
                  </button>
                  <button
                    type="button"
                    className="sc-pdf-group-delete"
                    aria-label={`Excluir coleção ${group.name}`}
                    title="Excluir coleção"
                    onClick={() => removeGroup(group)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {!groups.length && !loading ? (
                <p className="sc-pdf-collections-empty">
                  Crie coleções para separar seus assuntos.
                </p>
              ) : null}
            </aside>

            <main className="sc-pdf-shelf">
              <div className="sc-pdf-toolbar">
                <div>
                  <h2>{selectedLabel}</h2>
                  <span>
                    {visible.length} arquivo{visible.length === 1 ? '' : 's'}
                  </span>
                </div>
                <label className="sc-pdf-search">
                  <IonIcon icon={searchOutline} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar no acervo"
                  />
                </label>
                <div className="sc-pdf-view-toggle">
                  <button
                    type="button"
                    className={view === 'grid' ? 'is-active' : ''}
                    aria-label="Grade"
                    title="Grade"
                    onClick={() => setView('grid')}
                  >
                    <IonIcon icon={gridOutline} />
                  </button>
                  <button
                    type="button"
                    className={view === 'list' ? 'is-active' : ''}
                    aria-label="Lista"
                    title="Lista"
                    onClick={() => setView('list')}
                  >
                    <IonIcon icon={listOutline} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="sc-pdf-empty">
                  <IonSpinner name="crescent" />
                </div>
              ) : visible.length ? (
                <motion.div
                  className={`sc-pdf-grid is-${view}`}
                  variants={reduce ? undefined : staggerContainer}
                  initial={reduce ? false : 'hidden'}
                  animate="show"
                >
                  {visible.map((document) => {
                    const group = document.groupId
                      ? groupMap.get(document.groupId)
                      : undefined;
                    return (
                      <motion.article
                        key={document.id}
                        className="sc-pdf-book"
                        variants={reduce ? undefined : staggerItem}
                        whileHover={reduce ? undefined : { y: -4 }}
                        style={
                          {
                            '--pdf-color': group?.color ?? '#8A8680',
                          } as CSSProperties
                        }
                      >
                        <button
                          type="button"
                          className="sc-pdf-cover"
                          onClick={() => setReading(document)}
                        >
                          <span className="sc-pdf-spine" />
                          <span className="sc-pdf-file-type">PDF</span>
                          <IonIcon icon={documentTextOutline} />
                          <strong>{document.title}</strong>
                          <span>{group?.name ?? 'Sem coleção'}</span>
                        </button>
                        <div className="sc-pdf-book-info">
                          <div>
                            <h3>{document.title}</h3>
                            <p>
                              {formatBytes(document.sizeBytes)} ·{' '}
                              {formatDate(document.updatedAt)}
                            </p>
                          </div>
                          <div className="sc-pdf-book-actions">
                            <button
                              type="button"
                              aria-label={
                                document.favorite
                                  ? 'Remover dos favoritos'
                                  : 'Adicionar aos favoritos'
                              }
                              title="Favorito"
                              className={document.favorite ? 'is-favorite' : ''}
                              onClick={() => void toggleFavorite(document)}
                            >
                              <IonIcon
                                icon={document.favorite ? star : starOutline}
                              />
                            </button>
                            <button
                              type="button"
                              aria-label="Organizar PDF"
                              title="Renomear ou mover"
                              onClick={() => {
                                setEditing(document);
                                setEditTitle(document.title);
                                setEditGroupId(document.groupId ?? '');
                              }}
                            >
                              <IonIcon icon={pencilOutline} />
                            </button>
                            <button
                              type="button"
                              aria-label="Ler PDF"
                              title="Ler"
                              onClick={() => setReading(document)}
                            >
                              <IonIcon icon={bookOutline} />
                            </button>
                            <button
                              type="button"
                              aria-label="Excluir PDF"
                              title="Excluir"
                              onClick={() => removeDocument(document)}
                            >
                              <IonIcon icon={trashOutline} />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  className="sc-pdf-empty"
                  variants={reduce ? undefined : fadeUp}
                  initial={reduce ? false : 'hidden'}
                  animate="show"
                >
                  <div><IonIcon icon={documentTextOutline} /></div>
                  <h3>{query ? 'Nenhum PDF encontrado' : 'Esta estante está vazia'}</h3>
                  <p>
                    {query
                      ? 'Tente buscar por outro título ou coleção.'
                      : 'Adicione seu primeiro PDF para começar a montar o acervo.'}
                  </p>
                  {!query ? (
                    <button
                      type="button"
                      className="sc-btn primary"
                      onClick={() => fileInput.current?.click()}
                    >
                      <IonIcon icon={cloudUploadOutline} />
                      Adicionar PDF
                    </button>
                  ) : null}
                </motion.div>
              )}
            </main>
          </div>
        </MotionShell>
      </IonContent>

      {groupDialog ? (
        <div className="sc-pdf-dialog-backdrop" role="presentation">
          <section className="sc-pdf-dialog" role="dialog" aria-modal="true">
            <div className="sc-pdf-dialog-head">
              <div>
                <span>Organização</span>
                <h2>Nova coleção</h2>
              </div>
              <button type="button" onClick={() => setGroupDialog(false)}>×</button>
            </div>
            <label>
              Nome
              <input
                autoFocus
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Ex.: Psicologia cognitiva"
              />
            </label>
            <label>
              Descrição <small>opcional</small>
              <input
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                placeholder="O que fica nesta coleção?"
              />
            </label>
            <div className="sc-pdf-color-field">
              <span>Cor da coleção</span>
              <div>
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={groupColor === color ? 'is-active' : ''}
                    style={{ background: color }}
                    onClick={() => setGroupColor(color)}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="sc-pdf-dialog-actions">
              <button className="sc-btn" type="button" onClick={() => setGroupDialog(false)}>
                Cancelar
              </button>
              <button
                className="sc-btn primary"
                type="button"
                disabled={!groupName.trim()}
                onClick={() => void createGroup()}
              >
                Criar coleção
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingFile ? (
        <div className="sc-pdf-dialog-backdrop" role="presentation">
          <section className="sc-pdf-dialog" role="dialog" aria-modal="true">
            <div className="sc-pdf-dialog-head">
              <div>
                <span>Novo volume</span>
                <h2>Adicionar à biblioteca</h2>
              </div>
              <button type="button" onClick={() => setPendingFile(null)}>×</button>
            </div>
            <div className="sc-pdf-upload-file">
              <IonIcon icon={documentTextOutline} />
              <div>
                <strong>{pendingFile.name}</strong>
                <span>{formatBytes(pendingFile.size)}</span>
              </div>
            </div>
            <label>
              Título
              <input
                autoFocus
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
              />
            </label>
            <label>
              Coleção
              <select
                value={uploadGroupId}
                onChange={(event) => setUploadGroupId(event.target.value)}
              >
                <option value="">Sem coleção</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <div className="sc-pdf-dialog-actions">
              <button className="sc-btn" type="button" onClick={() => setPendingFile(null)}>
                Cancelar
              </button>
              <button
                className="sc-btn primary"
                type="button"
                disabled={uploading || !uploadTitle.trim()}
                onClick={() => void upload()}
              >
                {uploading ? <IonSpinner name="crescent" /> : 'Salvar PDF'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {editing ? (
        <div className="sc-pdf-dialog-backdrop" role="presentation">
          <section className="sc-pdf-dialog" role="dialog" aria-modal="true">
            <div className="sc-pdf-dialog-head">
              <div>
                <span>Organizar</span>
                <h2>Editar PDF</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)}>×</button>
            </div>
            <label>
              Título
              <input
                autoFocus
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </label>
            <label>
              Coleção
              <select
                value={editGroupId}
                onChange={(event) => setEditGroupId(event.target.value)}
              >
                <option value="">Sem coleção</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <div className="sc-pdf-dialog-actions">
              <button className="sc-btn" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button
                className="sc-btn primary"
                type="button"
                disabled={!editTitle.trim()}
                onClick={() => void saveEdit()}
              >
                Salvar alterações
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <PdfReaderSheet
        pdf={reading}
        groupName={
          reading?.groupId
            ? groupMap.get(reading.groupId)?.name
            : null
        }
        onClose={() => setReading(null)}
      />
    </IonPage>
  );
}
