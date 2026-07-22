"use client";

import type { CompilerMode, Engine, ProjectConfig, ProjectDetail } from "@/types";

interface Props {
  project: ProjectDetail;
  config: ProjectConfig;
  compiling: boolean;
  activePath?: string | null;
  dirty?: boolean;
  convertingMd?: boolean;
  convertingTex?: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveAs?: () => void;
  onDownload?: () => void;
  onSetMain?: () => void;
  onCompile: () => void;
  onCleanCompile: () => void;
  onCancel: () => void;
  onConvertMd?: () => void;
  onConvertTex?: () => void;
  onToggleAi?: () => void;
  aiOpen?: boolean;
  onConfigPatch: (patch: Partial<ProjectConfig>) => void;
}

export function Toolbar(props: Props) {
  const isTex = !!props.activePath?.toLowerCase().endsWith(".tex");
  const isMd = !!props.activePath?.toLowerCase().endsWith(".md");
  const isMain =
    !!props.activePath && props.config.main_file === props.activePath;

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
      <button
        type="button"
        onClick={props.onBack}
        className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-sky-500"
      >
        Projetos
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{props.project.name}</div>
        <div className="truncate text-[11px] text-zinc-500">
          {props.project.root_path}
          {props.config.main_file ? ` · principal: ${props.config.main_file}` : ""}
        </div>
      </div>

      <button
        type="button"
        onClick={props.onSave}
        className="rounded bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700"
        title="Salvar arquivos abertos no disco (⌘S)"
      >
        Salvar{props.dirty ? " •" : ""}
      </button>
      {props.onSaveAs && props.activePath && (
        <button
          type="button"
          onClick={props.onSaveAs}
          className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500"
          title="Salvar o arquivo atual com outro nome/caminho no projeto"
        >
          Salvar como…
        </button>
      )}
      {props.onDownload && props.activePath && (
        <button
          type="button"
          onClick={props.onDownload}
          className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500"
          title="Baixar uma cópia deste arquivo para a pasta Downloads"
        >
          Baixar
        </button>
      )}
      {isTex && props.onSetMain && !isMain && (
        <button
          type="button"
          onClick={props.onSetMain}
          className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
          title="Usa este .tex na compilação"
        >
          Usar na compilação
        </button>
      )}
      {isTex && isMain && (
        <span className="rounded border border-emerald-700/50 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-300">
          Principal
        </span>
      )}
      {isMd && props.onConvertMd && (
        <button
          type="button"
          onClick={props.onConvertMd}
          disabled={props.convertingMd}
          className="rounded border border-violet-500/60 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
          title="Converte este Markdown e salva um .tex no projeto"
        >
          {props.convertingMd ? "Convertendo…" : "MD → TeX (salvar)"}
        </button>
      )}
      {isTex && props.onConvertTex && (
        <button
          type="button"
          onClick={props.onConvertTex}
          disabled={props.convertingTex}
          className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
          title="Gera um arquivo .md a partir deste LaTeX"
        >
          {props.convertingTex ? "Convertendo…" : "TeX → MD"}
        </button>
      )}
      {props.onToggleAi && (
        <button
          type="button"
          onClick={props.onToggleAi}
          className={`rounded px-3 py-1.5 text-xs font-medium ${
            props.aiOpen
              ? "bg-violet-600 text-white"
              : "border border-violet-500/50 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          }`}
          title="Assistente de IA (responde em Markdown)"
        >
          Assistente IA
        </button>
      )}
      <button
        type="button"
        onClick={props.onCompile}
        disabled={props.compiling}
        className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium hover:bg-sky-500 disabled:opacity-50"
      >
        Compilar
      </button>
      <button
        type="button"
        onClick={props.onCleanCompile}
        disabled={props.compiling}
        className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500 disabled:opacity-50"
      >
        Limpar e compilar
      </button>
      <button
        type="button"
        onClick={props.onCancel}
        disabled={!props.compiling}
        className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-300 hover:border-red-500 disabled:opacity-40"
      >
        Cancelar
      </button>

      <select
        value={props.config.engine}
        onChange={(e) =>
          props.onConfigPatch({ engine: e.target.value as Engine })
        }
        className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
        title="Motor"
      >
        <option value="lualatex">LuaLaTeX</option>
        <option value="xelatex">XeLaTeX</option>
        <option value="pdflatex">PDFLaTeX</option>
      </select>

      <select
        value={props.config.compiler_mode}
        onChange={(e) =>
          props.onConfigPatch({
            compiler_mode: e.target.value as CompilerMode,
          })
        }
        className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
        title="Modo"
      >
        <option value="native">Nativo</option>
        <option value="docker">Docker</option>
      </select>

      <label className="flex items-center gap-1 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={props.config.auto_compile}
          onChange={(e) =>
            props.onConfigPatch({ auto_compile: e.target.checked })
          }
        />
        Auto
      </label>
    </header>
  );
}
