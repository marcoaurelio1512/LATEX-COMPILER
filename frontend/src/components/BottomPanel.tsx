"use client";

import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import type { CompilationJob, Diagnostic, ProjectConfig } from "@/types";

type Tab = "problems" | "log" | "output" | "settings";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
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

const MIN_H = 120;
const MAX_H = 480;
const DEFAULT_H = 208;

export function BottomPanel(props: Props) {
  const [tab, setTab] = useState<Tab>("problems");
  const [height, setHeight] = useState(DEFAULT_H);
  const [copiedProblems, setCopiedProblems] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const errors = props.diagnostics.filter((d) => d.severity === "error");
  const warnings = props.diagnostics.filter((d) => d.severity === "warning");
  const status = props.job?.status ?? "idle";
  const statusText =
    status === "completed" && (props.job?.warning_count ?? 0) > 0
      ? "Compilação com avisos"
      : (STATUS_LABEL[status] ?? status);

  const onDragStart = useCallback(
    (e: ReactMouseEvent) => {
      if (props.collapsed) return;
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      const onMove = (ev: globalThis.MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        const next = Math.min(
          MAX_H,
          Math.max(MIN_H, dragRef.current.startH + delta),
        );
        setHeight(next);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [height, props.collapsed],
  );


  function formatProblemsForAi(): string {
    if (!props.diagnostics.length) {
      return "Nenhum problema reportado na última compilação.";
    }
    const lines = [
      "Problemas da compilação LaTeX Studio Local:",
      `Status: ${statusText}`,
      props.job?.main_file ? `Arquivo principal: ${props.job.main_file}` : null,
      `Erros: ${errors.length} · Avisos: ${warnings.length}`,
      "",
    ].filter((x) => x != null) as string[];
    for (const d of props.diagnostics) {
      const loc = `${d.file ?? "—"}:${d.line ?? "?"}`;
      lines.push(`[${d.severity}] ${loc} — ${d.message}`);
      if (d.suggestion) lines.push(`  Sugestão: ${d.suggestion}`);
    }
    return lines.join("\n");
  }

  async function copyProblems() {
    const text = formatProblemsForAi();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedProblems(true);
      window.setTimeout(() => setCopiedProblems(false), 2000);
    } catch {
      window.prompt("Copie os problemas abaixo (⌘C):", text);
    }
  }

  return (
    <div
      className="flex shrink-0 flex-col border-t border-zinc-800 bg-zinc-950"
      style={props.collapsed ? undefined : { height }}
    >
      {!props.collapsed && (
        <button
          type="button"
          aria-label="Redimensionar painel"
          title="Arraste para alterar a altura"
          onMouseDown={onDragStart}
          className="h-1.5 w-full cursor-ns-resize bg-zinc-900 hover:bg-sky-600/50"
        />
      )}

      <div className="flex items-center gap-2 border-b border-zinc-800 px-2 py-1 text-xs">
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
            onClick={() => {
              setTab(id);
              if (props.collapsed) props.onToggle();
            }}
            className={
              tab === id && !props.collapsed
                ? "rounded px-1.5 py-0.5 text-sky-400"
                : "rounded px-1.5 py-0.5 text-zinc-400 hover:text-zinc-200"
            }
          >
            {label}
          </button>
        ))}

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {(tab === "problems" || props.diagnostics.length > 0) && (
            <button
              type="button"
              onClick={() => void copyProblems()}
              disabled={props.diagnostics.length === 0}
              className="flex shrink-0 items-center gap-1 rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Copia os problemas para colar na IA"
            >
              {copiedProblems ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar problemas
                </>
              )}
            </button>
          )}
          <span className="truncate text-zinc-400">{statusText}</span>
        </div>
        {props.job?.duration_ms != null && (
          <span className="text-zinc-500">{props.job.duration_ms} ms</span>
        )}

        <button
          type="button"
          onClick={props.onToggle}
          className="ml-1 flex items-center gap-1 rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-sky-500 hover:text-sky-200"
          title={
            props.collapsed
              ? "Mostrar painel (⌘J)"
              : "Ocultar painel (⌘J)"
          }
        >
          {props.collapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Mostrar
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Ocultar
            </>
          )}
        </button>
      </div>

      {!props.collapsed && (
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
      )}
    </div>
  );
}
