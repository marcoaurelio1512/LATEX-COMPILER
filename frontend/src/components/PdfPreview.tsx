"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface Props {
  projectId: string;
  pdfVersion: number;
  hasPdf: boolean;
}

export function PdfPreview({ projectId, pdfVersion, hasPdf }: Props) {
  const [scale, setScale] = useState(1);
  const [page, setPage] = useState(1);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPdf) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(api.pdfUrl(projectId, pdfVersion), {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "PDF ainda não disponível"
              : `Falha ao carregar PDF (${res.status})`,
          );
        }
        const blob = await res.blob();
        // Força tipo PDF mesmo se o servidor mandar octet-stream
        const pdfBlob =
          blob.type === "application/pdf"
            ? blob
            : new Blob([blob], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdfBlob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, pdfVersion, hasPdf]);

  const framed = blobUrl ? `${blobUrl}#page=${page}` : null;

  if (!hasPdf) {
    return (
      <aside className="flex w-[420px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Preview PDF
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-500">
          Ainda não há PDF. Compile o projeto para visualizar.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-3 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-zinc-400">
          Preview PDF
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-0.5"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ←
          </button>
          <input
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(Number(e.target.value) || 1)}
            className="w-12 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-center"
          />
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-0.5"
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-0.5"
            onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
          >
            −
          </button>
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-0.5"
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(2))))}
          >
            +
          </button>
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-0.5"
            onClick={() => setScale(1)}
          >
            Largura
          </button>
          {blobUrl && (
            <>
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-700 px-2 py-0.5 hover:border-sky-500"
              >
                Nova janela
              </a>
              <a
                href={blobUrl}
                download="documento.pdf"
                className="rounded border border-zinc-700 px-2 py-0.5 hover:border-sky-500"
              >
                Salvar
              </a>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-zinc-900 p-2">
        {loading && (
          <p className="p-4 text-sm text-zinc-400">Carregando PDF…</p>
        )}
        {error && !loading && (
          <p className="p-4 text-sm text-amber-300">{error}</p>
        )}
        {framed && !loading && !error && (
          <div
            className="origin-top-left"
            style={{
              transform: `scale(${scale})`,
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
            }}
          >
            <iframe
              title="Pré-visualização PDF"
              src={framed}
              className="h-full min-h-[70vh] w-full rounded border border-zinc-800 bg-white"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
