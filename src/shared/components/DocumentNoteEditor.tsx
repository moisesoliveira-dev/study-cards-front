import { useEffect, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { SoftBreak } from './document-editor-extensions';

const HIGHLIGHTS = ['#fde047', '#86efac', '#f9a8d4', '#93c5fd'] as const;

function isTipTapJson(value: string): boolean {
  const t = value.trim();
  if (!t.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(t) as { type?: string };
    return parsed?.type === 'doc';
  } catch {
    return false;
  }
}

function walkText(node: unknown, parts: string[]) {
  if (!node || typeof node !== 'object') return;
  const n = node as {
    text?: string;
    content?: unknown[];
  };
  if (n.text) parts.push(n.text);
  if (Array.isArray(n.content)) {
    for (const child of n.content) walkText(child, parts);
  }
}

/** Conteúdo vazio (texto ou JSON TipTap). */
export function isNoteBlank(note: string): boolean {
  const t = note.trim();
  if (!t) return true;
  if (isTipTapJson(t)) {
    try {
      const parts: string[] = [];
      walkText(JSON.parse(t), parts);
      return !parts.join('').trim();
    } catch {
      return true;
    }
  }
  if (typeof document !== 'undefined' && t.includes('<')) {
    const el = document.createElement('div');
    el.innerHTML = t;
    return !(el.textContent || '').trim();
  }
  return false;
}

function parseNoteContent(value: string): {
  content: object | string;
  contentType: 'json' | 'html';
} {
  if (!value?.trim()) {
    return {
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      contentType: 'json',
    };
  }
  if (isTipTapJson(value)) {
    return { content: JSON.parse(value) as object, contentType: 'json' };
  }
  if (value.trim().startsWith('<')) {
    return { content: value, contentType: 'html' };
  }
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  return {
    content: {
      type: 'doc',
      content: lines.map((line) =>
        line
          ? {
              type: 'paragraph',
              content: [{ type: 'text', text: line }],
            }
          : { type: 'paragraph' },
      ),
    },
    contentType: 'json',
  };
}

function MiniBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`sc-doc-note-mini${active ? ' active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type Props = {
  value: string;
  editable: boolean;
  autoFocus?: boolean;
  onChange?: (json: string) => void;
  onEscape?: () => void;
  onSaveShortcut?: () => void;
};

/** Mini editor TipTap para o corpo da nota (formatação como no documento). */
export function DocumentNoteEditor({
  value,
  editable,
  autoFocus,
  onChange,
  onEscape,
  onSaveShortcut,
}: Props) {
  const [, bump] = useState(0);
  const initial = parseNoteContent(value);

  const noteEditor = useEditor({
    editable,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        codeBlock: false,
        hardBreak: false,
        link: { openOnClick: !editable, autolink: true },
      }),
      Placeholder.configure({
        placeholder: 'Escreva a nota…',
      }),
      SoftBreak.configure({ keepMarks: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: initial.content,
    contentType: initial.contentType,
    onUpdate: ({ editor: ed }) => {
      onChange?.(JSON.stringify(ed.getJSON()));
    },
    onSelectionUpdate: () => bump((n) => n + 1),
    onTransaction: () => bump((n) => n + 1),
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onEscape?.();
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          onSaveShortcut?.();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!noteEditor) return;
    noteEditor.setEditable(editable);
  }, [noteEditor, editable]);

  useEffect(() => {
    if (!noteEditor || !autoFocus || !editable) return;
    const t = window.setTimeout(() => noteEditor.commands.focus('end'), 60);
    return () => window.clearTimeout(t);
  }, [noteEditor, autoFocus, editable]);

  useEffect(() => {
    if (!noteEditor) return;
    const current = JSON.stringify(noteEditor.getJSON());
    if (!value?.trim()) {
      const empty = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      });
      if (current !== empty) {
        noteEditor.commands.setContent(
          { type: 'doc', content: [{ type: 'paragraph' }] },
          { emitUpdate: false },
        );
      }
      return;
    }
    if (isTipTapJson(value) && value === current) return;
    const parsed = parseNoteContent(value);
    if (
      parsed.contentType === 'json' &&
      JSON.stringify(parsed.content) === current
    ) {
      return;
    }
    noteEditor.commands.setContent(parsed.content, {
      emitUpdate: false,
      contentType: parsed.contentType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!noteEditor) return null;

  const ed: Editor = noteEditor;

  return (
    <div className={`sc-doc-note-editor${editable ? '' : ' is-readonly'}`}>
      {editable ? (
        <div className="sc-doc-note-toolbar" role="toolbar" aria-label="Formatação">
          <MiniBtn
            title="Negrito"
            active={ed.isActive('bold')}
            onClick={() => ed.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </MiniBtn>
          <MiniBtn
            title="Itálico"
            active={ed.isActive('italic')}
            onClick={() => ed.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </MiniBtn>
          <MiniBtn
            title="Tachado"
            active={ed.isActive('strike')}
            onClick={() => ed.chain().focus().toggleStrike().run()}
          >
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </MiniBtn>
          <MiniBtn
            title="Código"
            active={ed.isActive('code')}
            onClick={() => ed.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </MiniBtn>
          <span className="sc-doc-note-toolbar-sep" />
          <MiniBtn
            title="Lista"
            active={ed.isActive('bulletList')}
            onClick={() => ed.chain().focus().toggleBulletList().run()}
          >
            •
          </MiniBtn>
          <MiniBtn
            title="Lista numerada"
            active={ed.isActive('orderedList')}
            onClick={() => ed.chain().focus().toggleOrderedList().run()}
          >
            1.
          </MiniBtn>
          <MiniBtn
            title="Título"
            active={ed.isActive('heading', { level: 3 })}
            onClick={() =>
              ed.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H
          </MiniBtn>
          <span className="sc-doc-note-toolbar-sep" />
          {HIGHLIGHTS.map((color) => (
            <MiniBtn
              key={color}
              title="Marca-texto"
              active={ed.isActive('highlight', { color })}
              onClick={() => {
                if (ed.isActive('highlight', { color })) {
                  ed.chain().focus().unsetHighlight().run();
                } else {
                  ed.chain().focus().setHighlight({ color }).run();
                }
              }}
            >
              <span
                className="sc-doc-note-swatch"
                style={{ background: color }}
              />
            </MiniBtn>
          ))}
        </div>
      ) : null}
      <EditorContent editor={ed} className="sc-doc-note-surface" />
    </div>
  );
}
