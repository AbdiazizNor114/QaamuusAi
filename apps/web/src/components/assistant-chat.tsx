"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, Globe, MessageCircle, PenLine, Send, X } from "lucide-react";
export function AssistantChat() {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const starters = [
    {
      Icon: Globe,
      text: "Speak in Somali or English",
      question: "Can you help me practise a conversation in Somali?",
    },
    {
      Icon: Code2,
      text: "Build and debug code",
      question: "Help me plan an accessible Somali language application.",
    },
    {
      Icon: PenLine,
      text: "Write, learn and explore ideas",
      question: "Help me explain my project clearly to potential contributors.",
    },
  ];
  return (
    <>
      <button
        className="assistant-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span>AI Chat</span>
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
            <span className="assistant-eyebrow">FREE AI PILOT · LIMITED AVAILABILITY</span>
            <h2 id="assistant-title">QaamuusAI Assistant</h2>
          </div>
          <button type="button" aria-label="Close AI chat" onClick={() => setOpen(false)}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="assistant-conversation">
          <div className="assistant-intro">
            <MessageCircle size={30} aria-hidden="true" />
            <h3>What would you like to explore?</h3>
            <p>
              We’re preparing a general-purpose AI assistant for conversation, coding, writing and
              explanations, with QaamuusAI project guidance alongside it.
            </p>
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
          <div id="assistant-status" className="assistant-status" role="status">
            <strong>Free AI pilot · up to 50 requests per day</strong>
            <p>
              The daily allowance is shared across all users, not 50 requests per person. We plan to
              test Llama 3.3 70B through OpenRouter’s free tier; availability and limits may change.
              Somali accuracy is unverified. Connection pending: AI replies are not enabled, and
              drafts stay on this page.
            </p>
          </div>
        </div>
        <div className="assistant-controls">
          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="assistant-question">Your question</label>
            <textarea
              ref={input}
              id="assistant-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask in Somali or English…"
              maxLength={1500}
              rows={2}
            />
            <div className="assistant-compose-actions">
              <button
                type="button"
                disabled={!draft}
                onClick={() => {
                  setDraft("");
                  input.current?.focus();
                }}
              >
                Clear draft
              </button>
              <button className="assistant-send" type="submit" disabled>
                Send <Send size={15} aria-hidden="true" />
              </button>
            </div>
          </form>
          <p className="assistant-privacy">
            Your draft stays on this page and clears on reload. Voice, file uploads and live web
            search are not connected.
          </p>
          <nav aria-label="AI helper resources">
            <Link href="/ai">Our AI vision</Link>
            <Link href="/developers">Developer tools</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </dialog>
    </>
  );
}
