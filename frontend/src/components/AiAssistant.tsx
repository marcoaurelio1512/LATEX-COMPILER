"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api";
import type { AiChatMessage, AiSettings } from "@/types";

interface Props {
  open: boolean;
  projectId: string;
  activePath?: string | null;
  activeContent?: string | null;
  onClose: () => void;
  onSaved: (paths: { mdPath: string; texPath?: string | null }) => void;
  onInfo: (msg: string) => void;
  onError: (msg: string) => void;
}

export function AiAssistant(props: Props) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i].content;
    }
    return "";
  }, [messages]);

  useEffect(() => {
    if (!props.open) return;
    void api
      .getAiSettings()
      .then((s) => {
        setSettings(s);
        setBaseUrl(s.base_url);
        setModel(s.model);
        if (!s.has_api_key) setShowSettings(true);
      })
      .catch((e) =>
        props.onError(e instanceof Error ? e.message : "Falha ao carregar IA"),
      );
  }, [props.open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function saveSettings() {
    try {
      let s = await api.putAiSettings({
        base_url: baseUrl,
        model,
        enabled: true,
      });
      if (apiKeyInput.trim()) {
        s = await api.putAiKey(apiKeyInput.trim());
        setApiKeyInput("");
      }
      setSettings(s);
      setShowSettings(false);
      props.onInfo(
        s.has_api_key
          ? `Assistente pronto (${s.model}). As mensagens vão para a LLM configurada.`
          : "Salvo. Ainda falta cadastrar a chave da API.",
      );
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Falha ao salvar IA");
    }
  }

  async function clearKey() {
    try {
      const s = await api.deleteAiKey();
      setSettings(s);
      props.onInfo("Chave da API removida deste computador.");
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Falha ao remover chave");
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    if (!settings?.has_api_key) {
      setShowSettings(true);
      props.onError("Cadastre a chave da LLM (padrão OpenAI) antes de conversar.");
      return;
    }
    const nextMessages: AiChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    try {
      const res = await api.aiChat({
        messages: nextMessages,
        project_id: props.projectId,
        context_path: includeContext ? props.activePath || undefined : undefined,
        context_excerpt:
          includeContext && props.activeContent
            ? props.activeContent.slice(0, 6000)
            : undefined,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply_markdown },
      ]);
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Falha no chat com a IA");
    } finally {
      setBusy(false);
    }
  }

  async function saveBibFromReply() {
    if (!lastAssistant.trim()) {
      props.onError("Ainda não há resposta da IA para gerar .bib.");
      return;
    }
    const chosen = window.prompt(
      "Salvar bibliografia como (caminho .bib):",
      "referencias.bib",
    );
    if (chosen === null) return;
    const path = chosen.trim() || "referencias.bib";
    if (!path.toLowerCase().endsWith(".bib")) {
      props.onError("O caminho precisa terminar com .bib");
      return;
    }
    try {
      const result = await api.mdToBib(props.projectId, {
        content: lastAssistant,
        output_path: path,
        append: true,
      });
      props.onInfo(result.message);
      props.onSaved({ mdPath: result.output_path, texPath: null });
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Falha ao gerar .bib");
    }
  }

  async function saveReply(opts: {
    convertToTex: boolean;
    setAsMain: boolean;
  }) {
    if (!lastAssistant.trim()) {
      props.onError("Ainda não há resposta da IA para salvar.");
      return;
    }
    const suggested = `capitulos/rascunho-ia-${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    const chosen = window.prompt(
      opts.convertToTex
        ? "Salvar Markdown e converter para .tex. Caminho do .md:"
        : "Salvar resposta como Markdown. Caminho:",
      suggested,
    );
    if (chosen === null) return;
    const path = chosen.trim();
    if (!path.toLowerCase().endsWith(".md")) {
      props.onError("O caminho precisa terminar com .md");
      return;
    }
    try {
      const result = await api.aiSaveMarkdown(props.projectId, {
        path,
        content: lastAssistant,
        convert_to_tex: opts.convertToTex,
        set_as_main: opts.setAsMain,
      });
      props.onInfo(result.message);
      props.onSaved({ mdPath: result.md_path, texPath: result.tex_path });
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Falha ao salvar resposta");
    }
  }

  if (!props.open) return null;

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-300">
            Assistente IA
          </div>
          <div className="truncate text-[11px] text-zinc-500">
            {settings?.has_api_key
              ? `${settings.model} · chave ${settings.api_key_hint}`
              : "Sem chave cadastrada"}
          </div>
        </div>
        <button
          type="button"
          className="rounded border border-zinc-700 px-2 py-1 text-[11px] hover:border-violet-400"
          onClick={() => setShowSettings((v) => !v)}
        >
          Chave / modelo
        </button>
        <button
          type="button"
          className="rounded border border-zinc-700 px-2 py-1 text-[11px] hover:border-zinc-500"
          onClick={props.onClose}
        >
          Fechar
        </button>
      </div>

      {showSettings && (
        <div className="space-y-2 border-b border-zinc-800 bg-zinc-900/60 p-3 text-xs">
          <p className="text-zinc-400">
            Padrão OpenAI-compatible. A chave fica só neste Mac
            (~/.latex-studio-local). O texto do chat é enviado à LLM que você
            configurar.
          </p>
          <label className="block">
            Base URL
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label className="block">
            Modelo
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
              placeholder="gpt-4o-mini"
            />
          </label>
          <label className="block">
            Chave da API
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
              placeholder={
                settings?.has_api_key
                  ? `Cadastrada: ${settings.api_key_hint}`
                  : "sk-..."
              }
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void saveSettings()}
              className="rounded bg-violet-600 px-3 py-1.5 font-medium hover:bg-violet-500"
            >
              Salvar configuração
            </button>
            {settings?.has_api_key && (
              <button
                type="button"
                onClick={() => void clearKey()}
                className="rounded border border-red-800 px-3 py-1.5 text-red-300"
              >
                Remover chave
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-700 p-3 text-xs text-zinc-400">
            Peça um capítulo, seção ou rascunho. A IA responde em Markdown.
            Depois use <strong>Salvar .md</strong>, <strong>.tex</strong> ou <strong>.bib</strong>. Ou{" "}
            <strong>Salvar .md → .tex</strong>.
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={`rounded-lg px-3 py-2 whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-6 bg-sky-950/50 text-sky-50"
                : "mr-2 bg-zinc-900 text-zinc-100"
            }`}
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
              {m.role === "user" ? "Você" : "Assistente (.md)"}
            </div>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="text-xs text-violet-300">A IA está escrevendo…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 border-t border-zinc-800 p-3">
        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
          />
          Incluir arquivo aberto como contexto
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={4}
          placeholder="Ex.: Escreva a introdução do capítulo 1 sobre produção intelectual…"
          className="w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !draft.trim()}
            onClick={() => void send()}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            Enviar
          </button>
          <button
            type="button"
            disabled={!lastAssistant || busy}
            onClick={() =>
              void saveReply({ convertToTex: false, setAsMain: false })
            }
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-violet-400 disabled:opacity-50"
          >
            Salvar .md
          </button>
          <button
            type="button"
            disabled={!lastAssistant || busy}
            onClick={() =>
              void saveReply({ convertToTex: true, setAsMain: true })
            }
            className="rounded border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
            title="Salva .md, converte para .tex e define como principal"
          >
            Salvar .md → .tex
          </button>
          <button
            type="button"
            disabled={!lastAssistant || busy}
            onClick={() => void saveBibFromReply()}
            className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
            title="Extrai referências da resposta e gera um .bib"
          >
            Salvar .md → .bib
          </button>
          <button
            type="button"
            disabled={busy || messages.length === 0}
            onClick={() => setMessages([])}
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
          >
            Limpar chat
          </button>
        </div>
      </div>
    </aside>
  );
}
