"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type {
  ProjectDetail,
  ProjectSummary,
  ProjectType,
  SystemDiagnostics,
  TemplateManifest,
} from "@/types";
import { Trash2 } from "lucide-react";
import { HowToUseModal } from "./HowToUseModal";

interface Props {
  onOpenProject: (project: ProjectDetail) => void;
}

const PROJECT_TYPES: { id: ProjectType; label: string; hint: string }[] = [
  { id: "book", label: "Livro", hint: "Capítulos e estrutura longa" },
  { id: "paper", label: "Paper científico", hint: "IEEE, ACM, Springer…" },
  { id: "thesis", label: "Tese", hint: "Doutorado" },
  { id: "dissertation", label: "Dissertação", hint: "Mestrado" },
  { id: "monograph", label: "Monografia", hint: "TCC / graduação" },
  { id: "report", label: "Relatório técnico", hint: "Report / técnico" },
  { id: "beamer", label: "Apresentação Beamer", hint: "Slides" },
  { id: "custom", label: "Documento personalizado", hint: "Template importado" },
];

export function HomeScreen({ onOpenProject }: Props) {
  const [recent, setRecent] = useState<ProjectSummary[]>([]);
  const [diag, setDiag] = useState<SystemDiagnostics | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("meu-projeto");
  const [parentPath, setParentPath] = useState("");
  const [showSettings, setShowSettings] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [projectType, setProjectType] = useState<ProjectType>("book");
  const [templateId, setTemplateId] = useState("book-default");
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);

  const refresh = async () => {
    try {
      const [projects, diagnostics] = await Promise.all([
        api.listProjects(),
        api.diagnostics(),
      ]);
      setRecent(projects);
      setDiag(diagnostics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    void api
      .listTemplates(projectType)
      .then((list) => {
        setTemplates(list);
        if (list.length && !list.some((t) => t.id === templateId)) {
          setTemplateId(list[0].id);
        }
      })
      .catch(() => setTemplates([]));
  }, [projectType]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  const handleOpened = (project: ProjectDetail) => {
    setPath(project.root_path);
    onOpenProject(project);
  };

  const openFolder = async () => {
    setBusy(true);
    setError(null);
    try {
      const project = await api.openProject({ use_native_picker: true });
      handleOpened(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir");
    } finally {
      setBusy(false);
    }
  };

  const openTexFile = async () => {
    setBusy(true);
    setError(null);
    try {
      const project = await api.openProject({ pick_tex_file: true });
      handleOpened(project);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao abrir";
      if (!msg.toLowerCase().includes("cancelad")) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const focusStudioWindow = () => {
    try {
      window.focus();
    } catch {
      /* ignore */
    }
  };

  const browseFolderAndLoad = async () => {
    focusStudioWindow();
    setBusy(true);
    setError(null);
    try {
      const { path: selected } = await api.pickFolder();
      setPath(selected);
      const project = await api.openProject({ path: selected });
      handleOpened(project);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao abrir";
      if (!msg.toLowerCase().includes("cancelad")) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const browseTexAndLoad = async () => {
    focusStudioWindow();
    setBusy(true);
    setError(null);
    try {
      const { path: selected } = await api.pickTex();
      setPath(selected);
      const project = await api.openProject({ path: selected });
      handleOpened(project);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao abrir";
      if (!msg.toLowerCase().includes("cancelad")) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const openPath = async () => {
    if (!path.trim()) {
      setError("Informe um caminho de pasta ou de arquivo .tex.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const project = await api.openProject({ path: path.trim() });
      handleOpened(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir");
    } finally {
      setBusy(false);
    }
  };

  const pickParentFolder = async () => {
    focusStudioWindow();
    setBusy(true);
    setError(null);
    try {
      const { path: selected } = await api.pickFolder();
      setParentPath(selected);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao escolher pasta";
      // cancelar o diálogo não é erro grave
      if (!msg.toLowerCase().includes("cancelad")) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    setBusy(true);
    setError(null);
    try {
      const hasParent = parentPath.trim().length > 0;
      const project = await api.createPublicationProject({
        name: newName,
        project_type: projectType,
        template_id: templateId,
        parent_path: hasParent ? parentPath.trim() : undefined,
        use_native_picker: !hasParent,
      });
      handleOpened(project);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao criar";
      if (msg.toLowerCase().includes("cancelad")) {
        setError(
          "A escolha da pasta pai foi cancelada. Clique de novo em “Escolher pasta pai…” (o diálogo deve aparecer sobre esta janela) ou cole o caminho da pasta abaixo.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const reopenRecent = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const project = await api.getProject(id);
      handleOpened(project);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao reabrir";
      // pasta inexistente: tira da lista automaticamente
      if (
        msg.toLowerCase().includes("não existe") ||
        msg.toLowerCase().includes("nao existe") ||
        msg.toLowerCase().includes("not found") ||
        msg.includes("404")
      ) {
        try {
          await api.deleteProject(id, false);
          await refresh();
        } catch {
          /* ignore */
        }
        setError("Projeto removido dos recentes: a pasta não existe mais.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeRecent = async (id: string, name: string) => {
    const ok = window.confirm(
      `Remover "${name}" da lista de recentes?\n\nOs arquivos no disco NÃO serão apagados. Se abrir de novo, volta a aparecer.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteProject(id, false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover da lista");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-screen min-h-screen overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-400">
              Local · Privado · Offline
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              LaTeX Studio Local
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Edite, compile e visualize projetos LaTeX no seu computador. Escolha
              o tipo de documento e o template — o conteúdo fica separado da
              formatação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/20"
          >
            Como usar
          </button>
        </header>
        <HowToUseModal open={showManual} onClose={() => setShowManual(false)} />

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <strong>Como funciona:</strong> o LaTeX trabalha com uma{" "}
          <em>pasta de projeto</em>. Crie com tipo + template, ou abra uma pasta /
          arquivo <code className="rounded bg-black/30 px-1">.tex</code> existente.
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void openTexFile()}
            className="rounded-xl border border-sky-500/50 bg-zinc-900 p-6 text-left transition hover:border-sky-400 disabled:opacity-60"
          >
            <h2 className="text-lg font-medium">Abrir arquivo .tex</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Escolha um <code>.tex</code> no Finder. O Studio abre a pasta do
              arquivo e já mostra o código no editor.
            </p>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void openFolder()}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-left transition hover:border-sky-500 disabled:opacity-60"
          >
            <h2 className="text-lg font-medium">Abrir pasta do projeto</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Escolha a pasta inteira (capítulos, imagens e .bib).
            </p>
          </button>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-medium">Criar projeto novo</h2>
              <span className="text-xs text-zinc-500">
                Passo {wizardStep} de 2
              </span>
            </div>

            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-4 w-full max-w-md rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Nome do projeto (vira o nome da pasta)"
            />

            {wizardStep === 1 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-zinc-400">Tipo de documento</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {PROJECT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setProjectType(t.id)}
                      className={`rounded-lg border p-3 text-left text-sm transition ${
                        projectType === t.id
                          ? "border-sky-500 bg-sky-500/15"
                          : "border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {t.hint}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setWizardStep(2)}
                  className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60"
                >
                  Continuar → template
                </button>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="mb-3 text-xs text-sky-400 hover:underline"
                >
                  ← Voltar ao tipo
                </button>
                <p className="mb-2 text-sm text-zinc-400">
                  Template para{" "}
                  <strong>
                    {PROJECT_TYPES.find((t) => t.id === projectType)?.label}
                  </strong>
                </p>
                <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`rounded-lg border p-3 text-left text-sm ${
                        templateId === t.id
                          ? "border-sky-500 bg-sky-500/15"
                          : "border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {t.document_class} · {t.engine} · {t.source}
                      </div>
                      {t.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">
                          {t.description}
                        </p>
                      )}
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-sm text-zinc-500 sm:col-span-2">
                      Nenhum template para este tipo. Importe um ZIP depois no
                      painel Templates.
                    </p>
                  )}
                </div>
                {selectedTemplate && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Selecionado: {selectedTemplate.name} (
                    {selectedTemplate.document_class})
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-zinc-400">
                    Pasta pai (onde a pasta do projeto será criada)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void pickParentFolder()}
                      className="rounded-md border border-sky-500/60 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
                    >
                      Escolher pasta pai…
                    </button>
                    <input
                      value={parentPath}
                      onChange={(e) => setParentPath(e.target.value)}
                      placeholder="/Users/seu-nome/Desktop"
                      className="min-w-[16rem] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                      disabled={busy}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Se o diálogo do Finder não aparecer, ele pode estar atrás do
                    navegador — ou cole o caminho da pasta aqui.
                  </p>
                  <button
                    type="button"
                    disabled={busy || !templateId}
                    onClick={() => void createNew()}
                    className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60"
                  >
                    {parentPath.trim()
                      ? "Criar projeto nesta pasta"
                      : "Criar projeto (abrir Finder…)"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 md:col-span-2">
            <h2 className="text-lg font-medium">Abrir por caminho</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Aceita pasta <strong>ou</strong> caminho completo de um arquivo{" "}
              <code>.tex</code>.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void openPath();
                }}
                placeholder="/Users/seu-nome/Documents/meu-tcc/main.tex"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                disabled={busy}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void browseTexAndLoad()}
                  className="rounded-md border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-60"
                >
                  Escolher arquivo .tex…
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void browseFolderAndLoad()}
                  className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-sky-500 disabled:opacity-60"
                >
                  Escolher pasta…
                </button>
                <button
                  type="button"
                  disabled={busy || !path.trim()}
                  onClick={() => void openPath()}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60"
                >
                  Carregar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Projetos recentes</h2>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="text-sm text-sky-400 hover:underline"
            >
              {showSettings ? "Ocultar diagnóstico" : "Configurações / Diagnóstico"}
            </button>
          </div>
          <ul className="mt-4 divide-y divide-zinc-800">
            {recent.length === 0 && (
              <li className="py-3 text-sm text-zinc-500">Nenhum projeto recente.</li>
            )}
            {recent.map((p) => (
              <li
                key={p.id}
                className="group flex items-center gap-2 py-3"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left hover:text-sky-300"
                  onClick={() => void reopenRecent(p.id)}
                  disabled={busy}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {p.root_path}
                  </span>
                  <span className="mt-1 block text-[11px] text-zinc-600">
                    {new Date(p.last_opened_at).toLocaleString("pt-BR")}
                  </span>
                </button>
                <button
                  type="button"
                  title="Remover da lista de recentes (não apaga arquivos)"
                  className="shrink-0 rounded p-2 text-zinc-500 opacity-70 hover:bg-red-950 hover:text-red-400 group-hover:opacity-100"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeRecent(p.id, p.name);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {showSettings && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-medium">Diagnóstico do ambiente</h2>
            {!diag && (
              <p className="mt-3 text-sm text-zinc-400">
                Carregando diagnóstico… Se ficar em branco, clique em Verificar novamente.
              </p>
            )}
            {diag && (
              <>
                <p className="mt-1 text-xs text-zinc-500">{diag.platform}</p>
                <div
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                    diag.ready_native
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  {diag.ready_native ? (
                    <>
                      <strong>Pronto para compilar.</strong> Latexmk e LuaLaTeX
                      foram encontrados.
                    </>
                  ) : (
                    <>
                      <strong>Ainda falta o LaTeX no Mac.</strong> Veja os itens
                      ausentes abaixo.
                    </>
                  )}
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {diag.tools.map((t) => (
                    <li
                      key={t.name}
                      className="rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{t.name}: </span>
                        <span
                          className={
                            t.installed ? "text-emerald-400" : "text-amber-400"
                          }
                        >
                          {t.installed ? "instalado" : "ausente"}
                        </span>
                      </div>
                      {t.installed && t.version && (
                        <p className="mt-1 truncate text-xs text-zinc-500" title={t.version}>
                          {t.version}
                        </p>
                      )}
                      {!t.installed && t.guidance && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-400">
                          {t.guidance}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <ul className="mt-4 space-y-1 text-sm text-zinc-400">
                  {diag.notes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              </>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:border-sky-500"
            >
              Verificar novamente
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
