"use client";

import { useEffect, useState } from "react";

export type BibProfileId = "biblatex" | "bibtex" | "abnt";

export interface BibFormatChoice {
  profile: BibProfileId;
  outputPath: string;
}

const PROFILES: {
  id: BibProfileId;
  label: string;
  hint: string;
}[] = [
  {
    id: "biblatex",
    label: "BibLaTeX (padrão)",
    hint: "journaltitle/date — use com biber",
  },
  {
    id: "bibtex",
    label: "BibTeX clássico",
    hint: "journal/year — \\bibliographystyle + bibtex",
  },
  {
    id: "abnt",
    label: "ABNT (campos)",
    hint: "Campos amigáveis a abnTeX2 / norma ABNT",
  },
];

interface Props {
  open: boolean;
  title: string;
  defaultPath: string;
  onClose: () => void;
  onConfirm: (choice: BibFormatChoice) => void;
}

export function BibFormatModal({
  open,
  title,
  defaultPath,
  onClose,
  onConfirm,
}: Props) {
  const [profile, setProfile] = useState<BibProfileId>("biblatex");
  const [outputPath, setOutputPath] = useState(defaultPath);

  useEffect(() => {
    if (!open) return;
    setProfile("biblatex");
    setOutputPath(defaultPath);
  }, [open, defaultPath]);

  useEffect(() => {
    if (!open) return;
    setOutputPath((prev) => {
      const m = prev.match(/^(.*?)(?:-(?:biblatex|bibtex|abnt))?\.bib$/i);
      if (!m) return prev;
      return `${m[1]}-${profile}.bib`;
    });
  }, [profile, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <header className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-[11px] text-zinc-500">
            Escolha o perfil de campos do arquivo .bib
          </p>
        </header>
        <div className="space-y-3 p-4">
          {PROFILES.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2 ${
                profile === p.id
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="bib-profile"
                checked={profile === p.id}
                onChange={() => setProfile(p.id)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm text-zinc-100">{p.label}</span>
                <span className="block text-[11px] text-zinc-500">{p.hint}</span>
              </span>
            </label>
          ))}
          <label className="block text-xs text-zinc-400">
            Arquivo de saída (.bib)
            <input
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
            />
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-zinc-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const path = outputPath.trim();
              if (!path.toLowerCase().endsWith(".bib")) return;
              onConfirm({ profile, outputPath: path });
            }}
            className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium hover:bg-sky-500"
          >
            Gerar
          </button>
        </footer>
      </div>
    </div>
  );
}
