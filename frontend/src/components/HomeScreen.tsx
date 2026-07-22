"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { ProjectDetail, ProjectSummary, SystemDiagnostics } from "@/types";

interface Props {
  onOpenProject: (project: ProjectDetail) => void;
}

export function HomeScreen({ onOpenProject }: Props) {
  const [recent, setRecent] = useState<ProjectSummary[]>([]);
  const [diag, setDiag] = useState<SystemDiagnostics | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("meu-artigo");
  const [showSettings, setShowSettings] = useState(true);

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

  const browseFolderAndLoad = async () => {
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

  const createNew = async () => {
    setBusy(true);
    setError(null);
    try {
      const project = await api.createProject({
        name: newName,
        template: "article",
        use_native_picker: true,
      });
      handleOpened(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar");
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
      setError(e instanceof Error ? e.message : "Falha ao reabrir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-400">
            Local · Privado · Offline
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            LaTeX Studio Local
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Edite, compile e visualize projetos LaTeX no seu computador. Nenhum
            arquivo é enviado para serviços externos.
          </p>
        </header>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <strong>Como funciona:</strong> o LaTeX trabalha com uma{" "}
          <em>pasta de projeto</em> (não um arquivo isolado). Você pode:
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sky-100/90">
            <li>
              abrir a <strong>pasta</strong> do trabalho, depois clicar no{" "}
              <code className="rounded bg-black/30 px-1">.tex</code> na lista à
              esquerda e em <strong>Compilar</strong>; ou
            </li>
            <li>
              abrir direto um arquivo <code className="rounded bg-black/30 px-1">.tex</code> —
              o Studio carrega a pasta dele e já deixa o arquivo aberto no editor.
            </li>
          </ul>
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
              arquivo e já mostra o código no editor para você compilar.
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
              Escolha a pasta inteira (útil quando há capítulos, imagens e .bib).
              Depois clique no arquivo na coluna esquerda.
            </p>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void createNew()}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-left transition hover:border-sky-500 disabled:opacity-60 md:col-span-2"
          >
            <h2 className="text-lg font-medium">Criar projeto novo</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Cria um artigo modelo em uma pasta escolhida.
            </p>
            <input
              value={newName}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-4 w-full max-w-md rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Nome do projeto"
            />
          </button>

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
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left hover:text-sky-300"
                  onClick={() => void reopenRecent(p.id)}
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {p.root_path}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(p.last_opened_at).toLocaleString("pt-BR")}
                  </span>
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
                      foram encontrados. Você já pode abrir um .tex e clicar em
                      Compilar.
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
                      {t.installed && t.path && (
                        <p className="mt-0.5 truncate text-[11px] text-zinc-600" title={t.path}>
                          {t.path}
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
