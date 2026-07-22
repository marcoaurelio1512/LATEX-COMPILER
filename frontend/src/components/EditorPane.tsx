"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Diagnostic, EditorTab } from "@/types";

interface Props {
  tabs: EditorTab[];
  activePath: string | null;
  theme: "vs-dark" | "light";
  fontSize: number;
  wordWrap: boolean;
  diagnostics: Diagnostic[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChange: (path: string, content: string) => void;
  onSave: () => void;
  reveal?: { path: string; line: number; nonce: number } | null;
}

const LATEX_KEYWORDS = [
  "\\begin",
  "\\end",
  "\\section",
  "\\subsection",
  "\\usepackage",
  "\\documentclass",
  "\\cite",
  "\\ref",
  "\\label",
  "\\includegraphics",
  "\\textbf",
  "\\textit",
  "\\emph",
  "\\chapter",
  "\\caption",
  "\\bibliography",
  "\\addbibresource",
];

export function EditorPane(props: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const active = props.tabs.find((t) => t.path === props.activePath) ?? null;

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.register({ id: "latex" });
    monaco.languages.setMonarchTokensProvider("latex", {
      tokenizer: {
        root: [
          [/%.*$/, "comment"],
          [/\\[a-zA-Z@]+/, "keyword"],
          [/[{}]/, "delimiter.bracket"],
          [/\$.*?\$/, "string"],
        ],
      },
    });
    monaco.languages.registerCompletionItemProvider("latex", {
      provideCompletionItems: () => ({
        suggestions: LATEX_KEYWORDS.map((label) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: label,
        })),
      }),
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      props.onSave();
    });
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor || !active) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = props.diagnostics
      .filter((d) => d.file === active.path && d.line)
      .map((d) => ({
        severity:
          d.severity === "error"
            ? monaco.MarkerSeverity.Error
            : d.severity === "warning"
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.line ?? 1,
        startColumn: 1,
        endLineNumber: d.line ?? 1,
        endColumn: 200,
      }));
    monaco.editor.setModelMarkers(model, "latex-studio", markers);
  }, [props.diagnostics, active]);

  useEffect(() => {
    if (!props.reveal || !editorRef.current) return;
    if (props.reveal.path !== props.activePath) return;
    const line = props.reveal.line;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
  }, [props.reveal, props.activePath]);

  const uniqueTabs = props.tabs.filter(
    (tab, index, arr) => arr.findIndex((t) => t.path === tab.path) === index,
  );
  const tabs = uniqueTabs;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-1">
        {tabs.map((tab, index) => (
          <div
            key={`${tab.path}#${index}`}
            className={`flex items-center gap-2 rounded-t px-3 py-1.5 text-xs ${
              tab.path === props.activePath
                ? "bg-zinc-950 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <button type="button" onClick={() => props.onSelectTab(tab.path)}>
              {tab.path.split("/").pop()}
              {tab.dirty ? " •" : ""}
            </button>
            <button
              type="button"
              className="text-zinc-500 hover:text-red-400"
              onClick={() => props.onCloseTab(tab.path)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {active ? (
          <Editor
            height="100%"
            theme={props.theme}
            path={active.path}
            language={
              active.path.endsWith(".bib")
                ? "plaintext"
                : active.path.endsWith(".json")
                  ? "json"
                  : "latex"
            }
            value={active.content}
            onChange={(value) =>
              props.onChange(active.path, value ?? "")
            }
            onMount={handleMount}
            options={{
              fontSize: props.fontSize,
              wordWrap: props.wordWrap ? "on" : "off",
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Abra um arquivo na árvore à esquerda
          </div>
        )}
      </div>
    </div>
  );
}
