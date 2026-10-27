"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import { ArrowRight, BookOpen, Code2, MessageCircle, Send, Users, X } from "lucide-react";
import { findProjectNotes, type GuideNote } from "@/lib/project-guide";
import type { ChatMessage } from "@/lib/chat-contract";
type Exchange = { question: string; notes: GuideNote[] };
export function AssistantChat() {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(""),
    [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [dataUseAccepted, setDataUseAccepted] = useState(false);
  const [mode, setMode] = useState<"ai" | "guide">("ai");
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [configured, setConfigured] = useState<boolean | null>(null);
  const [retryAt, setRetryAt] = useState(0),
    [clock, setClock] = useState(0);
  const retrySeconds = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const pending = useRef<AbortController | null>(null),
    inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [exchanges, open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/assistant", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const status = await response.json();
        setConfigured(status.configured === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfigured(false);
      });
    return () => controller.abort();
  }, [open]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, open]);
  async function sendAI() {
    const question = draft.trim();
    if (!question || inFlight.current || retrySeconds > 0 || !dataUseAccepted) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    const history = next.slice(-7);
    if (history.reduce((n, m) => n + m.content.length, 0) > 18000) {
      setError("This conversation is long. Clear AI chat before continuing.");
      return;
    }
    inFlight.current = true;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setDraft("");
    setMessages(next);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, provider_data_use_accepted: dataUseAccepted }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const seconds = Number(data.retry_after_seconds ?? response.headers.get("Retry-After"));
        if (Number.isFinite(seconds) && seconds > 0) {
          const now = Date.now();
          setClock(now);
          setRetryAt(now + Math.min(seconds, 86400) * 1000);
        }
        throw new Error(data.error);
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            data.answer +
            (data.truncated ? "\n\n[Reply reached the length limit. Ask me to continue.]" : ""),
        },
      ]);
    } catch (e) {
      setMessages(next.slice(0, -1));
      setDraft(question);
      setError(
        controller.signal.aborted
          ? "Reply stopped. You can edit or resend your question."
          : e instanceof Error
            ? e.message
            : "Could not send your question.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      pending.current = null;
      input.current?.focus();
    }
  }
  const starters = [
    { Icon: BookOpen, text: "What is QaamuusAI?", question: "What is the goal of QaamuusAI?" },
    { Icon: Users, text: "How can I contribute?", question: "How can I join and contribute?" },
    {
      Icon: Code2,
      text: "What tools can developers use?",
      question: "What API and datasets can developers use?",
    },
  ];
  function send() {
    const question = draft.trim();
    if (!question) return;
    setExchanges((previous) => [
      ...previous.slice(-9),
      { question, notes: findProjectNotes(question, previous.at(-1)?.notes ?? []) },
    ]);
    setDraft("");
    input.current?.focus();
  }
  return (
    <>
      <button
        className="assistant-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span>Ask QaamuusAI</span>
      </button>
      <dialog
        ref={dialog}
        className="assistant-dialog"
        aria-labelledby="assistant-title"
        aria-describedby="assistant-status"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <header>
          <div>
            <span className="assistant-eyebrow">QAAMUUSAI</span>
            <h2 id="assistant-title">QaamuusAI assistant</h2>
          </div>
          <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="assistant-mode" role="group" aria-label="Chat mode">
          <button
            type="button"
            aria-pressed={mode === "ai"}
            disabled={busy}
            onClick={() => {
              setMode("ai");
              setError("");
            }}
          >
            Free AI chat
          </button>
          <button
            type="button"
            aria-pressed={mode === "guide"}
            disabled={busy}
            onClick={() => {
              setMode("guide");
              setError("");
            }}
          >
            Project guide
          </button>
        </div>
        <div
          className="assistant-conversation"
          tabIndex={0}
          role="region"
          aria-label="Conversation panel"
        >
          {mode === "ai" ? (
            <>
              <div id="assistant-status" className="assistant-status">
                <span>Free AI · limited availability</span>
                {configured === null ? (
                  <p role="status">Checking connection…</p>
                ) : (
                  !configured && (
                    <p role="status">
                      AI chat is not connected yet. An administrator needs to add the server key.
                      You can use Project guide now.
                    </p>
                  )
                )}
              </div>
              {!messages.length && (
                <div className="assistant-intro">
                  <h3>How can I help?</h3>
                  <p>Ask about QaamuusAI, code, or an idea.</p>
                </div>
              )}
              <div role="log" aria-label="AI conversation" aria-live="polite">
                {messages.map((message, index) => (
                  <div
                    className={message.role === "user" ? "guide-question" : "guide-answer"}
                    key={index}
                  >
                    <strong>{message.role === "user" ? "You" : "AI response · OpenRouter"}</strong>
                    {message.role === "assistant" ? (
                      <div className="assistant-markdown">
                        <Markdown
                          skipHtml
                          components={{ pre: ({ children }) => <pre tabIndex={0}>{children}</pre> }}
                        >
                          {message.content}
                        </Markdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                ))}
                {busy && <p role="status">Preparing an answer…</p>}
              </div>
              {error && (
                <div className="assistant-error" role="status">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("guide");
                      setError("");
                    }}
                  >
                    Use Project guide
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div id="assistant-status" className="assistant-status">
                <span>Project notes · works locally</span>
              </div>
              {!exchanges.length && (
                <div className="assistant-intro">
                  <h3>Get to know the project.</h3>
                  <p>Choose a topic or ask a question.</p>
                  {starters.map(({ Icon, text, question }) => (
                    <button
                      type="button"
                      key={text}
                      onClick={() => {
                        setDraft(question);
                        input.current?.focus();
                      }}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{text}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
              <div role="log" aria-label="Project guide conversation" aria-live="polite">
                {exchanges.map((exchange, index) => (
                  <div key={index}>
                    <div className="guide-question">
                      <strong>You</strong>
                      <p>{exchange.question}</p>
                    </div>
                    <div className="guide-answer">
                      <strong>From the project guide</strong>
                      {exchange.notes.length ? (
                        exchange.notes.map((note) => (
                          <section key={note.id}>
                            <h3>{note.title}</h3>
                            <p>{note.text}</p>
                            {note.code && (
                              <pre
                                className="guide-code"
                                tabIndex={0}
                                aria-label="API example code"
                              >
                                <code>{note.code}</code>
                              </pre>
                            )}
                            <a href={note.href}>
                              Read the source <ArrowRight size={12} aria-hidden="true" />
                            </a>
                          </section>
                        ))
                      ) : (
                        <>
                          <p>
                            I couldn’t find matching project notes. Try asking about contributing,
                            tasks, speech, the API, licensing or funding. This guide cannot generate
                            general answers.
                          </p>
                          <Link href="/ai">Read our project overview</Link>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div ref={bottom} />
        </div>
        <div className="assistant-controls">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (mode === "ai") void sendAI();
              else send();
            }}
          >
            {mode === "ai" && (
              <label className="assistant-data-consent">
                <input
                  type="checkbox"
                  checked={dataUseAccepted}
                  disabled={busy}
                  onChange={(event) => setDataUseAccepted(event.target.checked)}
                />
                <span>
                  I agree to NVIDIA recording chats and using them to improve its products. No
                  personal or confidential information.{" "}
                  <a
                    href="https://openrouter.ai/nvidia/nemotron-3.5-lightning:free"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Provider terms
                  </a>
                </span>
              </label>
            )}
            <label htmlFor="assistant-question">Your question</label>
            <textarea
              ref={input}
              id="assistant-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={mode === "ai" ? "Message QaamuusAI…" : "Ask about QaamuusAI…"}
              disabled={busy}
              maxLength={2000}
              rows={2}
            />
            <div className="assistant-compose-actions">
              <button
                type="button"
                disabled={busy || (!draft && !(mode === "ai" ? messages.length : exchanges.length))}
                onClick={() => {
                  setDraft("");
                  if (mode === "ai") setMessages([]);
                  else setExchanges([]);
                  setError("");
                  input.current?.focus();
                }}
              >
                Clear chat
              </button>
              {busy ? (
                <button type="button" onClick={() => pending.current?.abort()}>
                  Stop reply
                </button>
              ) : (
                <button
                  className="assistant-send"
                  type="submit"
                  disabled={
                    !draft.trim() ||
                    (mode === "ai" && (configured !== true || retrySeconds > 0 || !dataUseAccepted))
                  }
                >
                  {mode === "ai" && retrySeconds > 0 ? `Wait ${retrySeconds}s` : "Send"}{" "}
                  <Send size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
          <details className="assistant-info">
            <summary>About this chat &amp; privacy</summary>
            <p className="assistant-privacy">
              {mode === "ai"
                ? "Sending shares your question and recent chat with OpenRouter and NVIDIA. NVIDIA records chats for security and may use them to improve its products. Do not send personal or confidential information. Chat clears on reload."
                : "Project guide works locally from curated notes, without generated AI. No questions are sent to an external model, and it has no provider quota."}
            </p>
            {mode === "ai" && (
              <p className="assistant-privacy">
                NVIDIA Nemotron 3.5 Lightning · up to 50 shared requests daily. Answers can be
                wrong; Somali quality is unverified. No web search, voice, files or account actions.
                No paid fallback.
              </p>
            )}
          </details>
          <nav aria-label="Project guide resources">
            <Link href="/ai">AI vision</Link>
            <Link href="/developers">Developer tools</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </dialog>
    </>
  );
}
