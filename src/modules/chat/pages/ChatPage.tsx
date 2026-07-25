import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  addOutline,
  chatbubbleEllipsesOutline,
  createOutline,
  ellipsisHorizontalOutline,
  stopCircleOutline,
  trashOutline,
} from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { MotionShell } from '../../../shared/motion';

type Role = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

const SUGGESTIONS = [
  {
    title: 'Resuma um conceito',
    prompt: 'Explique de forma simples o que é memória de curto prazo e como estudar para retenção.',
  },
  {
    title: 'Gere flashcards',
    prompt: 'Crie 5 flashcards (frente/verso) sobre fotossíntese para estudo espaçado.',
  },
  {
    title: 'Monte um roteiro',
    prompt: 'Monte um plano de estudo de 7 dias para revisar anatomia, 45 minutos por dia.',
  },
  {
    title: 'Tire uma dúvida',
    prompt: 'Qual a diferença entre aprendizado ativo e passivo? Dê exemplos práticos.',
  },
];

const MOCK_REPLIES = [
  'Por enquanto sou só a interface — o backend da IA ainda não está ligado. Quando conectar, suas perguntas vão sair daqui para o modelo.\n\nEnquanto isso, experimente o layout: novo chat, histórico à esquerda e o composer embaixo, como no ChatGPT.',
  'Recebi sua mensagem. Esta é uma resposta de demonstração do front.\n\nEm breve aqui vai entrar streaming, contexto dos seus cards e PDFs — por agora o foco é a experiência de conversa.',
  'Boa pergunta. No modo demo eu não consulto um modelo real, mas a UI já está pronta para plugar a API.\n\nDica: use Enter para enviar e Shift+Enter para quebrar linha.',
];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function titleFromPrompt(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Novo chat';
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

function createEmptyConversation(): Conversation {
  const now = Date.now();
  return {
    id: uid('conv'),
    title: 'Novo chat',
    updatedAt: now,
    messages: [],
  };
}

export default function ChatPage() {
  const reduce = useReducedMotion();
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    createEmptyConversation(),
  ]);
  const [activeId, setActiveId] = useState(() => conversations[0].id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [activeId, conversations],
  );

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [active?.messages.length, sending, reduce]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [draft]);

  useEffect(() => {
    if (!menuFor) return;
    const onDoc = () => setMenuFor(null);
    window.addEventListener('click', onDoc);
    return () => window.removeEventListener('click', onDoc);
  }, [menuFor]);

  const stopGenerating = useCallback(() => {
    if (abortRef.current) {
      clearTimeout(abortRef.current);
      abortRef.current = null;
    }
    setSending(false);
  }, []);

  const updateConversation = useCallback(
    (id: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? updater(c) : c)),
      );
    },
    [],
  );

  const sendPrompt = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || sending || !active) return;

      const convId = active.id;
      const userMsg: ChatMessage = {
        id: uid('msg'),
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };

      updateConversation(convId, (c) => ({
        ...c,
        title: c.messages.length === 0 ? titleFromPrompt(text) : c.title,
        updatedAt: Date.now(),
        messages: [...c.messages, userMsg],
      }));
      setDraft('');
      setSending(true);
      setHistoryOpen(false);

      const delay = 700 + Math.random() * 900;
      abortRef.current = setTimeout(() => {
        const reply =
          MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
        const assistantMsg: ChatMessage = {
          id: uid('msg'),
          role: 'assistant',
          content: reply,
          createdAt: Date.now(),
        };
        updateConversation(convId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: [...c.messages, assistantMsg],
        }));
        setSending(false);
        abortRef.current = null;
      }, delay);
    },
    [active, sending, updateConversation],
  );

  const newChat = () => {
    stopGenerating();
    const next = createEmptyConversation();
    setConversations((prev) => [next, ...prev]);
    setActiveId(next.id);
    setDraft('');
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const deleteConversation = (id: string) => {
    setMenuFor(null);
    stopGenerating();
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (!next.length) {
        const empty = createEmptyConversation();
        setActiveId(empty.id);
        return [empty];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  };

  const renameConversation = (id: string) => {
    setMenuFor(null);
    const current = conversations.find((c) => c.id === id);
    if (!current) return;
    const next = window.prompt('Renomear conversa', current.title);
    if (next == null) return;
    const title = next.trim() || 'Novo chat';
    updateConversation(id, (c) => ({ ...c, title, updatedAt: Date.now() }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(draft);
    }
  };

  const empty = !active?.messages.length && !sending;

  return (
    <IonPage>
      <IonContent scrollY={false} className="sc-chat-ion">
        <MotionShell className="sc-chat">
          <aside
            className={`sc-chat-history${historyOpen ? ' is-open' : ''}`}
            aria-label="Histórico de conversas"
          >
            <div className="sc-chat-history-head">
              <button
                type="button"
                className="sc-btn primary sc-chat-new"
                onClick={newChat}
              >
                <IonIcon icon={addOutline} />
                Novo chat
              </button>
            </div>
            <div className="sc-chat-history-list">
              {sorted.map((conv) => (
                <div
                  key={conv.id}
                  className={`sc-chat-history-item${
                    conv.id === active?.id ? ' is-active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="sc-chat-history-open"
                    onClick={() => {
                      stopGenerating();
                      setActiveId(conv.id);
                      setHistoryOpen(false);
                    }}
                  >
                    <IonIcon icon={chatbubbleEllipsesOutline} />
                    <span>{conv.title}</span>
                  </button>
                  <div className="sc-chat-history-actions">
                    <button
                      type="button"
                      className="sc-chat-icon-btn"
                      aria-label="Mais opções"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor((v) => (v === conv.id ? null : conv.id));
                      }}
                    >
                      <IonIcon icon={ellipsisHorizontalOutline} />
                    </button>
                    {menuFor === conv.id ? (
                      <div
                        className="sc-chat-item-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => renameConversation(conv.id)}
                        >
                          <IonIcon icon={createOutline} />
                          Renomear
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => deleteConversation(conv.id)}
                        >
                          <IonIcon icon={trashOutline} />
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="sc-chat-history-foot">
              Front only · respostas simuladas
            </p>
          </aside>

          <button
            type="button"
            className={`sc-chat-backdrop${historyOpen ? ' is-open' : ''}`}
            aria-label="Fechar histórico"
            tabIndex={historyOpen ? 0 : -1}
            onClick={() => setHistoryOpen(false)}
          />

          <section className="sc-chat-main">
            <header className="sc-chat-topbar">
              <button
                type="button"
                className="sc-chat-icon-btn sc-chat-history-toggle"
                aria-label="Abrir histórico"
                onClick={() => setHistoryOpen(true)}
              >
                <IonIcon icon={chatbubbleEllipsesOutline} />
              </button>
              <div className="sc-chat-topbar-title">
                <strong>{active?.title ?? 'Assistente'}</strong>
                <span>Assistente de estudo</span>
              </div>
              <button
                type="button"
                className="sc-btn sc-chat-top-new"
                onClick={newChat}
              >
                <IonIcon icon={addOutline} />
                Novo
              </button>
            </header>

            <div ref={listRef} className="sc-chat-thread" role="log">
              {empty ? (
                <div className="sc-chat-empty">
                  <motion.div
                    className="sc-chat-empty-hero"
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="sc-chat-mark" aria-hidden>
                      <IonIcon icon={chatbubbleEllipsesOutline} />
                    </div>
                    <h1>Como posso ajudar nos estudos?</h1>
                    <p>
                      Envie um prompt abaixo. A IA será conectada depois — por
                      agora a interface responde em modo demo.
                    </p>
                  </motion.div>
                  <div className="sc-chat-suggestions">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.title}
                        type="button"
                        className="sc-chat-suggestion"
                        onClick={() => sendPrompt(s.prompt)}
                      >
                        <strong>{s.title}</strong>
                        <span>{s.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sc-chat-messages">
                  {active?.messages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`sc-chat-msg is-${msg.role}`}
                    >
                      <div className="sc-chat-msg-avatar" aria-hidden>
                        {msg.role === 'user' ? 'Você' : 'IA'}
                      </div>
                      <div className="sc-chat-msg-body">
                        <p>{msg.content}</p>
                      </div>
                    </article>
                  ))}
                  {sending ? (
                    <article className="sc-chat-msg is-assistant">
                      <div className="sc-chat-msg-avatar" aria-hidden>
                        IA
                      </div>
                      <div className="sc-chat-msg-body">
                        <div className="sc-chat-typing" aria-label="Gerando">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </article>
                  ) : null}
                </div>
              )}
            </div>

            <div className="sc-chat-composer-wrap">
              <form
                className="sc-chat-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendPrompt(draft);
                }}
              >
                <textarea
                  ref={textareaRef}
                  className="sc-chat-input"
                  rows={1}
                  value={draft}
                  placeholder="Envie uma mensagem…"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={sending}
                  aria-label="Mensagem para o assistente"
                />
                {sending ? (
                  <button
                    type="button"
                    className="sc-btn sc-chat-send is-stop"
                    onClick={stopGenerating}
                    aria-label="Parar geração"
                  >
                    <IonIcon icon={stopCircleOutline} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="sc-btn primary sc-chat-send"
                    disabled={!draft.trim()}
                    aria-label="Enviar"
                  >
                    Enviar
                  </button>
                )}
              </form>
              <p className="sc-chat-disclaimer">
                Enter envia · Shift+Enter nova linha · respostas ainda simuladas
              </p>
            </div>
          </section>
        </MotionShell>
      </IonContent>
    </IonPage>
  );
}
