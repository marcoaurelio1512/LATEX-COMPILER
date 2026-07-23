"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorFindHandle } from "./EditorPane";
import { api } from "@/services/api";
import { connectEvents } from "@/services/ws";
import type {
  CompilationJob,
  Diagnostic,
  EditorTab,
  FileNode,
  ProjectConfig,
  ProjectDetail,
} from "@/types";
import { BottomPanel } from "./BottomPanel";
import { EditorPane } from "./EditorPane";
import { FindBar } from "./FindBar";
import { HowToUseModal } from "./HowToUseModal";
import { InsertPicker, type InsertMode } from "./InsertPicker";
import {
  ImagePreviewModal,
  type ImagePreviewTarget,
} from "./ImagePreviewModal";
import { BibFormatModal, type BibFormatChoice } from "./BibFormatModal";
import { FileTree } from "./FileTree";
import dynamic from "next/dynamic";

const PdfPreview = dynamic(
  () => import("./PdfPreview").then((m) => m.PdfPreview),
  { ssr: false },
);
import { Toolbar } from "./Toolbar";
import { AiAssistant } from "./AiAssistant";

const BINARY_OPEN_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".pdf",
  ".eps",
]);

const IMAGE_PREVIEW_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
]);


import { TemplatesPanel } from "./TemplatesPanel";

interface Props {
  projectId: string;
  initialFile?: string | null;
  onClose: () => void;
}

export function Workspace({ projectId, initialFile = null, onClose }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [job, setJob] = useState<CompilationJob | null>(null);
  const [log, setLog] = useState("");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [pdfVersion, setPdfVersion] = useState(Date.now());
  const [hasPdf, setHasPdf] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [showBottom, setShowBottom] = useState(true);
  const [theme] = useState<"vs-dark" | "light">("vs-dark");
  const [fontSize] = useState(14);
  const [wordWrap] = useState(true);
  const [reveal, setReveal] = useState<{
    path: string;
    line: number;
    column?: number;
    nonce: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [convertingMd, setConvertingMd] = useState(false);
  const [convertingMdBib, setConvertingMdBib] = useState(false);
  const [convertingTex, setConvertingTex] = useState(false);
  const [translatingProject, setTranslatingProject] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [insertMode, setInsertMode] = useState<InsertMode>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreviewTarget | null>(null);
  const [bibModal, setBibModal] = useState<null | "md" | "bib">(null);
  const [convertingBib, setConvertingBib] = useState(false);
  const [compileOverlay, setCompileOverlay] = useState(false);
  const [editorFull, setEditorFull] = useState(false);
  const editorFindRef = useRef<EditorFindHandle | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const openingFiles = useRef<Set<string>>(new Set());
  const compilingLock = useRef(false);
  const lastPdfJobId = useRef<string | null>(null);

  const dirtyPaths = useMemo(
    () => new Set(tabs.filter((t) => t.dirty).map((t) => t.path)),
    [tabs],
  );

  const compiling = ["queued", "preparing", "compiling"].includes(
    job?.status ?? "",
  );

  useEffect(() => {
    if (compiling) setCompileOverlay(true);
    else setCompileOverlay(false);
  }, [compiling]);

  const refreshTree = useCallback(async () => {
    const t = await api.getTree(projectId);
    setTree(t);
  }, [projectId]);

  const load = useCallback(async () => {
    const detail = await api.getProject(projectId);
    setProject(detail);
    setConfig(detail.config);
    await refreshTree();
    const toOpen = initialFile || detail.config.main_file;
    if (toOpen) {
      await openFile(toOpen);
    }
    // probe pdf
    try {
      const res = await fetch(api.pdfUrl(projectId, Date.now()));
      if (res.ok) setHasPdf(true);
    } catch {
      /* ignore */
    }
  }, [projectId, refreshTree, initialFile]);

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Falha ao carregar projeto"),
    );
  }, [load]);

  useEffect(() => {
    return connectEvents((event) => {
      if (event.project_id && event.project_id !== projectId) return;
      if (event.type === "compilation.status") {
        const payload = event.payload;
        if (payload.job && typeof payload.job === "object") {
          const j = payload.job as CompilationJob;
          setJob(j);
          setDiagnostics(j.diagnostics ?? []);
        }
        if (payload.status === "completed" || payload.status === "failed") {
          const jobId = String(payload.job_id ?? "");
          if (jobId) {
            void api.getLogs(jobId).then((r) => {
              setLog(r.log);
              setDiagnostics(r.diagnostics as Diagnostic[]);
            });
          }
        }
      }
      if (event.type === "pdf.updated") {
        const jobId = String(event.payload.job_id ?? "");
        markPdfReady(jobId || null);
      }
      if (
        event.type === "fs.modified" ||
        event.type === "fs.created" ||
        event.type === "fs.deleted"
      ) {
        void refreshTree();
        const path = String(event.payload.path ?? "");
        if (path && event.type === "fs.modified") {
          const tab = tabsRef.current.find((t) => t.path === path);
          if (tab && !tab.dirty) {
            void api.readFile(projectId, path).then((file) => {
              setTabs((prev) =>
                prev.map((t) =>
                  t.path === path
                    ? {
                        ...t,
                        content: file.content,
                        originalContent: file.content,
                        dirty: false,
                        mtime: new Date(file.modified_at).getTime() / 1000,
                      }
                    : t,
                ),
              );
            });
          } else if (tab?.dirty) {
            const keep = window.confirm(
              `${path} foi alterado no disco.\nOK = manter sua versão\nCancelar = carregar do disco`,
            );
            if (!keep) {
              void api.readFile(projectId, path).then((file) => {
                setTabs((prev) =>
                  prev.map((t) =>
                    t.path === path
                      ? {
                          ...t,
                          content: file.content,
                          originalContent: file.content,
                          dirty: false,
                          mtime: new Date(file.modified_at).getTime() / 1000,
                        }
                      : t,
                  ),
                );
              });
            }
          }
        }
      }
    });
  }, [projectId, refreshTree]);


  function ensureBrazilianLocale(content: string): string {
    const beginDoc = content.indexOf("\\begin{document}");
    if (beginDoc < 0) return content;
    const preamble = content.slice(0, beginDoc);

    const babelMatch = preamble.match(
      /\\usepackage(?:\[([^\]]*)\])?\{babel\}/,
    );
    if (babelMatch) {
      const opts = (babelMatch[1] || "").toLowerCase();
      if (
        opts.includes("brazilian") ||
        opts.includes("brazil") ||
        opts.includes("portuguese")
      ) {
        return content;
      }
      // Babel em outro idioma: força rótulos de figura/tabela em PT
      if (!/\\renewcommand\{\\figurename\}/.test(preamble)) {
        const inject =
          "\\renewcommand{\\figurename}{Figura}\n" +
          "\\renewcommand{\\tablename}{Tabela}\n\n";
        return content.slice(0, beginDoc) + inject + content.slice(beginDoc);
      }
      return content;
    }

    const inject = "\\usepackage[brazilian]{babel}\n\n";
    return content.slice(0, beginDoc) + inject + content.slice(beginDoc);
  }

  function ensureFigurePackages(content: string, active?: string | null): string {
    const beginDoc = content.indexOf("\\begin{document}");
    if (beginDoc < 0) return content;
    const preamble = content.slice(0, beginDoc);
    const dirDepth = active?.includes("/")
      ? active
          .slice(0, active.lastIndexOf("/"))
          .split("/")
          .filter(Boolean).length
      : 0;
    const parent = dirDepth > 0 ? "../".repeat(dirDepth) : "";
    const folders = [
      "figuras/",
      "figures/",
      "content/figures/",
      "images/",
      ...(parent
        ? [`${parent}figuras/`, `${parent}figures/`, `${parent}images/`]
        : []),
    ];
    const pathList = folders.map((p) => `{${p}}`).join("");

    let next = content;
    if (!/\\usepackage(?:\[[^\]]*\])?\{graphicx\}/.test(preamble)) {
      const inject =
        "\\usepackage{graphicx}\n" + `\\graphicspath{${pathList}}\n\n`;
      next = next.slice(0, beginDoc) + inject + next.slice(beginDoc);
    } else if (parent && !preamble.includes(`${parent}figuras/`)) {
      if (/\\graphicspath\{/.test(next)) {
        next = next.replace(
          /\\graphicspath\{/,
          `\\graphicspath{{${parent}figuras/}{${parent}figures/}{${parent}images/}`,
        );
      }
    }
    return ensureBrazilianLocale(next);
  }

  function ensureCitePackages(content: string, _active?: string): string {
    // Nome simples: o compilador define BIBINPUTS na raiz do projeto
    const bibName = "referencias.bib";
    const beginDoc = content.indexOf("\\begin{document}");
    if (beginDoc < 0) return content;
    const preamble = content.slice(0, beginDoc);
    let next = content;

    if (!/\\usepackage(?:\[[^\]]*\])?\{biblatex\}/.test(preamble)) {
      const inject =
        "\\usepackage[backend=biber,style=authoryear]{biblatex}\n" +
        `\\addbibresource{${bibName}}\n\n`;
      const bd = next.indexOf("\\begin{document}");
      next = next.slice(0, bd) + inject + next.slice(bd);
    } else {
      // corrige ../referencias.bib (quebra com outdir .latex-local/build)
      next = next.replace(
        /\\addbibresource\{\.\.\/referencias\.bib\}/g,
        `\\addbibresource{${bibName}}`,
      );
      const pre = next.slice(0, next.indexOf("\\begin{document}"));
      if (!/\\addbibresource\{/.test(pre)) {
        next = next.replace(
          /(\\usepackage(?:\[[^\]]*\])?\{biblatex\})/,
          `$1\n\\addbibresource{${bibName}}`,
        );
      }
    }

    if (!/\\printbibliography/.test(next) && /\\end\{document\}/.test(next)) {
      next = next.replace(
        /\\end\{document\}/,
        "\n\\printbibliography\n\n\\end{document}",
      );
    }
    return ensureBrazilianLocale(next);
  }

  async function translateProjectToEnglish() {
    if (translatingProject) return;
    try {
      const settings = await api.getAiSettings();
      if (!settings.has_api_key || !settings.enabled) {
        setError(
          "Configure a chave da API no Assistente IA antes de traduzir o projeto.",
        );
        setShowAi(true);
        return;
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível verificar as configurações de IA.",
      );
      return;
    }

    let planned = 0;
    try {
      const preview = await api.translateProject(projectId, { dry_run: true });
      planned = preview.planned || preview.files.length;
      if (!planned) {
        setInfo("Nenhum arquivo .tex/.md/.bib/.txt encontrado para traduzir.");
        return;
      }
      const ok = window.confirm(
        `Traduzir ${planned} arquivo(s) do projeto para INGLÊS?\n\n` +
          "• Sobrescreve o conteúdo dos arquivos\n" +
          "• Guarda backup em .latex-local/translate-backup/\n" +
          "• Usa o Assistente IA (pode demorar e consumir tokens)\n\n" +
          "Escreva em português e use este botão quando quiser a versão em inglês.",
      );
      if (!ok) return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao listar arquivos");
      return;
    }

    setTranslatingProject(true);
    setError(null);
    setInfo(`Traduzindo ${planned} arquivo(s) para inglês… Aguarde.`);
    try {
      const result = await api.translateProject(projectId, {
        dry_run: false,
        create_backup: true,
      });
      await refreshTree();
      // recarrega abas afetadas
      const changed = new Set(
        result.files.filter((f) => f.status === "ok").map((f) => f.path),
      );
      for (const path of changed) {
        try {
          const file = await api.readFile(projectId, path);
          setTabs((prev) =>
            prev.map((tab) =>
              tab.path === path
                ? {
                    ...tab,
                    content: file.content,
                    originalContent: file.content,
                    dirty: false,
                    mtime: new Date(file.modified_at).getTime() / 1000,
                  }
                : tab,
            ),
          );
        } catch {
          /* ignore reload errors per file */
        }
      }
      setInfo(result.message);
      if (result.failed > 0) {
        const first = result.files.find((f) => f.status === "error");
        setError(
          first
            ? `Algumas falhas na tradução. Ex.: ${first.path}: ${first.message}`
            : "Algumas falhas na tradução.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na tradução do projeto");
    } finally {
      setTranslatingProject(false);
    }
  }

  async function openFile(path: string) {
    if (!path) return;
    const ext = path.includes(".")
      ? `.${path.split(".").pop()!.toLowerCase()}`
      : "";
    if (IMAGE_PREVIEW_EXTS.has(ext)) {
      setError(null);
      setInfo(null);
      setImagePreview({
        path,
        name: path.split("/").pop() || path,
      });
      return;
    }
    if (BINARY_OPEN_EXTS.has(ext)) {
      setError(null);
      setInfo(
        `"${path}" é um arquivo binário e não abre no editor. ` +
          `Com um .tex aberto, use Inserir Figura para imagens.`,
      );
      return;
    }
    setActivePath(path);
    if (tabsRef.current.some((t) => t.path === path)) {
      return;
    }
    if (openingFiles.current.has(path)) {
      return;
    }
    openingFiles.current.add(path);
    try {
      const file = await api.readFile(projectId, path);
      const tab: EditorTab = {
        path,
        content: file.content,
        originalContent: file.content,
        dirty: false,
        mtime: new Date(file.modified_at).getTime() / 1000,
      };
      setTabs((prev) => {
        if (prev.some((t) => t.path === path)) return prev;
        return [...prev, tab];
      });
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao abrir arquivo";
      // evita Unhandled Runtime Error do Next.js
      setError(msg.replace(/^"|"$/g, ""));
      setActivePath((prev) => (prev === path ? null : prev));
    } finally {
      openingFiles.current.delete(path);
    }
  }

  function onChange(path: string, content: string) {
    // Ignora eco do Monaco ao atualizar `value` programaticamente (save/reload).
    const current = tabsRef.current.find((t) => t.path === path);
    if (current && current.content === content) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.path === path
          ? { ...t, content, dirty: content !== t.originalContent }
          : t,
      ),
    );
    if (!config) return;
    // Não autosalva/recompila enquanto uma compilação está em andamento.
    if (compilingLock.current) return;
    if (config.autosave) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (compilingLock.current) return;
        void saveAll({ triggerCompile: true });
      }, config.autosave_debounce_ms || 800);
    }
  }

  async function saveAll(options: { triggerCompile?: boolean } = { triggerCompile: true }) {
    const dirty = tabsRef.current.filter((t) => t.dirty);
    for (const tab of dirty) {
      try {
        const saved = await api.writeFile(projectId, {
          path: tab.path,
          content: tab.content,
          expected_mtime: tab.mtime,
          force: false,
        });
        setTabs((prev) =>
          prev.map((t) =>
            t.path === tab.path
              ? {
                  ...t,
                  dirty: false,
                  // Mantém o texto do editor para não disparar onChange.
                  originalContent: tab.content,
                  content: tab.content,
                  mtime: new Date(saved.modified_at).getTime() / 1000,
                }
              : t,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("409") || msg.includes("modificado")) {
          const force = window.confirm(
            `Conflito em ${tab.path}.\nOK = manter sua versão e sobrescrever\nCancelar = abortar`,
          );
          if (force) {
            const saved = await api.writeFile(projectId, {
              path: tab.path,
              content: tab.content,
              force: true,
            });
            setTabs((prev) =>
              prev.map((t) =>
                t.path === tab.path
                  ? {
                      ...t,
                      dirty: false,
                      originalContent: tab.content,
                      content: tab.content,
                      mtime: new Date(saved.modified_at).getTime() / 1000,
                    }
                  : t,
              ),
            );
          }
        } else {
          setError(msg);
        }
      }
    }
    // Só agenda compilação automática se houve arquivo salvo de verdade
    // e se NÃO estamos dentro de doCompile (triggerCompile: false).
    if (
      options.triggerCompile &&
      config?.auto_compile &&
      dirty.length > 0 &&
      !compilingLock.current
    ) {
      scheduleCompile();
    }
  }

  function scheduleCompile() {
    if (!config) return;
    if (compilingLock.current) return;
    if (compileTimer.current) clearTimeout(compileTimer.current);
    compileTimer.current = setTimeout(() => {
      if (compilingLock.current) return;
      void doCompile(false);
    }, config.compile_debounce_ms || 1200);
  }

  function resolveCompileMainFile(): string | undefined {
    const activeTex =
      activePath && activePath.toLowerCase().endsWith(".tex") ? activePath : null;
    if (activeTex) {
      const tab = tabsRef.current.find((t) => t.path === activeTex);
      const content = tab?.content ?? "";
      // Arquivo aberto com \documentclass = esse é o que deve compilar
      if (/\\documentclass\b/.test(content)) {
        return activeTex;
      }
    }
    return config?.main_file || undefined;
  }

  async function doCompile(clean: boolean) {
    if (compilingLock.current) return;
    compilingLock.current = true;
    if (compileTimer.current) {
      clearTimeout(compileTimer.current);
      compileTimer.current = null;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      setCompileOverlay(true);
      // Salva arquivos sujos SEM agendar nova compilação (evita loop infinito)
      await saveAll({ triggerCompile: false });
      const mainFile = resolveCompileMainFile();
      if (
        mainFile &&
        config &&
        mainFile !== config.main_file &&
        activePath === mainFile
      ) {
        await persistConfig({ ...config, main_file: mainFile });
        setInfo(`Compilando: ${mainFile} (definido como principal)`);
      }
      const compileBody = {
        engine: config?.engine,
        compiler_mode: config?.compiler_mode,
        main_file: mainFile,
      };
      const result = clean
        ? await api.compileClean(projectId, compileBody)
        : await api.compile(projectId, compileBody);
      setJob(result);
      // Job já terminado (ex.: coalescido) — libera o lock.
      if (
        ["completed", "failed", "timeout", "cancelled"].includes(result.status)
      ) {
        compilingLock.current = false;
        const logs = await api.getLogs(result.job_id);
        setLog(logs.log);
        setDiagnostics(logs.diagnostics as Diagnostic[]);
        if (result.pdf_path || result.status === "completed") {
          markPdfReady(result.job_id);
        }
        return;
      }
      pollJob(result.job_id);
    } catch (e) {
      compilingLock.current = false;
      setCompileOverlay(false);
      setError(e instanceof Error ? e.message : "Falha ao compilar");
    }
  }

  function markPdfReady(jobId?: string | null) {
    if (jobId && lastPdfJobId.current === jobId) return;
    if (jobId) lastPdfJobId.current = jobId;
    setHasPdf(true);
    setPdfVersion((v) => v + 1);
  }

  function pollJob(jobId: string) {
    const tick = async () => {
      try {
        const j = await api.getJob(jobId);
        setJob(j);
        if (["completed", "failed", "timeout", "cancelled"].includes(j.status)) {
          compilingLock.current = false;
          const logs = await api.getLogs(jobId);
          setLog(logs.log);
          setDiagnostics(logs.diagnostics as Diagnostic[]);
          if (j.pdf_path || j.status === "completed") {
            markPdfReady(jobId);
          }
          return;
        }
        setTimeout(() => void tick(), 800);
      } catch {
        compilingLock.current = false;
      }
    };
    void tick();
  }

  async function persistConfig(next: ProjectConfig) {
    setConfig(next);
    const detail = await api.putConfig(projectId, next);
    setProject(detail);
    setConfig(detail.config);
  }

  async function convertTex() {
    if (!activePath || !activePath.toLowerCase().endsWith(".tex")) {
      setError("Abra um arquivo .tex para converter.");
      return;
    }
    setConvertingTex(true);
    setError(null);
    setInfo(null);
    try {
      await saveAll({ triggerCompile: false });
      const result = await api.texToMd(projectId, { path: activePath });
      await refreshTree();
      await openFile(result.output_path);
      setInfo(`${result.message} Arquivo gerado: ${result.output_path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na conversão TeX → MD");
    } finally {
      setConvertingTex(false);
    }
  }

  async function convertMd() {
    if (!activePath || !activePath.toLowerCase().endsWith(".md")) {
      setError("Abra um arquivo .md para converter.");
      return;
    }
    const defaultOut = activePath.replace(/\.md$/i, ".tex").replace(/\.markdown$/i, ".tex");
    const chosen = window.prompt(
      "Salvar o .tex como (caminho relativo no projeto):",
      defaultOut,
    );
    if (chosen === null) return;
    const outputPath = chosen.trim() || defaultOut;
    if (!outputPath.toLowerCase().endsWith(".tex")) {
      setError("O caminho de saída precisa terminar com .tex");
      return;
    }

    setConvertingMd(true);
    setError(null);
    setInfo(null);
    try {
      await saveAll({ triggerCompile: false });
      const result = await api.mdToTex(projectId, {
        path: activePath,
        output_path: outputPath,
      });
      await refreshTree();
      if (config) {
        await persistConfig({ ...config, main_file: result.output_path });
      }
      await openFile(result.output_path);
      setInfo(
        `${result.message} Salvo em ${result.output_path}. ` +
          "Este arquivo já é o principal — clique em Compilar quando quiser.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na conversão MD → TeX");
    } finally {
      setConvertingMd(false);
    }
  }


  function convertMdBib() {
    if (!activePath || !activePath.toLowerCase().endsWith(".md")) {
      setError("Abra um arquivo .md com referências para gerar o .bib.");
      return;
    }
    setBibModal("md");
  }

  function convertBibProfile() {
    if (!activePath || !activePath.toLowerCase().endsWith(".bib")) {
      setError("Abra um arquivo .bib para converter o formato.");
      return;
    }
    setBibModal("bib");
  }

  async function runBibFormatChoice(choice: BibFormatChoice) {
    const mode = bibModal;
    setBibModal(null);
    if (!mode || !activePath) return;
    if (!choice.outputPath.toLowerCase().endsWith(".bib")) {
      setError("O caminho de saída precisa terminar com .bib");
      return;
    }
    setError(null);
    setInfo(null);
    if (mode === "md") {
      setConvertingMdBib(true);
      try {
        await saveAll({ triggerCompile: false });
        const result = await api.mdToBib(projectId, {
          path: activePath,
          output_path: choice.outputPath,
          append: true,
          profile: choice.profile,
        });
        await refreshTree();
        await openFile(result.output_path);
        setInfo(result.message);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha na conversão MD → .bib");
      } finally {
        setConvertingMdBib(false);
      }
      return;
    }
    setConvertingBib(true);
    try {
      await saveAll({ triggerCompile: false });
      const result = await api.convertBib(projectId, {
        path: activePath,
        output_path: choice.outputPath,
        profile: choice.profile,
      });
      await refreshTree();
      await openFile(result.output_path);
      setInfo(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao converter .bib");
    } finally {
      setConvertingBib(false);
    }
  }

  async function setActiveAsMain() {
    if (!activePath || !activePath.toLowerCase().endsWith(".tex") || !config) {
      setError("Abra um arquivo .tex para definir como principal.");
      return;
    }
    try {
      await saveAll({ triggerCompile: false });
      await persistConfig({ ...config, main_file: activePath });
      setInfo(`Arquivo principal definido: ${activePath}. Pode compilar.`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao definir principal");
    }
  }

  async function saveActiveAs() {
    if (!activePath) {
      setError("Nenhum arquivo aberto.");
      return;
    }
    const tab = tabsRef.current.find((t) => t.path === activePath);
    if (!tab) return;
    const suggested = activePath.toLowerCase().endsWith(".md")
      ? activePath.replace(/\.md$/i, ".tex")
      : activePath;
    const chosen = window.prompt(
      "Salvar como (caminho relativo no projeto):",
      suggested,
    );
    if (chosen === null) return;
    const outputPath = chosen.trim();
    if (!outputPath) return;
    try {
      await api.writeFile(projectId, {
        path: outputPath,
        content: tab.content,
        force: true,
      });
      await refreshTree();
      if (outputPath.toLowerCase().endsWith(".tex") && config) {
        await persistConfig({ ...config, main_file: outputPath });
      }
      await openFile(outputPath);
      setInfo(`Arquivo salvo em ${outputPath}.`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar como");
    }
  }

  function downloadActive() {
    if (!activePath) {
      setError("Nenhum arquivo aberto.");
      return;
    }
    const tab = tabsRef.current.find((t) => t.path === activePath);
    if (!tab) return;
    const blob = new Blob([tab.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activePath.split("/").pop() || "documento.tex";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setInfo(`Download iniciado: ${a.download}`);
  }

    async function onJump(d: Diagnostic) {
    if (!d.file) return;
    await openFile(d.file);
    if (d.line) {
      setReveal({ path: d.file, line: d.line, nonce: Date.now() });
    }
  }

  useEffect(() => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = (e: KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey);

    const handler = (e: KeyboardEvent) => {
      if (mod(e) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveAll();
      }
      if (mod(e) && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void doCompile(false);
      }
      if (mod(e) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        void doCompile(true);
      }
      if (mod(e) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setShowTree((v) => !v);
      }
      if (mod(e) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setShowBottom((v) => !v);
      }
      if (mod(e) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const q = window.prompt("Abrir arquivo (caminho relativo):");
        if (q) void openFile(q);
      }
      if (mod(e) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [projectId, config]);

  useEffect(() => {
    if (!editorFull) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditorFull(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorFull]);

  if (!project || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        {error ?? "Carregando projeto…"}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">

      {compileOverlay && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/55"
          role="status"
          aria-live="assertive"
        >
          <div className="pointer-events-none mx-4 max-w-xl rounded-2xl border-4 border-red-500 bg-red-950/95 px-10 py-8 text-center shadow-2xl shadow-red-900/50">
            <p className="text-3xl font-black tracking-wide text-red-400 md:text-4xl">
              COMPILANDO, AGUARDE
            </p>
            <p className="mt-3 text-base font-medium text-red-200/90 md:text-lg">
              Isso pode demorar um pouco
            </p>
            <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-red-900">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      )}

      <Toolbar
        project={project}
        config={config}
        compiling={compiling}
        activePath={activePath}
        dirty={dirtyPaths.size > 0}
        convertingMd={convertingMd}
        convertingMdBib={convertingMdBib}
        convertingBib={convertingBib}
        convertingTex={convertingTex}
        onBack={onClose}
        onSave={() => void saveAll()}
        onSaveAs={() => void saveActiveAs()}
        onDownload={() => downloadActive()}
        onSetMain={() => void setActiveAsMain()}
        onCompile={() => void doCompile(false)}
        onCleanCompile={() => void doCompile(true)}
        onCancel={() => {
          if (job) void api.cancel(job.job_id);
        }}
        onConvertMd={() => void convertMd()}
        onConvertMdBib={() => convertMdBib()}
        onConvertBib={() => convertBibProfile()}
        onConvertTex={() => void convertTex()}
        onTranslateProject={() => void translateProjectToEnglish()}
        translatingProject={translatingProject}
        onToggleAi={() => setShowAi((v) => !v)}
        aiOpen={showAi}
        onToggleTemplates={() => setShowTemplates((v) => !v)}
        templatesOpen={showTemplates}
        onToggleFind={() => setShowFind((v) => !v)}
        findOpen={showFind}
        onToggleManual={() => setShowManual(true)}
        onInsertFigure={() => setInsertMode("figure")}
        onInsertCite={() => setInsertMode("cite")}
        onConfigPatch={(patch) => void persistConfig({ ...config, ...patch })}
      />
      {error && (
        <div className="border-b border-red-900 bg-red-950/50 px-3 py-1 text-xs text-red-200">
          {error}
        </div>
      )}
      {info && (
        <div className="border-b border-emerald-900 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-200">
          {info}
        </div>
      )}
      {!editorFull && (
      <FindBar
        open={showFind}
        projectId={projectId}
        activePath={activePath}
        activeContent={
          tabs.find((t) => t.path === activePath)?.content ?? null
        }
        onClose={() => setShowFind(false)}
        onFindInEditor={(query, options) =>
          editorFindRef.current?.find(query, options) ?? null
        }
        onClearFind={() => editorFindRef.current?.clearFind()}
        onJump={(path, line, column) => {
          void openFile(path).then(() => {
            setReveal({
              path,
              line,
              column: column ?? 1,
              nonce: Date.now(),
            });
          });
        }}
      />
      )}
      <div className="flex min-h-0 flex-1">
        <FileTree
          tree={tree}
          activePath={activePath}
          dirtyPaths={dirtyPaths}
          collapsed={!showTree}
          onOpen={(p) => void openFile(p)}
          onRefresh={() => void refreshTree()}
          onCreateFile={(parent) => {
            const name = window.prompt("Nome do arquivo:", "novo.tex");
            if (!name) return;
            const path = parent ? `${parent}/${name}` : name;
            void api
              .createFile(projectId, { path, content: "" })
              .then(() => refreshTree())
              .then(() => openFile(path));
          }}
          onCreateDir={(parent) => {
            const name = window.prompt("Nome da pasta:");
            if (!name) return;
            const path = parent ? `${parent}/${name}` : name;
            void api.mkdir(projectId, path).then(() => refreshTree());
          }}
          onDelete={(path, isDirectory) => {
            if (!path) {
              setError("Não é possível excluir a pasta raiz do projeto.");
              return;
            }
            const label = isDirectory
              ? `a pasta "${path}" e todo o conteúdo dela`
              : `o arquivo "${path}"`;
            if (
              !window.confirm(
                `Excluir ${label}?\n\nEssa ação remove o item do disco e não pode ser desfeita aqui.`,
              )
            ) {
              return;
            }
            void api
              .deleteFile(projectId, path)
              .then(() => {
                setTabs((prev) =>
                  prev.filter((t) => {
                    if (t.path === path) return false;
                    if (isDirectory && t.path.startsWith(path + "/")) return false;
                    return true;
                  }),
                );
                if (
                  activePath === path ||
                  (isDirectory && activePath?.startsWith(path + "/"))
                ) {
                  setActivePath(null);
                }
                setInfo(
                  isDirectory
                    ? `Pasta excluída: ${path}`
                    : `Arquivo excluído: ${path}`,
                );
                return refreshTree();
              })
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Falha ao excluir",
                ),
              );
          }}
          onRename={(path) => {
            const next = window.prompt("Novo caminho:", path);
            if (!next || next === path) return;
            void api.rename(projectId, path, next).then(() => refreshTree());
          }}
        />
        <div
          className={
            editorFull
              ? "fixed inset-0 z-[80] flex flex-col bg-zinc-950 p-0 shadow-2xl"
              : "flex min-h-0 min-w-0 flex-1 flex-col"
          }
        >
          {editorFull && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Edição
              </span>
              <button
                type="button"
                onClick={() => void saveAll()}
                className="rounded bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700"
                title="Salvar (⌘S)"
              >
                Salvar{dirtyPaths.size > 0 ? " •" : ""}
              </button>
              {activePath && (
                <>
                  <button
                    type="button"
                    onClick={() => void saveActiveAs()}
                    className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500"
                  >
                    Salvar como…
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadActive()}
                    className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500"
                  >
                    Baixar
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowFind(true)}
                className={`rounded px-3 py-1.5 text-xs font-medium ${
                  showFind
                    ? "bg-sky-600 text-white"
                    : "border border-zinc-700 text-zinc-200 hover:border-sky-500"
                }`}
              >
                Procurar
              </button>
              <button
                type="button"
                onClick={() => setInsertMode("figure")}
                disabled={!activePath?.toLowerCase().endsWith(".tex")}
                className="rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Inserir Figura
              </button>
              <button
                type="button"
                onClick={() => setInsertMode("cite")}
                disabled={!activePath?.toLowerCase().endsWith(".tex")}
                className="rounded border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Inserir Citação
              </button>
              <button
                type="button"
                onClick={() => void doCompile(false)}
                disabled={compiling}
                className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                Compilar
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="hidden max-w-[240px] truncate text-[11px] text-zinc-500 sm:inline">
                  {activePath ?? "Nenhum arquivo"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditorFull(false)}
                  className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-sky-500"
                  title="Voltar ao layout (Esc)"
                >
                  Sair da tela cheia
                </button>
              </div>
            </div>
          )}
          {editorFull && (
            <FindBar
              open={showFind}
              projectId={projectId}
              activePath={activePath}
              activeContent={
                tabs.find((t) => t.path === activePath)?.content ?? null
              }
              onClose={() => setShowFind(false)}
              onFindInEditor={(query, options) =>
                editorFindRef.current?.find(query, options) ?? null
              }
              onClearFind={() => editorFindRef.current?.clearFind()}
              onJump={(path, line, column) => {
                void openFile(path).then(() => {
                  setReveal({
                    path,
                    line,
                    column: column ?? 1,
                    nonce: Date.now(),
                  });
                });
              }}
            />
          )}
          <EditorPane
            ref={editorFindRef}
            tabs={tabs}
            activePath={activePath}
            theme={theme}
            fontSize={fontSize}
            wordWrap={wordWrap}
            diagnostics={diagnostics}
            reveal={reveal}
            expanded={editorFull}
            onToggleExpand={
              editorFull
                ? undefined
                : () => setEditorFull(true)
            }
            onRequestFind={() => setShowFind(true)}
            onSelectTab={setActivePath}
            onCloseTab={(path) => {
              const tab = tabs.find((t) => t.path === path);
              if (tab?.dirty) {
                if (!window.confirm("Há alterações não salvas. Fechar mesmo assim?")) {
                  return;
                }
              }
              setTabs((prev) => prev.filter((t) => t.path !== path));
              if (activePath === path) {
                setActivePath(
                  tabs.filter((t) => t.path !== path).at(-1)?.path ?? null,
                );
              }
            }}
            onChange={onChange}
            onSave={() => void saveAll()}
          />
        </div>
        <PdfPreview
          projectId={projectId}
          pdfVersion={pdfVersion}
          hasPdf={hasPdf}
        />
        <AiAssistant
          open={showAi}
          projectId={projectId}
          activePath={activePath}
          activeContent={
            tabs.find((t) => t.path === activePath)?.content ?? null
          }
          onClose={() => setShowAi(false)}
          onInfo={setInfo}
          onError={setError}
          onSaved={({ mdPath, texPath }) => {
            void refreshTree().then(async () => {
              if (texPath) {
                const detail = await api.getProject(projectId);
                setProject(detail);
                setConfig(detail.config);
                await openFile(texPath);
              } else {
                await openFile(mdPath);
              }
            });
          }}
        />
        <TemplatesPanel
          open={showTemplates}
          projectId={projectId}
          onClose={() => setShowTemplates(false)}
          onInfo={setInfo}
          onError={setError}
          onSwitched={() => {
            void refreshTree().then(async () => {
              const detail = await api.getProject(projectId);
              setProject(detail);
              setConfig(detail.config);
              await openFile(detail.config.main_file || "main.tex");
            });
          }}
        />
      </div>
      <BottomPanel
        collapsed={!showBottom}
        onToggle={() => setShowBottom((v) => !v)}
        job={job}
        log={log}
        diagnostics={diagnostics}
        config={config}
        onConfigChange={(c) => void persistConfig(c)}
        onJump={(d) => void onJump(d)}
      />
      <HowToUseModal open={showManual} onClose={() => setShowManual(false)} />
      <BibFormatModal
        open={!!bibModal}
        title={
          bibModal === "bib"
            ? "Converter .bib para outro formato"
            : "Gerar .bib a partir do Markdown"
        }
        defaultPath={
          bibModal === "bib"
            ? (activePath
                ? activePath.replace(/\.bib$/i, "") + "-biblatex.bib"
                : "referencias-biblatex.bib")
            : "referencias.bib"
        }
        onClose={() => setBibModal(null)}
        onConfirm={(choice) => void runBibFormatChoice(choice)}
      />
      <InsertPicker
        open={insertMode}
        projectId={projectId}
        onClose={() => setInsertMode(null)}
        onInsert={(snippet) => {
          const mode = insertMode;
          if (!activePath?.toLowerCase().endsWith(".tex")) {
            setError("Abra um arquivo .tex antes de inserir figura ou citação.");
            return;
          }
          const ok = editorFindRef.current?.insertAtCursor(
            snippet,
            mode === "figure"
              ? {
                  beforeInsert: (content) =>
                    ensureFigurePackages(content, activePath),
                }
              : mode === "cite"
                ? {
                    beforeInsert: (content) =>
                      ensureCitePackages(content, activePath ?? undefined),
                  }
                : undefined,
          );
          if (!ok) {
            setError(
              "Não foi possível inserir. Clique no editor .tex e tente de novo.",
            );
            return;
          }
          setError(null);
          setInfo(
            mode === "figure"
              ? "Figura inserida. Se faltava, graphicx e português (babel) foram adicionados ao preâmbulo."
              : "Citação inserida. Se faltava, biblatex + referencias.bib foram ligados ao .tex.",
          );
        }}
      />

      
      {translatingProject && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-6">
          <div className="max-w-md rounded-xl border border-rose-500/40 bg-zinc-950 px-6 py-5 text-center shadow-2xl">
            <p className="text-lg font-semibold text-rose-100">
              TRADUZINDO O PROJETO PARA INGLÊS
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              O Assistente IA está convertendo os arquivos. Isso pode demorar
              alguns minutos — não feche a página.
            </p>
          </div>
        </div>
      )}

      <ImagePreviewModal
        open={!!imagePreview}
        projectId={projectId}
        target={imagePreview}
        onClose={() => setImagePreview(null)}
      />

    </div>
  );
}
