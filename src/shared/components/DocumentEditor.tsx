import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'plaintext', label: 'Texto' },
] as const;

const HIGHLIGHT_COLORS = [
  { color: '#fde047', label: 'Marca-texto amarelo' },
  { color: '#86efac', label: 'Marca-texto verde' },
  { color: '#f9a8d4', label: 'Marca-texto rosa' },
  { color: '#93c5fd', label: 'Marca-texto azul' },
] as const;

type Props = {
  value: string;
  onChange: (json: string) => void;
  editable?: boolean;
  placeholder?: string;
};

function parseDoc(value: string) {
  if (!value?.trim()) return undefined;
  try {
    return JSON.parse(value) as object;
  } catch {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: value ? [{ type: 'text', text: value }] : [],
        },
      ],
    };
  }
}

export function documentToPlainText(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  try {
    const doc = JSON.parse(value) as {
      content?: Array<{
        type?: string;
        content?: Array<{ text?: string; content?: Array<{ text?: string }> }>;
      }>;
    };
    const parts: string[] = [];
    const walk = (nodes?: typeof doc.content) => {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.content) {
          for (const child of node.content) {
            if (child.text) parts.push(child.text);
            if (child.content) walk(child.content as typeof doc.content);
          }
        }
      }
    };
    walk(doc.content);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return value.trim();
  }
}

function AlignIcon({ align }: { align: 'left' | 'center' | 'right' }) {
  const short = align === 'left' ? { x1: 2, x2: 10 } : align === 'center' ? { x1: 4, x2: 12 } : { x1: 6, x2: 14 };
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="2" y1="3.5" x2="14" y2="3.5" />
        <line x1={short.x1} y1="8" x2={short.x2} y2="8" />
        <line x1="2" y1="12.5" x2="14" y2="12.5" />
      </g>
    </svg>
  );
}

export function DocumentEditor({
  value,
  onChange,
  editable = true,
  placeholder = 'Escreva notas, exemplos, ideias… Digite / para pensar como no Notion.',
}: Props) {
  const editor = useEditor({
    editable,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
        },
      }),
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: parseDoc(value),
    onUpdate: ({ editor: ed }) => {
      onChange(JSON.stringify(ed.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (!value) {
      if (current !== JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })) {
        editor.commands.setContent(
          { type: 'doc', content: [{ type: 'paragraph' }] },
          { emitUpdate: false },
        );
      }
      return;
    }
    if (value !== current) {
      editor.commands.setContent(parseDoc(value) ?? '', { emitUpdate: false });
    }
    // only sync when external value identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const setCodeLanguage = (language: string) => {
    editor.chain().focus().updateAttributes('codeBlock', { language }).run();
  };

  const activeLanguage =
    (editor.getAttributes('codeBlock').language as string | undefined) ??
    'typescript';

  const toggleLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Endereço do link', previous ?? 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run();
  };

  const toggleHighlight = (color: string) => {
    if (editor.isActive('highlight', { color })) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  };

  return (
    <div className={`sc-doc-editor${editable ? '' : ' is-readonly'}`}>
      {editable ? (
        <div className="sc-doc-toolbar" role="toolbar" aria-label="Formatação">
          <button
            type="button"
            title="Desfazer (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↺
          </button>
          <button
            type="button"
            title="Refazer (Ctrl+Y)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↻
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Título 1"
            className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            H1
          </button>
          <button
            type="button"
            title="Título 2"
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>
          <button
            type="button"
            title="Título 3"
            className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Negrito (Ctrl+B)"
            className={editor.isActive('bold') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            title="Itálico (Ctrl+I)"
            className={editor.isActive('italic') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            title="Sublinhado (Ctrl+U)"
            className={editor.isActive('underline') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span style={{ textDecoration: 'underline' }}>U</span>
          </button>
          <button
            type="button"
            title="Tachado"
            className={editor.isActive('strike') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </button>
          <button
            type="button"
            title="Sobrescrito (x²)"
            className={editor.isActive('superscript') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            x²
          </button>
          <button
            type="button"
            title="Subscrito (x₂)"
            className={editor.isActive('subscript') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            x₂
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          {HIGHLIGHT_COLORS.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              title={label}
              className={`sc-doc-swatch${
                editor.isActive('highlight', { color }) ? ' active' : ''
              }`}
              onClick={() => toggleHighlight(color)}
            >
              <span
                className="sc-doc-swatch-dot"
                style={{ background: color }}
              />
            </button>
          ))}

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Inserir/editar link"
            className={editor.isActive('link') ? 'active' : ''}
            onClick={toggleLink}
          >
            Link
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Alinhar à esquerda"
            className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleTextAlign('left').run()}
          >
            <AlignIcon align="left" />
          </button>
          <button
            type="button"
            title="Centralizar"
            className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleTextAlign('center').run()
            }
          >
            <AlignIcon align="center" />
          </button>
          <button
            type="button"
            title="Alinhar à direita"
            className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleTextAlign('right').run()
            }
          >
            <AlignIcon align="right" />
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Lista com marcadores"
            className={editor.isActive('bulletList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • Lista
          </button>
          <button
            type="button"
            title="Lista numerada"
            className={editor.isActive('orderedList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. Lista
          </button>
          <button
            type="button"
            title="Lista de tarefas"
            className={editor.isActive('taskList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ✓ Tarefas
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Citação"
            className={editor.isActive('blockquote') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            “ ”
          </button>
          <button
            type="button"
            title="Código em linha"
            className={editor.isActive('code') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            `code`
          </button>
          <button
            type="button"
            title="Bloco de código"
            className={editor.isActive('codeBlock') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {'</>'} Bloco
          </button>
          <select
            className="sc-doc-lang"
            value={activeLanguage}
            aria-label="Linguagem do código"
            onChange={(e) => {
              if (!editor.isActive('codeBlock')) {
                editor.chain().focus().toggleCodeBlock().run();
              }
              setCodeLanguage(e.target.value);
            }}
          >
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Linha divisória"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </button>

          <span className="sc-doc-sep" aria-hidden="true" />

          <button
            type="button"
            title="Limpar formatação"
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            Limpar
          </button>
        </div>
      ) : null}
      <EditorContent editor={editor} className="sc-doc-surface" />
    </div>
  );
}
