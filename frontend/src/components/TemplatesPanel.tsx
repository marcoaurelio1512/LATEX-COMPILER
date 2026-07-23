"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { ProjectMetadata, TemplateManifest } from "@/types";

interface Props {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onInfo: (msg: string) => void;
  onError: (msg: string) => void;
  onSwitched: () => void;
}

export function TemplatesPanel({
  open,
  projectId,
  onClose,
  onInfo,
  onError,
  onSwitched,
}: Props) {
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [meta, setMeta] = useState<ProjectMetadata | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "builtin" | "imported">("all");

  const refresh = useCallback(async () => {
    try {
      const [list, m] = await Promise.all([
        api.listTemplates(),
        api.getProjectMetadata(projectId).catch(() => null),
      ]);
      setTemplates(list);
      setMeta(m);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao carregar templates");
    }
  }, [projectId, onError]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const visible = templates.filter((t) =>
    filter === "all" ? true : t.source === filter,
  );

  const install = async () => {
    setBusy(true);
    try {
      const m = await api.installTemplate({ use_native_picker: true });
      onInfo(`Template importado: ${m.name} (${m.document_class})`);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao importar";
      if (!msg.toLowerCase().includes("cancelad")) onError(msg);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (id: string) => {
    if (!window.confirm(`Trocar para o template "${id}"? O conteúdo em content/ será preservado.`)) {
      return;
    }
    setBusy(true);
    try {
      await api.switchTemplate(projectId, id);
      onInfo(`Template aplicado: ${id}. Revise main.tex e compile.`);
      onSwitched();
      await refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao trocar template");
    } finally {
      setBusy(false);
    }
  };

  const validate = async (id: string) => {
    setBusy(true);
    try {
      const v = await api.validateTemplate(id);
      if (v.ok) onInfo(`Template ${id}: válido`);
      else onError(`Template ${id}: ${v.errors.join("; ") || "inválido"}`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha na validação");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(`Remover template importado "${id}"?`)) return;
    setBusy(true);
    try {
      await api.deleteTemplate(id);
      onInfo(`Removido: ${id}`);
      await refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao remover");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div>
          <h2 className="text-sm font-medium">Templates</h2>
          {meta && (
            <p className="text-[11px] text-zinc-500">
              Atual: {meta.template} · {meta.documentClass} · {meta.engine}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:border-sky-500"
        >
          Fechar
        </button>
      </div>

      <div className="flex gap-1 border-b border-zinc-800 p-2">
        {(["all", "builtin", "imported"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-2 py-1 text-[11px] ${
              filter === f
                ? "bg-sky-600 text-white"
                : "border border-zinc-700 text-zinc-300"
            }`}
          >
            {f === "all" ? "Todos" : f === "builtin" ? "Nativos" : "Importados"}
          </button>
        ))}
      </div>

      <div className="border-b border-zinc-800 p-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void install()}
          className="w-full rounded bg-sky-600 px-2 py-1.5 text-xs font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          Importar ZIP/pasta…
        </button>
        <p className="mt-1 text-[10px] text-zinc-500">
          Selecione a pasta descompactada do template (ou pasta com .cls/.sty).
        </p>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto p-2">
        {visible.map((t) => {
          const active = meta?.template === t.id;
          return (
            <li
              key={t.id}
              className={`rounded-lg border p-2 text-xs ${
                active
                  ? "border-sky-500/60 bg-sky-500/10"
                  : "border-zinc-800 bg-zinc-950/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-zinc-100">{t.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {t.id} · v{t.version} · {t.source}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                    t.validated
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {t.validated ? "Validado" : "Atenção"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                {t.description || "—"}
              </p>
              <div className="mt-1 text-[10px] text-zinc-500">
                Classe: <code>{t.document_class}</code> · Engine: {t.engine}
                {t.files.length > 0 ? ` · ${t.files.length} arquivos` : ""}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {!active && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void apply(t.id)}
                    className="rounded border border-sky-600/50 px-2 py-0.5 text-[11px] text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void validate(t.id)}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] hover:border-sky-500 disabled:opacity-50"
                >
                  Validar
                </button>
                {t.source === "imported" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(t.id)}
                    className="rounded border border-red-900/60 px-2 py-0.5 text-[11px] text-red-300 hover:border-red-500 disabled:opacity-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="py-6 text-center text-xs text-zinc-500">
            Nenhum template nesta lista.
          </li>
        )}
      </ul>
    </aside>
  );
}
