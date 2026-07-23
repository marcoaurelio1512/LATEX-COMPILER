"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/services/api";
import type { ContentSearchHit } from "@/types";

interface Props {
  open: boolean;
  projectId: string;
  activePath: string | null;
  activeContent: string | null;
  onClose: () => void;
  onJump: (path: string, line: number, column?: number) => void;
  onFindInEditor: (query: string, options: { caseSensitive: boolean; reverse?: boolean; select?: boolean }) => {
    current: number;
    total: number;
  } | null;
  onClearFind?: () => void;
}

export function FindBar({
  open,
  projectId,
  activePath,
  activeContent,
  onClose,
  onJump,
  onFindInEditor,
  onClearFind,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const findFnRef = useRef(onFindInEditor);
  findFnRef.current = onFindInEditor;

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"file" | "project">("file");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [status, setStatus] = useState("");
  const [hits, setHits] = useState<ContentSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      inputRef.current?.select();
    } else {
      onClearFind?.();
      setStatus("");
      setHits([]);
    }
  }, [open, onClearFind]);

  // Atualiza contagem/destaque ao digitar (neste arquivo)
  useEffect(() => {
    if (!open || scope !== "file") return;
    if (!query.trim()) {
      setStatus("");
      onClearFind?.();
      return;
    }
    if (!activePath) {
      setStatus("Abra um arquivo para procurar nele");
      return;
    }
    const result = findFnRef.current(query, {
      caseSensitive,
      select: false,
    });
    if (result == null) {
      setStatus("Editor ainda carregando…");
      return;
    }
    if (result.total > 0) {
      setStatus(`${result.current} de ${result.total}`);
    } else {
      setStatus("Nenhuma ocorrência");
    }
  }, [query, caseSensitive, scope, activePath, activeContent, open, onClearFind]);

  if (!open) return null;

  const findNext = (reverse = false) => {
    if (!query.trim()) return;
    if (scope !== "file") return;
    if (!activePath) {
      setStatus("Abra um arquivo para procurar nele");
      return;
    }
    const result = findFnRef.current(query, {
      caseSensitive,
      reverse,
      select: true,
    });
    if (result == null) {
      setStatus("Editor ainda carregando…");
      return;
    }
    if (result.total > 0) {
      setStatus(`${result.current} de ${result.total}`);
    } else {
      setStatus("Nenhuma ocorrência");
    }
  };

  const searchProject = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setStatus("Buscando…");
    try {
      const res = await api.searchContent(projectId, query, caseSensitive);
      setHits(res.hits);
      setTruncated(res.truncated);
      setStatus(
        res.hits.length === 0
          ? "Nenhuma ocorrência no projeto"
          : `${res.hits.length} ocorrência(s)${res.truncated ? " (limitado)" : ""}`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha na busca");
      setHits([]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (scope === "project") void searchProject();
    else findNext(false);
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/95">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-2 px-3 py-2"
      >
        <span className="text-xs font-medium text-zinc-300">Procurar</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
            if (e.key === "Enter" && e.shiftKey && scope === "file") {
              e.preventDefault();
              findNext(true);
            }
          }}
          placeholder={
            scope === "file"
              ? "Palavra ou frase neste arquivo…"
              : "Palavra ou frase no projeto…"
          }
          className="min-w-[12rem] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-sky-500"
        />
        <div className="flex rounded border border-zinc-700 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setScope("file");
              setHits([]);
            }}
            className={`px-2 py-1 ${
              scope === "file" ? "bg-sky-600 text-white" : "text-zinc-300"
            }`}
          >
            Neste arquivo
          </button>
          <button
            type="button"
            onClick={() => setScope("project")}
            className={`px-2 py-1 ${
              scope === "project" ? "bg-sky-600 text-white" : "text-zinc-300"
            }`}
          >
            No projeto
          </button>
        </div>
        <label
          className="flex items-center gap-1 text-[11px] text-zinc-400"
          title="Diferenciar maiúsculas/minúsculas"
        >
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Aa
        </label>
        {scope === "file" ? (
          <>
            <button
              type="button"
              onClick={() => findNext(true)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-sky-500"
              title="Anterior (Shift+Enter)"
            >
              ↑
            </button>
            <button
              type="submit"
              className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-sky-500"
              title="Próximo (Enter)"
            >
              ↓
            </button>
          </>
        ) : (
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="rounded bg-sky-600 px-3 py-1 text-xs font-medium hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? "…" : "Buscar"}
          </button>
        )}
        <span className="min-w-[7rem] text-[11px] text-zinc-500">{status}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500"
          title="Fechar (Esc)"
        >
          Fechar
        </button>
      </form>

      {scope === "project" && hits.length > 0 && (
        <ul className="max-h-48 overflow-y-auto border-t border-zinc-800">
          {hits.map((h, i) => (
            <li key={`${h.path}:${h.line}:${i}`}>
              <button
                type="button"
                onClick={() => onJump(h.path, h.line, h.column)}
                className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-zinc-800/80"
              >
                <span className="text-[11px] text-sky-300">
                  {h.path}
                  <span className="text-zinc-500">:{h.line}</span>
                </span>
                <span className="truncate font-mono text-[11px] text-zinc-400">
                  {h.preview}
                </span>
              </button>
            </li>
          ))}
          {truncated && (
            <li className="px-3 py-1 text-[11px] text-amber-400">
              Resultados limitados — refine a busca.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
