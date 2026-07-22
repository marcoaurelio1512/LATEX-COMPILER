"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { FileTree } from "./FileTree";
import dynamic from "next/dynamic";

const PdfPreview = dynamic(
  () => import("./PdfPreview").then((m) => m.PdfPreview),
  { ssr: false },
);
import { Toolbar } from "./Toolbar";
import { AiAssistant } from "./AiAssistant";

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
    nonce: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [convertingMd, setConvertingMd] = useState(false);
  const [convertingTex, setConvertingTex] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);

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

  async function openFile(path: string) {
    if (!path) return;
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
      // Salva arquivos sujos SEM agendar nova compilação (evita loop infinito)
      await saveAll({ triggerCompile: false });
      const result = clean
        ? await api.compileClean(projectId)
        : await api.compile(projectId, {
            engine: config?.engine,
            compiler_mode: config?.compiler_mode,
          });
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [projectId, config]);

  if (!project || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        {error ?? "Carregando projeto…"}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Toolbar
        project={project}
        config={config}
        compiling={compiling}
        activePath={activePath}
        dirty={dirtyPaths.size > 0}
        convertingMd={convertingMd}
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
        onConvertTex={() => void convertTex()}
        onToggleAi={() => setShowAi((v) => !v)}
        aiOpen={showAi}
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
          onDelete={(path) => {
            if (!window.confirm(`Excluir ${path}?`)) return;
            void api.deleteFile(projectId, path).then(() => {
              setTabs((prev) => prev.filter((t) => t.path !== path));
              if (activePath === path) setActivePath(null);
              return refreshTree();
            });
          }}
          onRename={(path) => {
            const next = window.prompt("Novo caminho:", path);
            if (!next || next === path) return;
            void api.rename(projectId, path, next).then(() => refreshTree());
          }}
        />
        <EditorPane
          tabs={tabs}
          activePath={activePath}
          theme={theme}
          fontSize={fontSize}
          wordWrap={wordWrap}
          diagnostics={diagnostics}
          reveal={reveal}
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
      </div>
      <BottomPanel
        visible={showBottom}
        job={job}
        log={log}
        diagnostics={diagnostics}
        config={config}
        onConfigChange={(c) => void persistConfig(c)}
        onJump={(d) => void onJump(d)}
      />
    </div>
  );
}
