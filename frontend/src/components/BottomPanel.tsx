"use client";

import { useState } from "react";
import type { CompilationJob, Diagnostic, ProjectConfig } from "@/types";

type Tab = "problems" | "log" | "output" | "settings";

interface Props {
  visible: boolean;
  job: CompilationJob | null;
  log: string;
  diagnostics: Diagnostic[];
  config: ProjectConfig | null;
  onConfigChange: (config: ProjectConfig) => void;
  onJump: (d: Diagnostic) => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Ocioso",
  queued: "Na fila",
  preparing: "Preparando…",
  compiling: "Compilando…",
  completed: "Compilação concluída",
  failed: "Falha na compilação",
  timeout: "Tempo excedido",
  cancelled: "Compilação cancelada",
};

export function BottomPanel(props: Props) {
  const [tab, setTab] = useState<Tab>("problems");
  if (!props.visible) return null;

  const errors = props.diagnostics.filter((d) => d.severity === "error");
  const warnings = props.diagnostics.filter((d) => d.severity === "warning");
  const status = props.job?.status ?? "idle";
  const statusText =
    status === "completed" && (props.job?.warning_count ?? 0) > 0
      ? "Compilação com avisos"
      : (STATUS_LABEL[status] ?? status);

  return (
    <div className="flex h-52 shrink-0 flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-3 py-1.5 text-xs">
        {(
          [
            ["problems", `Problemas (${errors.length}/${warnings.length})`],
            ["log", "Log"],
            ["output", "Saída"],
            ["settings", "Configurações"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id ? "text-sky-400" : "text-zinc-400 hover:text-zinc-200"
            }
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-zinc-400">{statusText}</span>
        {props.job?.duration_ms != null && (
          <span className="text-zinc-500">{props.job.duration_ms} ms</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 text-sm">
        {tab === "problems" && (
          <ul className="space-y-1">
            {props.diagnostics.length === 0 && (
              <li className="text-zinc-500">Nenhum problema reportado.</li>
            )}
            {props.diagnostics.map((d, i) => (
              <li key={`${d.code}-${i}`}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left hover:bg-zinc-900"
                  onClick={() => props.onJump(d)}
                >
                  <span
                    className={
                      d.severity === "error"
                        ? "text-red-400"
                        : d.severity === "warning"
                          ? "text-amber-400"
                          : "text-sky-400"
                    }
                  >
                    [{d.severity}]
                  </span>{" "}
                  {d.file ?? "—"}
                  {d.line ? `:${d.line}` : ""} — {d.message}
                  {d.suggestion && (
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {d.suggestion}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "log" && (
          <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300">
            {props.log || "Sem log ainda."}
          </pre>
        )}

        {tab === "output" && (
          <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300">
            {JSON.stringify(props.job, null, 2)}
          </pre>
        )}

        {tab === "settings" && props.config && (
          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={props.config.auto_compile}
                onChange={(e) =>
                  props.onConfigChange({
                    ...props.config!,
                    auto_compile: e.target.checked,
                  })
                }
              />
              Compilar ao salvar / automaticamente
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={props.config.autosave}
                onChange={(e) =>
                  props.onConfigChange({
                    ...props.config!,
                    autosave: e.target.checked,
                  })
                }
              />
              Salvamento automático
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={props.config.cancel_previous_on_new}
                onChange={(e) =>
                  props.onConfigChange({
                    ...props.config!,
                    cancel_previous_on_new: e.target.checked,
                  })
                }
              />
              Cancelar compilação anterior
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={props.config.halt_on_error}
                onChange={(e) =>
                  props.onConfigChange({
                    ...props.config!,
                    halt_on_error: e.target.checked,
                  })
                }
              />
              halt-on-error
            </label>
            <label className="text-sm">
              Timeout (s)
              <input
                type="number"
                className="ml-2 w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
                value={props.config.timeout_seconds}
                onChange={(e) =>
                  props.onConfigChange({
                    ...props.config!,
                    timeout_seconds: Number(e.target.value) || 120,
                  })
                }
              />
            </label>
            <label className="text-sm">
              Debounce compilação (ms)
              <input
                type="number"
                className="ml-2 w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
                value={props.config.compile_debounce_ms}
                onChange={(e) =>
                  props.onConfigChange({
                    ...props.config!,
                    compile_debounce_ms: Number(e.target.value) || 1200,
                  })
                }
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
