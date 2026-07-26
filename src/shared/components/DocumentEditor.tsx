import { useEffect, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Markdown } from '@tiptap/markdown';
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
  { color: '#fde047', label: 'Amarelo', shortcut: 'Mod-Shift-1' },
  { color: '#86efac', label: 'Verde', shortcut: 'Mod-Shift-2' },
  { color: '#f9a8d4', label: 'Rosa', shortcut: 'Mod-Shift-3' },
  { color: '#93c5fd', label: 'Azul', shortcut: 'Mod-Shift-4' },
] as const;

type RibbonTab = 'inicio' | 'inserir' | 'marcar';

const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'inserir', label: 'Inserir' },
  { id: 'marcar', label: 'Marcar' },
];

type Props = {
  value: string;
  onChange: (json: string) => void;
  editable?: boolean;
  placeholder?: string;
};

function isMac() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
  );
}

function shortcutLabel(modShortcut: string): string {
  const mac = isMac();
  return modShortcut
    .replace(/Mod/g, mac ? '⌘' : 'Ctrl')
    .replace(/Shift/g, mac ? '⇧' : 'Shift')
    .replace(/Alt/g, mac ? '⌥' : 'Alt')
    .replace(/-/g, '+');
}

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

type DocContent = {
  content: object | string;
  contentType: 'json' | 'markdown';
};

/** JSON TipTap ou Markdown — Markdown fica bonito na leitura. */
function parseDoc(value: string): DocContent | undefined {
  if (!value?.trim()) return undefined;
  if (isTipTapJson(value)) {
    return { content: JSON.parse(value) as object, contentType: 'json' };
  }
  return { content: value, contentType: 'markdown' };
}

export function documentToPlainText(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  if (isTipTapJson(value)) {
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
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function promptLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined;
  const url = window.prompt('Endereço do link', previous ?? 'https://');
  if (url === null) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'https://') {
    return editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }
  return editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: trimmed })
    .run();
}

function toggleHighlightColor(editor: Editor, color: string) {
  if (editor.isActive('highlight', { color })) {
    return editor.chain().focus().unsetHighlight().run();
  }
  return editor.chain().focus().setHighlight({ color }).run();
}

/**
 * Atalhos extras só disparam com o TipTap focado (ProseMirror keymap).
 * Não afetam o verso curto nem outros campos fora do documento.
 */
const DocumentShortcuts = Extension.create({
  name: 'documentShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-k': () => promptLink(this.editor),
      'Mod-Shift-h': () => this.editor.commands.setHorizontalRule(),
      'Mod-Shift-t': () => this.editor.commands.toggleTaskList(),
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      'Mod-Shift-.': () => this.editor.commands.toggleSuperscript(),
      'Mod-Shift-,': () => this.editor.commands.toggleSubscript(),
      'Mod-Shift-l': () => this.editor.commands.toggleTextAlign('left'),
      'Mod-Shift-e': () => this.editor.commands.toggleTextAlign('center'),
      'Mod-Shift-r': () => this.editor.commands.toggleTextAlign('right'),
      'Mod-\\': () =>
        this.editor.chain().focus().unsetAllMarks().clearNodes().run(),
      'Mod-Shift-1': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[0].color),
      'Mod-Shift-2': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[1].color),
      'Mod-Shift-3': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[2].color),
      'Mod-Shift-4': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[3].color),
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
    };
  },
});

function AlignIcon({ align }: { align: 'left' | 'center' | 'right' }) {
  const short =
    align === 'left'
      ? { x1: 2, x2: 10 }
      : align === 'center'
        ? { x1: 4, x2: 12 }
        : { x1: 6, x2: 14 };
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

function ToolButton({
  title,
  shortcut,
  active,
  disabled,
  onClick,
  children,
  className = '',
}: {
  title: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  const tip = shortcut ? `${title} (${shortcutLabel(shortcut)})` : title;
  return (
    <button
      type="button"
      title={tip}
      aria-label={tip}
      aria-pressed={active}
      disabled={disabled}
      className={`${className}${active ? ' active' : ''}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="sc-doc-group">
      <div className="sc-doc-group-tools">{children}</div>
      <span className="sc-doc-group-label">{label}</span>
    </div>
  );
}

export function DocumentEditor({
  value,
  onChange,
  editable = true,
  placeholder = 'Markdown: # título, **negrito**, listas, `código`…',
}: Props) {
  const [tab, setTab] = useState<RibbonTab>('inicio');

  const initialDoc = parseDoc(value);

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
      Markdown,
      DocumentShortcuts,
    ],
    content: initialDoc?.content ?? '',
    contentType: initialDoc?.contentType ?? 'json',
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
      if (
        current !==
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
      ) {
        editor.commands.setContent(
          { type: 'doc', content: [{ type: 'paragraph' }] },
          { emitUpdate: false },
        );
      }
      return;
    }
    if (isTipTapJson(value) && value === current) return;
    const parsed = parseDoc(value);
    if (!parsed) return;
    if (parsed.contentType === 'json' && JSON.stringify(parsed.content) === current) {
      return;
    }
    editor.commands.setContent(parsed.content, {
      emitUpdate: false,
      contentType: parsed.contentType,
    });
    // only sync when external value identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const activeLanguage =
    (editor.getAttributes('codeBlock').language as string | undefined) ??
    'typescript';

  const setCodeLanguage = (language: string) => {
    editor.chain().focus().updateAttributes('codeBlock', { language }).run();
  };

  return (
    <div className={`sc-doc-editor${editable ? '' : ' is-readonly'}`}>
      {editable ? (
        <div className="sc-doc-ribbon">
          <div className="sc-doc-ribbon-tabs" role="tablist" aria-label="Ferramentas">
            {RIBBON_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`sc-doc-ribbon-tab${tab === item.id ? ' active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            className="sc-doc-ribbon-panel"
            role="tabpanel"
            aria-label={RIBBON_TABS.find((t) => t.id === tab)?.label}
          >
            {tab === 'inicio' ? (
              <>
                <Group label="Área de transferência">
                  <ToolButton
                    title="Desfazer"
                    shortcut="Mod-z"
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}
                  >
                    ↺
                  </ToolButton>
                  <ToolButton
                    title="Refazer"
                    shortcut="Mod-y"
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}
                  >
                    ↻
                  </ToolButton>
                </Group>

                <Group label="Fonte">
                  <ToolButton
                    title="Negrito"
                    shortcut="Mod-b"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <strong>B</strong>
                  </ToolButton>
                  <ToolButton
                    title="Itálico"
                    shortcut="Mod-i"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <em>I</em>
                  </ToolButton>
                  <ToolButton
                    title="Sublinhado"
                    shortcut="Mod-u"
                    active={editor.isActive('underline')}
                    onClick={() =>
                      editor.chain().focus().toggleUnderline().run()
                    }
                  >
                    <span style={{ textDecoration: 'underline' }}>U</span>
                  </ToolButton>
                  <ToolButton
                    title="Tachado"
                    shortcut="Mod-Shift-x"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                  >
                    <span style={{ textDecoration: 'line-through' }}>S</span>
                  </ToolButton>
                  <ToolButton
                    title="Código em linha"
                    shortcut="Mod-e"
                    active={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                  >
                    `code`
                  </ToolButton>
                  <ToolButton
                    title="Limpar formatação"
                    shortcut="Mod-\\"
                    onClick={() =>
                      editor.chain().focus().unsetAllMarks().clearNodes().run()
                    }
                  >
                    Limpar
                  </ToolButton>
                </Group>

                <Group label="Parágrafo">
                  <ToolButton
                    title="Título 1"
                    shortcut="Mod-Alt-1"
                    active={editor.isActive('heading', { level: 1 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                  >
                    H1
                  </ToolButton>
                  <ToolButton
                    title="Título 2"
                    shortcut="Mod-Alt-2"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                  >
                    H2
                  </ToolButton>
                  <ToolButton
                    title="Título 3"
                    shortcut="Mod-Alt-3"
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                  >
                    H3
                  </ToolButton>
                  <ToolButton
                    title="Texto normal"
                    shortcut="Mod-Alt-0"
                    active={editor.isActive('paragraph')}
                    onClick={() => editor.chain().focus().setParagraph().run()}
                  >
                    ¶
                  </ToolButton>
                  <ToolButton
                    title="Lista com marcadores"
                    shortcut="Mod-Shift-8"
                    active={editor.isActive('bulletList')}
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                  >
                    • Lista
                  </ToolButton>
                  <ToolButton
                    title="Lista numerada"
                    shortcut="Mod-Shift-7"
                    active={editor.isActive('orderedList')}
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                  >
                    1. Lista
                  </ToolButton>
                </Group>

                <Group label="Alinhamento">
                  <ToolButton
                    title="Alinhar à esquerda"
                    shortcut="Mod-Shift-l"
                    active={editor.isActive({ textAlign: 'left' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('left').run()
                    }
                  >
                    <AlignIcon align="left" />
                  </ToolButton>
                  <ToolButton
                    title="Centralizar"
                    shortcut="Mod-Shift-e"
                    active={editor.isActive({ textAlign: 'center' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('center').run()
                    }
                  >
                    <AlignIcon align="center" />
                  </ToolButton>
                  <ToolButton
                    title="Alinhar à direita"
                    shortcut="Mod-Shift-r"
                    active={editor.isActive({ textAlign: 'right' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('right').run()
                    }
                  >
                    <AlignIcon align="right" />
                  </ToolButton>
                </Group>
              </>
            ) : null}

            {tab === 'inserir' ? (
              <>
                <Group label="Links">
                  <ToolButton
                    title="Inserir/editar link"
                    shortcut="Mod-Shift-k"
                    active={editor.isActive('link')}
                    onClick={() => promptLink(editor)}
                  >
                    Link
                  </ToolButton>
                </Group>

                <Group label="Blocos">
                  <ToolButton
                    title="Citação"
                    shortcut="Mod-Shift-b"
                    active={editor.isActive('blockquote')}
                    onClick={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                  >
                    “ ”
                  </ToolButton>
                  <ToolButton
                    title="Bloco de código"
                    shortcut="Mod-Alt-c"
                    active={editor.isActive('codeBlock')}
                    onClick={() =>
                      editor.chain().focus().toggleCodeBlock().run()
                    }
                  >
                    {'</>'} Bloco
                  </ToolButton>
                  <select
                    className="sc-doc-lang"
                    value={activeLanguage}
                    aria-label="Linguagem do código"
                    title="Linguagem do bloco de código"
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
                  <ToolButton
                    title="Linha divisória"
                    shortcut="Mod-Shift-h"
                    onClick={() =>
                      editor.chain().focus().setHorizontalRule().run()
                    }
                  >
                    —
                  </ToolButton>
                </Group>

                <Group label="Listas">
                  <ToolButton
                    title="Lista de tarefas"
                    shortcut="Mod-Shift-t"
                    active={editor.isActive('taskList')}
                    onClick={() =>
                      editor.chain().focus().toggleTaskList().run()
                    }
                  >
                    ✓ Tarefas
                  </ToolButton>
                </Group>
              </>
            ) : null}

            {tab === 'marcar' ? (
              <>
                <Group label="Marca-texto">
                  {HIGHLIGHT_COLORS.map(({ color, label, shortcut }) => (
                    <ToolButton
                      key={color}
                      title={`Marca-texto ${label.toLowerCase()}`}
                      shortcut={shortcut}
                      className="sc-doc-swatch"
                      active={editor.isActive('highlight', { color })}
                      onClick={() => toggleHighlightColor(editor, color)}
                    >
                      <span
                        className="sc-doc-swatch-dot"
                        style={{ background: color }}
                      />
                    </ToolButton>
                  ))}
                  <ToolButton
                    title="Remover marca-texto"
                    active={editor.isActive('highlight')}
                    onClick={() =>
                      editor.chain().focus().unsetHighlight().run()
                    }
                  >
                    Sem marca
                  </ToolButton>
                </Group>

                <Group label="Script">
                  <ToolButton
                    title="Sobrescrito"
                    shortcut="Mod-Shift-."
                    active={editor.isActive('superscript')}
                    onClick={() =>
                      editor.chain().focus().toggleSuperscript().run()
                    }
                  >
                    x²
                  </ToolButton>
                  <ToolButton
                    title="Subscrito"
                    shortcut="Mod-Shift-,"
                    active={editor.isActive('subscript')}
                    onClick={() =>
                      editor.chain().focus().toggleSubscript().run()
                    }
                  >
                    x₂
                  </ToolButton>
                </Group>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <EditorContent editor={editor} className="sc-doc-surface" />
    </div>
  );
}
