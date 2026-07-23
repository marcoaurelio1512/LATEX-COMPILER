"use client";

import type { ReactNode } from "react";
import type { CompilerMode, Engine, ProjectConfig, ProjectDetail } from "@/types";

interface Props {
  project: ProjectDetail;
  config: ProjectConfig;
  compiling: boolean;
  activePath?: string | null;
  dirty?: boolean;
  convertingMd?: boolean;
  convertingMdBib?: boolean;
  convertingBib?: boolean;
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
  onConvertMdBib?: () => void;
  onConvertBib?: () => void;
  onConvertTex?: () => void;
  onTranslateProject?: () => void;
  translatingProject?: boolean;
  onToggleAi?: () => void;
  aiOpen?: boolean;
  onToggleTemplates?: () => void;
  templatesOpen?: boolean;
  onToggleFind?: () => void;
  findOpen?: boolean;
  onToggleManual?: () => void;
  onInsertFigure?: () => void;
  onInsertCite?: () => void;
  onConfigPatch: (patch: Partial<ProjectConfig>) => void;
}

function Group({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  if (!children || (Array.isArray(children) && children.every((c) => !c))) {
    return null;
  }
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-l border-zinc-700/70 pl-2.5"
      role="group"
      aria-label={label}
      title={label}
    >
      <span className="hidden select-none text-[9px] font-semibold uppercase tracking-wider text-zinc-600 2xl:inline">
        {label}
      </span>
      {children}
    </div>
  );
}

const btn =
  "rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const btnQuiet =
  "rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-40";
const btnSolid =
  "rounded bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700 disabled:opacity-40";

export function Toolbar(props: Props) {
  const isTex = !!props.activePath?.toLowerCase().endsWith(".tex");
  const isMd = !!props.activePath?.toLowerCase().endsWith(".md");
  const isBib = !!props.activePath?.toLowerCase().endsWith(".bib");
  const isMain =
    !!props.activePath && props.config.main_file === props.activePath;

  return (
    <header className="flex flex-wrap items-center gap-y-2 gap-x-1 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
      {/* Projeto */}
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
        <button
          type="button"
          onClick={props.onBack}
          className={btnQuiet}
        >
          Projetos
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{props.project.name}</div>
          <div className="truncate text-[11px] text-zinc-500">
            {props.project.root_path}
            {props.config.main_file
              ? ` · principal: ${props.config.main_file}`
              : ""}
          </div>
        </div>
      </div>

      {/* Arquivo */}
      <Group label="Arquivo">
        <button
          type="button"
          onClick={props.onSave}
          className={btnSolid}
          title="Salvar arquivos abertos no disco (⌘S)"
        >
          Salvar{props.dirty ? " •" : ""}
        </button>
        {props.onSaveAs && props.activePath && (
          <button
            type="button"
            onClick={props.onSaveAs}
            className={btnQuiet}
            title="Salvar o arquivo atual com outro nome/caminho no projeto"
          >
            Salvar como…
          </button>
        )}
        {props.onDownload && props.activePath && (
          <button
            type="button"
            onClick={props.onDownload}
            className={btnQuiet}
            title="Baixar uma cópia deste arquivo para a pasta Downloads"
          >
            Baixar
          </button>
        )}
      </Group>

      {/* Edição */}
      <Group label="Edição">
        {props.onToggleFind && (
          <button
            type="button"
            onClick={props.onToggleFind}
            className={`${btn} ${
              props.findOpen
                ? "bg-sky-600 text-white"
                : "border border-zinc-700 text-zinc-200 hover:border-sky-500"
            }`}
            title="Procurar palavra ou frase (⌘F)"
          >
            Procurar
          </button>
        )}
        {props.onInsertFigure && (
          <button
            type="button"
            onClick={props.onInsertFigure}
            disabled={!isTex}
            className={`${btn} border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20`}
            title={
              isTex
                ? "Inserir figura da pasta figuras/figures no cursor"
                : "Abra um arquivo .tex para inserir figura"
            }
          >
            Inserir Figura
          </button>
        )}
        {props.onInsertCite && (
          <button
            type="button"
            onClick={props.onInsertCite}
            disabled={!isTex}
            className={`${btn} border border-sky-500/50 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20`}
            title={
              isTex
                ? "Inserir (\\cite{...}) a partir do .bib"
                : "Abra um arquivo .tex para inserir citação"
            }
          >
            Inserir Citação
          </button>
        )}
      </Group>

      {/* Conversões */}
      <Group label="Converter">
        {props.onConvertMd && (
          <button
            type="button"
            onClick={props.onConvertMd}
            disabled={!isMd || props.convertingMd}
            className={`${btn} border border-violet-500/60 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}
            title={
              isMd
                ? "Converte este Markdown e salva um .tex no projeto"
                : "Abra um arquivo .md para converter"
            }
          >
            {props.convertingMd ? "Convertendo…" : "MD → TeX"}
          </button>
        )}
        {props.onConvertMdBib && (
          <button
            type="button"
            onClick={props.onConvertMdBib}
            disabled={!isMd || props.convertingMdBib}
            className={`${btn} border border-amber-500/60 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}
            title={
              isMd
                ? "Extrai citações/referências do Markdown e gera um .bib"
                : "Abra um arquivo .md para gerar .bib"
            }
          >
            {props.convertingMdBib ? "Gerando .bib…" : "MD → .bib"}
          </button>
        )}
        {props.onConvertBib && (
          <button
            type="button"
            onClick={props.onConvertBib}
            disabled={!isBib || props.convertingBib}
            className={`${btn} border border-orange-500/60 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20`}
            title={
              isBib
                ? "Converte este .bib para BibLaTeX, BibTeX clássico ou ABNT"
                : "Abra um arquivo .bib para converter o formato"
            }
          >
            {props.convertingBib ? "Convertendo…" : ".bib → formato"}
          </button>
        )}
        {isTex && props.onConvertTex && (
          <button
            type="button"
            onClick={props.onConvertTex}
            disabled={props.convertingTex}
            className={`${btn} border border-cyan-500/60 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20`}
            title="Gera um arquivo .md a partir deste LaTeX"
          >
            {props.convertingTex ? "Convertendo…" : "TeX → MD"}
          </button>
        )}
        {props.onTranslateProject && (
          <button
            type="button"
            onClick={props.onTranslateProject}
            disabled={props.translatingProject}
            className={`${btn} border border-rose-500/60 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20`}
            title="Usa o Assistente IA para traduzir .tex, .md, .bib e .txt do projeto para inglês (com backup)"
          >
            {props.translatingProject
              ? "Traduzindo…"
              : "Traduzir projeto → EN"}
          </button>
        )}
      </Group>

      {/* Compilação */}
      <Group label="Compilar">
        {isTex && props.onSetMain && !isMain && (
          <button
            type="button"
            onClick={props.onSetMain}
            className={`${btn} border border-amber-500/60 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}
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
        <button
          type="button"
          onClick={props.onCompile}
          disabled={props.compiling}
          className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}
          title={
            props.config.main_file
              ? `Compila o arquivo principal: ${props.config.main_file}`
              : "Compilar"
          }
        >
          Compilar
          {props.config.main_file
            ? ` (${props.config.main_file.split("/").pop()})`
            : ""}
        </button>
        <button
          type="button"
          onClick={props.onCleanCompile}
          disabled={props.compiling}
          className={btnQuiet}
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
      </Group>

      {/* Painéis / ajuda */}
      <Group label="Painéis">
        {props.onToggleAi && (
          <button
            type="button"
            onClick={props.onToggleAi}
            className={`${btn} ${
              props.aiOpen
                ? "bg-violet-600 text-white"
                : "border border-violet-500/50 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
            }`}
            title="Assistente de IA (responde em Markdown)"
          >
            Assistente IA
          </button>
        )}
        {props.onToggleTemplates && (
          <button
            type="button"
            onClick={props.onToggleTemplates}
            className={`${btn} ${
              props.templatesOpen
                ? "bg-emerald-600 text-white"
                : "border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
            }`}
            title="Gerenciador de templates de publicação"
          >
            Templates
          </button>
        )}
        {props.onToggleManual && (
          <button
            type="button"
            onClick={props.onToggleManual}
            className={`${btn} border border-amber-500/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}
            title="Abrir o manual de uso"
          >
            Como usar
          </button>
        )}
      </Group>
    </header>
  );
}
