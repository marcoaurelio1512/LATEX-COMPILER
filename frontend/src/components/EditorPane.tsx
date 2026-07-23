"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import type { Diagnostic, EditorTab } from "@/types";

export interface EditorFindHandle {
  find: (
    query: string,
    options: { caseSensitive: boolean; reverse?: boolean; select?: boolean },
  ) => { current: number; total: number } | null;
  focus: () => void;
  clearFind: () => void;
  insertAtCursor: (
    text: string,
    options?: { beforeInsert?: (content: string) => string },
  ) => boolean;
}

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
  reveal?: {
    path: string;
    line: number;
    column?: number;
    nonce: number;
  } | null;
  onRequestFind?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
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

function languageFor(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".bib")) return "plaintext";
  if (lower.endsWith(".json")) return "json";
  if (
    lower.endsWith(".tex") ||
    lower.endsWith(".sty") ||
    lower.endsWith(".cls")
  ) {
    return "latex";
  }
  return "plaintext";
}

export const EditorPane = forwardRef<EditorFindHandle, Props>(
  function EditorPane(props, ref) {
    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
    const matchIndexRef = useRef(0);
    const findDecorationsRef = useRef<string[]>([]);
    const lastFindQueryRef = useRef("");
    const activePathRef = useRef<string | null>(props.activePath);
    const onChangeRef = useRef(props.onChange);
    const active = props.tabs.find((t) => t.path === props.activePath) ?? null;

    activePathRef.current = props.activePath;
    onChangeRef.current = props.onChange;

    const clearFindHighlights = useCallback(() => {
      const editor = editorRef.current;
      if (!editor) {
        findDecorationsRef.current = [];
        return;
      }
      try {
        findDecorationsRef.current = editor.deltaDecorations(
          findDecorationsRef.current,
          [],
        );
      } catch {
        findDecorationsRef.current = [];
      }
    }, []);

    const findInEditor = useCallback(
      (
        query: string,
        options: {
          caseSensitive: boolean;
          reverse?: boolean;
          select?: boolean;
        },
      ): { current: number; total: number } | null => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const q = query ?? "";
        if (!q) {
          clearFindHighlights();
          lastFindQueryRef.current = "";
          matchIndexRef.current = 0;
          return null;
        }
        if (!editor || !monaco) return null;
        const model = editor.getModel();
        if (!model) return null;

        let matches;
        try {
          matches = model.findMatches(
            q,
            true,
            false,
            !!options.caseSensitive,
            null,
            true,
          );
        } catch {
          return { current: 0, total: 0 };
        }

        if (!matches.length) {
          matchIndexRef.current = 0;
          lastFindQueryRef.current = q;
          clearFindHighlights();
          return { current: 0, total: 0 };
        }

        const queryChanged = lastFindQueryRef.current !== q;
        lastFindQueryRef.current = q;
        if (queryChanged) matchIndexRef.current = 0;

        const shouldMove = options.select !== false;
        let idx = matchIndexRef.current;

        if (shouldMove && !queryChanged) {
          idx = options.reverse
            ? (idx - 1 + matches.length) % matches.length
            : (idx + 1) % matches.length;
        } else if (shouldMove && queryChanged) {
          idx = 0;
        }
        matchIndexRef.current = idx;

        const decorations = matches.map((m, i) => ({
          range: new monaco.Range(
            m.range.startLineNumber,
            m.range.startColumn,
            m.range.endLineNumber,
            m.range.endColumn,
          ),
          options: {
            inlineClassName:
              i === idx ? "ls-find-match-current" : "ls-find-match",
            overviewRuler: {
              color: "#facc15",
              position: monaco.editor.OverviewRulerLane.Center,
            },
          },
        }));

        try {
          findDecorationsRef.current = editor.deltaDecorations(
            findDecorationsRef.current,
            decorations,
          );
        } catch {
          findDecorationsRef.current = [];
        }

        if (shouldMove) {
          const match = matches[idx];
          editor.revealRangeInCenter(match.range);
          editor.setPosition({
            lineNumber: match.range.startLineNumber,
            column: match.range.startColumn,
          });
        }

        return { current: idx + 1, total: matches.length };
      },
      [clearFindHighlights],
    );

    const insertAtCursor = useCallback(
      (
        text: string,
        options?: { beforeInsert?: (content: string) => string },
      ): boolean => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const path = activePathRef.current;
        if (!editor || !monaco || !path || !text) return false;
        const model = editor.getModel();
        if (!model) return false;

        const original = model.getValue();
        const selection =
          editor.getSelection() ??
          new monaco.Selection(
            model.getLineCount(),
            model.getLineMaxColumn(model.getLineCount()),
            model.getLineCount(),
            model.getLineMaxColumn(model.getLineCount()),
          );
        let startOffset = model.getOffsetAt({
          lineNumber: selection.startLineNumber,
          column: selection.startColumn,
        });
        const endOffset = model.getOffsetAt({
          lineNumber: selection.endLineNumber,
          column: selection.endColumn,
        });

        let base = original;
        if (options?.beforeInsert) {
          const prepared = options.beforeInsert(original);
          if (prepared !== original) {
            const oldBegin = original.indexOf("\\begin{document}");
            const delta = prepared.length - original.length;
            if (oldBegin >= 0 && startOffset >= oldBegin) {
              startOffset += delta;
            }
            // seleção antiga deixa de valer após reescrever o preâmbulo
            base = prepared;
            const finalContent =
              base.slice(0, startOffset) + text + base.slice(startOffset);
            editor.pushUndoStop();
            const ok = editor.executeEdits("latex-studio-insert", [
              {
                range: model.getFullModelRange(),
                text: finalContent,
                forceMoveMarkers: true,
              },
            ]);
            editor.pushUndoStop();
            if (!ok) return false;
            onChangeRef.current(path, finalContent);
            const end = model.getPositionAt(startOffset + text.length);
            editor.setPosition(end);
            editor.revealPositionInCenter(end);
            editor.focus();
            return true;
          }
        }

        editor.pushUndoStop();
        const ok = editor.executeEdits("latex-studio-insert", [
          {
            range: selection,
            text,
            forceMoveMarkers: true,
          },
        ]);
        editor.pushUndoStop();
        if (!ok) return false;

        const next = model.getValue();
        onChangeRef.current(path, next);
        const end = model.getPositionAt(startOffset + text.length);
        editor.setPosition(end);
        editor.revealPositionInCenter(end);
        editor.focus();
        return true;
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        find: findInEditor,
        focus: () => editorRef.current?.focus(),
        clearFind: clearFindHighlights,
        insertAtCursor,
      }),
      [findInEditor, clearFindHighlights, insertAtCursor],
    );

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
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        props.onRequestFind?.();
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
      clearFindHighlights();
      matchIndexRef.current = 0;
      lastFindQueryRef.current = "";
    }, [props.activePath, clearFindHighlights]);

    useEffect(() => {
      if (!props.reveal || !editorRef.current) return;
      if (props.reveal.path !== props.activePath) return;
      const line = props.reveal.line;
      const column = props.reveal.column ?? 1;
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.focus();
    }, [props.reveal, props.activePath]);

    useEffect(() => {
      // Monaco precisa recalcular altura ao entrar/sair do modo Full
      const id = window.setTimeout(() => {
        editorRef.current?.layout();
        window.dispatchEvent(new Event("resize"));
      }, 50);
      return () => window.clearTimeout(id);
    }, [props.expanded]);

    const uniqueTabs = props.tabs.filter(
      (tab, index, arr) => arr.findIndex((t) => t.path === tab.path) === index,
    );
    const tabs = uniqueTabs;

    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-950">
        <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-1">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
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
          {props.onToggleExpand && (
            <button
              type="button"
              onClick={props.onToggleExpand}
              className="ml-1 shrink-0 rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:border-sky-500"
              title={
                props.expanded
                  ? "Voltar ao layout normal (Esc)"
                  : "Expandir editor (.tex/.md) em tela cheia"
              }
            >
              {props.expanded ? "Sair da tela cheia" : "Editor Full"}
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1">
          {active ? (
            <Editor
              height="100%"
              theme={props.theme}
              path={active.path}
              language={languageFor(active.path)}
              value={active.content}
              onChange={(value) => props.onChange(active.path, value ?? "")}
              onMount={handleMount}
              options={{
                fontSize: props.fontSize,
                wordWrap: props.wordWrap ? "on" : "off",
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                find: {
                  addExtraSpaceOnTop: false,
                  autoFindInSelection: "never",
                  seedSearchStringFromSelection: "always",
                },
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
  },
);
