import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { documentNotesFacade } from '../../modules/cards/facades/document-notes.facade';
import type { DocumentNote } from '../../modules/cards/types/document-note.types';
import { DocumentNoteEditor, isNoteBlank } from './DocumentNoteEditor';

const PANEL_W = 360;
const PANEL_H_MAX = 420;
const FADE_MS = 220;

type Panel = {
  mode: 'create' | 'edit' | 'view';
  note: string;
  from: number;
  to: number;
  id?: string | null;
  top: number;
  left: number;
};

type Props = {
  editor: Editor;
  editable: boolean;
  cardId?: string | null;
};

/** Posição fixa ao lado do modal do documento (não segue o trecho). */
function placeBesideDoc(
  editor: Editor,
  panelEl?: HTMLElement | null,
): { top: number; left: number } {
  const gap = 14;
  const shell =
    editor.view.dom.closest('.sc-doc-shell')?.getBoundingClientRect() ??
    editor.view.dom.getBoundingClientRect();

  const panelW = Math.min(
    panelEl?.offsetWidth || PANEL_W,
    window.innerWidth - 20,
  );
  const panelH = Math.min(
    panelEl?.offsetHeight || PANEL_H_MAX,
    window.innerHeight - 20,
  );

  let left = shell.right + gap;
  if (left + panelW > window.innerWidth - 10) {
    left = shell.left - panelW - gap;
  }
  if (left < 10) {
    left = Math.max(
      10,
      Math.min(window.innerWidth - panelW - 10, shell.right - panelW),
    );
  }

  const top = Math.max(
    10,
    Math.min(window.innerHeight - panelH - 10, shell.top + 56),
  );

  return { top, left };
}

function sameNote(
  a: Panel | null,
  b: Omit<Panel, 'top' | 'left'>,
): boolean {
  if (!a) return false;
  if (a.id && b.id) return a.id === b.id;
  return a.from === b.from && a.to === b.to && a.note === b.note;
}

function collectMarkIds(editor: Editor): Set<string> {
  const ids = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== 'annotation') continue;
      const id = mark.attrs.id as string | null | undefined;
      if (id) ids.add(id);
    }
  });
  return ids;
}

/** Nota flutuante — conteúdo persistido em tabela DocumentNote. */
export function DocumentNotes({ editor, editable, cardId = null }: Props) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [visible, setVisible] = useState(false);
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [savingNote, setSavingNote] = useState(false);
  const [notesById, setNotesById] = useState<Record<string, DocumentNote>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const panelSnap = useRef<Panel | null>(null);
  const noteContentRef = useRef('');
  const visibleSnap = useRef(false);
  const lastRange = useRef<{ from: number; to: number } | null>(null);
  const fadeTimer = useRef<number | null>(null);
  const gen = useRef(0);
  const notesByIdRef = useRef(notesById);
  notesByIdRef.current = notesById;
  const hydrated = useRef(false);

  useEffect(() => {
    panelSnap.current = panel;
    if (panel) noteContentRef.current = panel.note;
  }, [panel]);

  useEffect(() => {
    visibleSnap.current = visible;
  }, [visible]);

  useEffect(
    () => () => {
      if (fadeTimer.current != null) window.clearTimeout(fadeTimer.current);
    },
    [],
  );

  const clearFade = () => {
    if (fadeTimer.current != null) {
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  };

  const closePanel = useCallback(() => {
    clearFade();
    const token = ++gen.current;
    setVisible(false);
    fadeTimer.current = window.setTimeout(() => {
      if (gen.current !== token) return;
      setPanel(null);
      noteContentRef.current = '';
      fadeTimer.current = null;
    }, FADE_MS);
  }, []);

  const clampRange = useCallback(
    (from: number, to: number) => {
      const max = editor.state.doc.content.size;
      const a = Math.max(0, Math.min(from, max));
      const b = Math.max(0, Math.min(to, max));
      return a <= b ? { from: a, to: b } : { from: b, to: a };
    },
    [editor],
  );

  const applyNoteMark = useCallback(
    (from: number, to: number, id: string) => {
      const range = clampRange(from, to);
      if (range.from >= range.to) return false;
      return editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta('skipOnChange', true);
          tr.setMeta('addToHistory', false);
          return true;
        })
        .focus()
        .setTextSelection(range)
        .setAnnotation({ note: '', id })
        .run();
    },
    [clampRange, editor],
  );

  const removeNoteMark = useCallback(
    (from: number, to: number) => {
      const range = clampRange(from, to);
      return editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta('skipOnChange', true);
          tr.setMeta('addToHistory', false);
          return true;
        })
        .focus()
        .setTextSelection(range)
        .extendMarkRange('annotation')
        .unsetAnnotation()
        .run();
    },
    [clampRange, editor],
  );

  /** Carrega notas da API e reaplica marcas ausentes no documento. */
  useEffect(() => {
    if (!cardId) {
      setNotesById({});
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    hydrated.current = false;
    void documentNotesFacade
      .list(cardId)
      .then((list) => {
        if (cancelled) return;
        const map: Record<string, DocumentNote> = {};
        for (const n of list) map[n.id] = n;
        setNotesById(map);

        const existing = collectMarkIds(editor);
        for (const n of list) {
          if (existing.has(n.id)) continue;
          const range = clampRange(n.fromPos, n.toPos);
          if (range.from >= range.to) continue;
          editor
            .chain()
            .command(({ tr }) => {
              tr.setMeta('skipOnChange', true);
              tr.setMeta('addToHistory', false);
              return true;
            })
            .setTextSelection(range)
            .setAnnotation({ note: '', id: n.id })
            .run();
        }
        hydrated.current = true;
      })
      .catch(() => {
        if (!cancelled) setNotesById({});
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, clampRange, editor]);

  const openAt = useCallback(
    (next: Omit<Panel, 'top' | 'left'>) => {
      clearFade();
      setBubble(null);
      noteContentRef.current = next.note;
      const pos = placeBesideDoc(editor);
      const current = panelSnap.current;
      const isShowing = visibleSnap.current;
      const token = ++gen.current;

      if (current && isShowing && sameNote(current, next)) {
        setPanel({ ...next, ...pos });
        setVisible(true);
        return;
      }

      if (current && isShowing) {
        setVisible(false);
        fadeTimer.current = window.setTimeout(() => {
          if (gen.current !== token) return;
          noteContentRef.current = next.note;
          setPanel({ ...next, ...placeBesideDoc(editor) });
          window.requestAnimationFrame(() => {
            if (gen.current !== token) return;
            setVisible(true);
          });
          fadeTimer.current = null;
        }, FADE_MS);
        return;
      }

      setPanel({ ...next, ...pos });
      setVisible(false);
      window.requestAnimationFrame(() => {
        if (gen.current !== token) return;
        setVisible(true);
      });
    },
    [editor],
  );

  const refreshBubble = useCallback(() => {
    if (!editable || !editor.isEditable || panelSnap.current) {
      setBubble(null);
      return;
    }
    const { empty, from, to } = editor.state.selection;
    if (empty || from === to) {
      setBubble(null);
      return;
    }
    lastRange.current = { from, to };
    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const left = Math.min(
        window.innerWidth - 140,
        Math.max(8, (start.left + end.right) / 2 - 60),
      );
      const top = Math.max(8, start.top - 44);
      setBubble({ top, left });
    } catch {
      setBubble(null);
    }
  }, [editable, editor]);

  useLayoutEffect(() => {
    if (!panel) return;

    const fromUiChrome = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(
        panelRef.current?.contains(target) ||
          bubbleRef.current?.contains(target),
      );
    };

    const reposition = (e?: Event) => {
      if (e && fromUiChrome(e.target)) return;
      const pos = placeBesideDoc(editor, panelRef.current);
      setPanel((p) =>
        p && (p.top !== pos.top || p.left !== pos.left)
          ? { ...p, ...pos }
          : p,
      );
    };

    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    const ro =
      typeof ResizeObserver !== 'undefined' && panelRef.current
        ? new ResizeObserver(() => reposition())
        : null;
    if (panelRef.current && ro) ro.observe(panelRef.current);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      ro?.disconnect();
    };
  }, [editor, panel?.id, panel?.mode, visible]);

  useLayoutEffect(() => {
    refreshBubble();
    const fromUiChrome = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(
        panelRef.current?.contains(target) ||
          bubbleRef.current?.contains(target),
      );
    };
    const onSel = (e?: Event) => {
      if (e && fromUiChrome(e.target)) return;
      window.requestAnimationFrame(refreshBubble);
    };
    editor.on('selectionUpdate', onSel);
    editor.on('transaction', onSel);
    window.addEventListener('resize', onSel);
    window.addEventListener('scroll', onSel, true);
    return () => {
      editor.off('selectionUpdate', onSel);
      editor.off('transaction', onSel);
      window.removeEventListener('resize', onSel);
      window.removeEventListener('scroll', onSel, true);
    };
  }, [editor, refreshBubble, panel]);

  const openCreate = useCallback(() => {
    if (!editable || !editor.isEditable) return;
    if (!cardId) {
      window.alert('Salve o card antes de adicionar notas.');
      return;
    }
    let { from, to, empty } = editor.state.selection;
    if (empty || from === to) {
      const saved = lastRange.current;
      if (!saved || saved.from >= saved.to) return;
      from = saved.from;
      to = saved.to;
      editor.chain().setTextSelection({ from, to }).run();
    } else {
      lastRange.current = { from, to };
    }
    const existingId = editor.isActive('annotation')
      ? ((editor.getAttributes('annotation').id as string | null) ?? null)
      : null;
    const legacyNote = editor.isActive('annotation')
      ? ((editor.getAttributes('annotation').note as string | undefined) ?? '')
      : '';
    const fromApi = existingId
      ? notesByIdRef.current[existingId]?.content
      : '';
    const existsInDb = Boolean(existingId && notesByIdRef.current[existingId]);
    openAt({
      // Só "edit" se a nota já existe na API; ids antigos do mark não contam.
      mode: existsInDb ? 'edit' : 'create',
      note: fromApi || legacyNote || '',
      from,
      to,
      id: existsInDb ? existingId : null,
    });
  }, [editable, editor, openAt, cardId]);

  const saveDraft = useCallback(async () => {
    const current = panelSnap.current;
    if (!current || current.mode === 'view') return;
    if (!cardId) {
      window.alert('Salve o card antes de adicionar notas.');
      return;
    }

    const note = noteContentRef.current || current.note;
    const { from, to } = current;
    const id =
      current.id && notesByIdRef.current[current.id] ? current.id : null;

    if (from >= to) {
      closePanel();
      return;
    }

    if (isNoteBlank(note)) {
      if (id) {
        try {
          setSavingNote(true);
          await documentNotesFacade.remove(cardId, id);
          setNotesById((m) => {
            const next = { ...m };
            delete next[id];
            return next;
          });
        } catch {
          // Id fantasma / já removido — só limpa a marca local.
        } finally {
          setSavingNote(false);
        }
      }
      removeNoteMark(from, to);
      closePanel();
      return;
    }

    try {
      setSavingNote(true);
      if (id) {
        try {
          const updated = await documentNotesFacade.update(cardId, id, {
            content: note,
            fromPos: from,
            toPos: to,
          });
          setNotesById((m) => ({ ...m, [updated.id]: updated }));
          applyNoteMark(from, to, updated.id);
        } catch {
          // Nota sumiu do banco — cria de novo.
          const created = await documentNotesFacade.create(cardId, {
            content: note,
            fromPos: from,
            toPos: to,
          });
          setNotesById((m) => ({ ...m, [created.id]: created }));
          applyNoteMark(from, to, created.id);
        }
      } else {
        const created = await documentNotesFacade.create(cardId, {
          content: note,
          fromPos: from,
          toPos: to,
        });
        setNotesById((m) => ({ ...m, [created.id]: created }));
        applyNoteMark(from, to, created.id);
      }
      closePanel();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Falha ao salvar nota',
      );
    } finally {
      setSavingNote(false);
    }
  }, [applyNoteMark, cardId, closePanel, removeNoteMark]);

  const deleteNote = useCallback(async () => {
    const current = panelSnap.current;
    if (!current) return;
    const id =
      current.id && notesByIdRef.current[current.id] ? current.id : null;
    if (cardId && id) {
      try {
        setSavingNote(true);
        await documentNotesFacade.remove(cardId, id);
        setNotesById((m) => {
          const next = { ...m };
          delete next[id];
          return next;
        });
      } catch {
        // já removida
      } finally {
        setSavingNote(false);
      }
    }
    removeNoteMark(current.from, current.to);
    closePanel();
  }, [cardId, closePanel, removeNoteMark]);

  useEffect(() => {
    const root = editor.view.dom;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-annotation]',
      ) as HTMLElement | null;
      if (!target) return;
      if (!editor.state.selection.empty) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        const pos = editor.view.posAtDOM(target, 0);
        editor
          .chain()
          .setTextSelection(pos)
          .extendMarkRange('annotation')
          .run();
        const attrs = editor.getAttributes('annotation');
        const id = (attrs.id as string | null) ?? null;
        const legacy = String(attrs.note ?? '');
        const { from, to } = editor.state.selection;
        const fromApi = id ? notesByIdRef.current[id]?.content : '';
        const existsInDb = Boolean(id && notesByIdRef.current[id]);
        openAt({
          mode:
            editable && editor.isEditable
              ? existsInDb
                ? 'edit'
                : 'create'
              : 'view',
          note: fromApi || legacy,
          from,
          to,
          id: existsInDb ? id : null,
        });
      } catch {
        // ignore
      }
    };

    const onOpenNote = () => openCreate();

    root.addEventListener('click', onClick);
    root.addEventListener('sc-open-note', onOpenNote as EventListener);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('sc-open-note', onOpenNote as EventListener);
    };
  }, [editable, editor, openAt, openCreate]);

  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
      if (e.key.toLowerCase() !== 'n') return;
      const { empty, from, to } = editor.state.selection;
      if (empty && !lastRange.current) return;
      if (!empty) lastRange.current = { from, to };
      e.preventDefault();
      openCreate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editable, editor, openCreate]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (bubbleRef.current?.contains(t)) return;
      if (editor.view.dom.contains(t)) {
        const el = (t as HTMLElement).closest?.('[data-annotation]');
        if (el && editor.state.selection.empty) return;
      }
      closePanel();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [panel, closePanel, editor]);

  if (typeof document === 'undefined') return null;

  const editing = panel
    ? panel.mode === 'create' || panel.mode === 'edit'
    : false;

  return createPortal(
    <>
      {bubble && editable && !panel ? (
        <div
          ref={bubbleRef}
          className="sc-doc-note-bubble is-visible"
          style={{ top: bubble.top, left: bubble.left }}
        >
          <button
            type="button"
            className="sc-doc-note-bubble-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={openCreate}
          >
            + Nota
          </button>
        </div>
      ) : null}

      {panel ? (
        <div
          ref={panelRef}
          className={`sc-doc-note-float${visible ? ' is-visible' : ''}${
            editing ? ' is-editing' : ''
          }`}
          style={{ top: panel.top, left: panel.left }}
          role="dialog"
          aria-label={editing ? 'Nota' : 'Ver nota'}
        >
          <div className="sc-doc-note-float-head">
            <span>
              {panel.mode === 'create'
                ? 'Nova nota'
                : panel.mode === 'edit'
                  ? 'Editar nota'
                  : 'Nota'}
            </span>
            <button
              type="button"
              className="sc-doc-note-composer-x"
              aria-label="Fechar"
              onClick={closePanel}
            >
              ×
            </button>
          </div>

          <div className="sc-doc-note-float-scroll">
            <DocumentNoteEditor
              key={`${panel.id ?? 'new'}-${panel.from}-${panel.to}-${panel.mode}`}
              value={panel.note}
              editable={editing}
              autoFocus={editing && visible}
              onChange={(json) => {
                noteContentRef.current = json;
                setPanel((p) => (p ? { ...p, note: json } : p));
              }}
              onEscape={closePanel}
              onSaveShortcut={() => {
                void saveDraft();
              }}
            />
          </div>

          {editing ? (
            <div className="sc-doc-note-composer-actions">
              {panel.mode === 'edit' ? (
                <button
                  type="button"
                  className="sc-btn sc-doc-note-danger"
                  disabled={savingNote}
                  onClick={() => void deleteNote()}
                >
                  Excluir
                </button>
              ) : (
                <span />
              )}
              <div className="sc-doc-note-composer-right">
                <button
                  type="button"
                  className="sc-btn"
                  disabled={savingNote}
                  onClick={closePanel}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="sc-btn primary"
                  onClick={() => void saveDraft()}
                  disabled={
                    savingNote ||
                    isNoteBlank(noteContentRef.current || panel.note)
                  }
                >
                  {savingNote ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>,
    document.body,
  );
}
