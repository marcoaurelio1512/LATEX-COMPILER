"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export interface ImagePreviewTarget {
  path: string;
  name?: string;
}

interface Props {
  open: boolean;
  projectId: string;
  target: ImagePreviewTarget | null;
  onClose: () => void;
}

export function ImagePreviewModal({
  open,
  projectId,
  target,
  onClose,
}: Props) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [target?.path]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !target) return null;

  const name = target.name || target.path.split("/").pop() || target.path;
  const src = api.assetUrl(projectId, target.path);

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview de ${name}`}
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">{name}</h2>
            <p className="truncate text-[11px] text-zinc-500">{target.path}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-xs hover:border-sky-500"
          >
            Fechar
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950/80 p-4">
          {broken ? (
            <p className="text-sm text-zinc-500">
              Não foi possível carregar a imagem.
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={name}
              className="max-h-[min(70vh,560px)] max-w-full object-contain"
              onError={() => setBroken(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
