"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { BibEntryItem, FigureItem } from "@/types";

export type InsertMode = "figure" | "cite" | null;

interface Props {
  open: InsertMode;
  projectId: string;
  onClose: () => void;
  onInsert: (snippet: string) => void;
}

function figureSnippet(item: FigureItem, withEnv: boolean): string {
  // Só o nome do arquivo: \graphicspath resolve figuras/ (e ../figuras/)
  const name = item.name || item.path.split("/").pop() || item.path;
  const label = name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_");
  if (withEnv) {
    return [
      "\\begin{figure}[ht]",
      "  \\centering",
      `  \\includegraphics[width=0.8\\linewidth]{${name}}`,
      "  \\caption{Legenda da figura.}",
      `  \\label{fig:${label}}`,
      "\\end{figure}",
      "",
    ].join("\n");
  }
  return `\\includegraphics[width=0.8\\linewidth]{${name}}`;
}

export function InsertPicker({ open, projectId, onClose, onInsert }: Props) {
  const [figures, setFigures] = useState<FigureItem[]>([]);
  const [bib, setBib] = useState<BibEntryItem[]>([]);
  const [q, setQ] = useState("");
  const [withEnv, setWithEnv] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setError(null);
    setLoading(true);
    void api
      .getInsertables(projectId)
      .then((r) => {
        setFigures(r.figures);
        setBib(r.bib_entries);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Falha ao listar itens"),
      )
      .finally(() => setLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredFigures = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return figures;
    return figures.filter(
      (f) =>
        f.name.toLowerCase().includes(needle) ||
        f.path.toLowerCase().includes(needle),
    );
  }, [figures, q]);

  const filteredBib = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return bib;
    return bib.filter(
      (b) =>
        b.key.toLowerCase().includes(needle) ||
        b.title.toLowerCase().includes(needle) ||
        b.author.toLowerCase().includes(needle),
    );
  }, [bib, q]);

  if (!open) return null;

  const isFigure = open === "figure";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {isFigure ? "Inserir figura" : "Inserir citação bibliográfica"}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {isFigure
                ? "Veja o preview e escolha — útil quando o nome não descreve bem"
                : "Escolha uma chave do arquivo .bib"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-sky-500"
          >
            Fechar
          </button>
        </header>

        <div className="border-b border-zinc-800 p-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isFigure ? "Filtrar por nome…" : "Filtrar por chave, autor ou título…"}
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
          {isFigure && (
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={withEnv}
                onChange={(e) => setWithEnv(e.target.checked)}
              />
              Inserir bloco completo (figure + caption + label)
            </label>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && (
            <p className="px-2 py-4 text-sm text-zinc-500">Carregando…</p>
          )}
          {error && (
            <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          {isFigure && !loading && filteredFigures.length === 0 && (
            <p className="px-2 py-4 text-sm text-zinc-500">
              Nenhuma figura encontrada. Coloque imagens em{" "}
              <code className="text-zinc-300">figuras/</code> ou{" "}
              <code className="text-zinc-300">content/figures/</code>.
            </p>
          )}
          {!isFigure && !loading && filteredBib.length === 0 && (
            <p className="px-2 py-4 text-sm text-zinc-500">
              Nenhuma entrada .bib encontrada. Crie ou edite um arquivo{" "}
              <code className="text-zinc-300">.bib</code> no projeto.
            </p>
          )}

          {isFigure && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredFigures.map((f) => {
                const previewable = /\.(png|jpe?g|gif|svg|webp)$/i.test(f.path);
                return (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => {
                      onInsert(figureSnippet(f, withEnv));
                      onClose();
                    }}
                    className="flex flex-col overflow-hidden rounded-lg border border-zinc-800 text-left hover:border-sky-500/50 hover:bg-zinc-800/60"
                  >
                    <div className="flex h-28 items-center justify-center bg-zinc-950/80">
                      {previewable ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={api.assetUrl(projectId, f.path)}
                          alt={f.name}
                          className="max-h-28 max-w-full object-contain p-1"
                          loading="lazy"
                        />
                      ) : (
                        <span className="px-2 text-center text-[10px] text-zinc-600">
                          Sem preview
                          <br />
                          ({f.name.split(".").pop()})
                        </span>
                      )}
                    </div>
                    <div className="border-t border-zinc-800 px-2 py-1.5">
                      <span className="line-clamp-2 text-xs text-zinc-100">{f.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                        {f.path}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!isFigure &&
            filteredBib.map((b) => (
              <button
                key={`${b.bib_file}:${b.key}`}
                type="button"
                onClick={() => {
                  onInsert(`(\\cite{${b.key}})`);
                  onClose();
                }}
                className="mb-1 flex w-full flex-col rounded-lg border border-zinc-800 px-3 py-2 text-left hover:border-sky-500/50 hover:bg-zinc-800/60"
              >
                <span className="font-mono text-sm text-sky-200">{b.key}</span>
                <span className="text-[11px] text-zinc-400">
                  [{b.entry_type}] {b.author}
                  {b.year ? ` (${b.year})` : ""}
                  {b.title ? ` — ${b.title}` : ""}
                </span>
                <span className="text-[10px] text-zinc-600">{b.bib_file}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
