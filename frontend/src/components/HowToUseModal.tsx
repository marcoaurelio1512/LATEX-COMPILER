"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api";
import { MarkdownLite } from "./MarkdownLite";

interface Topic {
  id: string;
  title: string;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "secao"
  );
}

function parseTopics(markdown: string): Topic[] {
  const topics: Topic[] = [];
  const seen: Record<string, number> = {};
  for (const line of markdown.split("\n")) {
    const m = line.match(/^##\s+(.+)$/);
    if (!m) continue;
    const title = m[1].trim();
    const base = slug(title);
    const n = seen[base] ?? 0;
    seen[base] = n + 1;
    topics.push({ id: n === 0 ? base : `${base}-${n}`, title });
  }
  return topics;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HowToUseModal({ open, onClose }: Props) {
  const [markdown, setMarkdown] = useState("");
  const [title, setTitle] = useState("Como usar");
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void api
      .getManual()
      .then((r) => {
        setMarkdown(r.markdown);
        setTitle(r.title);
        const topics = parseTopics(r.markdown);
        if (topics[0]) setActiveId(topics[0].id);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Falha ao carregar o manual"),
      )
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const topics = useMemo(() => parseTopics(markdown), [markdown]);

  const jump = (id: string) => {
    setActiveId(id);
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Como usar"
        className="flex h-[min(90vh,880px)] w-full max-w-5xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 sm:flex">
          <div className="border-b border-zinc-800 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-sky-400">
              Manual
            </p>
            <h2 className="text-sm font-semibold text-zinc-100">Tópicos</h2>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => jump(t.id)}
                className={`mb-0.5 w-full rounded px-2 py-1.5 text-left text-xs leading-snug ${
                  activeId === t.id
                    ? "bg-sky-600/30 text-sky-100"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {t.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div>
              <h1 className="text-base font-semibold text-white">{title}</h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                Guia para estudantes e iniciantes · Esc fecha
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500"
            >
              Fechar
            </button>
          </header>

          <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {loading && (
              <p className="text-sm text-zinc-400">Carregando manual…</p>
            )}
            {error && (
              <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            {!loading && !error && markdown && (
              <MarkdownLite markdown={markdown} activeId={activeId} />
            )}
          </div>

          <div className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-500 sm:hidden">
            Role a página para ver todos os tópicos do manual.
          </div>
        </div>
      </div>
    </div>
  );
}
