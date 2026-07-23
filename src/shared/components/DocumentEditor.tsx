import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
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

export function DocumentEditor({
  value,
  onChange,
  editable = true,
  placeholder = 'Escreva notas, exemplos, ideias… Digite / para pensar como no Notion.',
}: Props) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
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

  return (
    <div className={`sc-doc-editor${editable ? '' : ' is-readonly'}`}>
      {editable ? (
        <div className="sc-doc-toolbar" role="toolbar" aria-label="Formatação">
          <button
            type="button"
            className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            H1
          </button>
          <button
            type="button"
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>
          <button
            type="button"
            className={editor.isActive('bold') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={editor.isActive('italic') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            className={editor.isActive('bulletList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • Lista
          </button>
          <button
            type="button"
            className={editor.isActive('orderedList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. Lista
          </button>
          <button
            type="button"
            className={editor.isActive('code') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            `code`
          </button>
          <button
            type="button"
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
            className={editor.isActive('blockquote') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            “ ”
          </button>
        </div>
      ) : null}
      <EditorContent editor={editor} className="sc-doc-surface" />
    </div>
  );
}
