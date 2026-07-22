"use client";

import { useMemo, useState } from "react";
import type { FileNode } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  Image as ImageIcon,
} from "lucide-react";

interface Props {
  tree: FileNode | null;
  activePath: string | null;
  dirtyPaths: Set<string>;
  onOpen: (path: string) => void;
  onRefresh: () => void;
  onCreateFile: (parent: string) => void;
  onCreateDir: (parent: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
  collapsed?: boolean;
}

function iconFor(node: FileNode, open: boolean) {
  if (node.type === "directory") {
    return open ? (
      <FolderOpen className="h-4 w-4 text-amber-400" />
    ) : (
      <Folder className="h-4 w-4 text-amber-400" />
    );
  }
  const ext = node.extension ?? "";
  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) {
    return <ImageIcon className="h-4 w-4 text-violet-400" />;
  }
  return <FileCode2 className="h-4 w-4 text-sky-400" />;
}

function TreeNode({
  node,
  depth,
  activePath,
  dirtyPaths,
  onOpen,
  onCreateFile,
  onCreateDir,
  onDelete,
  onRename,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  dirtyPaths: Set<string>;
  onOpen: (path: string) => void;
  onCreateFile: (parent: string) => void;
  onCreateDir: (parent: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isActive = activePath === node.path;
  const dirty = dirtyPaths.has(node.path);

  if (node.type === "directory") {
    return (
      <div>
        <div
          className={`group flex items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-zinc-800 ${
            isActive ? "bg-zinc-800" : ""
          }`}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <button
            type="button"
            className="flex flex-1 items-center gap-1 text-left"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            )}
            {iconFor(node, open)}
            <span>{node.name || "projeto"}</span>
          </button>
          <div className="hidden gap-1 group-hover:flex">
            <button
              type="button"
              title="Novo arquivo"
              className="text-xs text-zinc-400 hover:text-white"
              onClick={() => onCreateFile(node.path)}
            >
              +
            </button>
            <button
              type="button"
              title="Nova pasta"
              className="text-xs text-zinc-400 hover:text-white"
              onClick={() => onCreateDir(node.path)}
            >
              ⌂
            </button>
          </div>
        </div>
        {open &&
          (node.children ?? []).map((child) => (
            <TreeNode
              key={`${child.type}:${child.path || child.name}`}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              onOpen={onOpen}
              onCreateFile={onCreateFile}
              onCreateDir={onCreateDir}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-zinc-800 ${
        isActive ? "bg-sky-950 text-sky-100" : ""
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <button
        type="button"
        className="flex flex-1 items-center gap-1 truncate text-left"
        onClick={() => onOpen(node.path)}
      >
        <span className="w-3.5" />
        {iconFor(node, false)}
        <span className="truncate">
          {node.name}
          {dirty ? " •" : ""}
        </span>
      </button>
      <div className="hidden gap-1 group-hover:flex">
        <button
          type="button"
          className="text-xs text-zinc-400 hover:text-white"
          onClick={() => onRename(node.path)}
        >
          ✎
        </button>
        <button
          type="button"
          className="text-xs text-zinc-400 hover:text-red-400"
          onClick={() => onDelete(node.path)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function FileTree(props: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!props.tree || !query.trim()) return props.tree;
    const q = query.toLowerCase();

    function filterNode(node: FileNode): FileNode | null {
      if (node.type === "file") {
        return node.name.toLowerCase().includes(q) ? node : null;
      }
      const children = (node.children ?? [])
        .map(filterNode)
        .filter(Boolean) as FileNode[];
      if (children.length === 0 && !node.name.toLowerCase().includes(q)) {
        return null;
      }
      return { ...node, children };
    }

    return filterNode(props.tree);
  }, [props.tree, query]);

  if (props.collapsed) return null;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Arquivos
        </span>
        <button
          type="button"
          onClick={props.onRefresh}
          className="text-xs text-sky-400 hover:underline"
        >
          Atualizar
        </button>
      </div>
      <div className="border-b border-zinc-800 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar arquivos"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </div>
      <div className="flex-1 overflow-auto py-1">
        {filtered ? (
          <TreeNode
            node={filtered}
            depth={0}
            activePath={props.activePath}
            dirtyPaths={props.dirtyPaths}
            onOpen={props.onOpen}
            onCreateFile={props.onCreateFile}
            onCreateDir={props.onCreateDir}
            onDelete={props.onDelete}
            onRename={props.onRename}
          />
        ) : (
          <p className="px-3 py-2 text-xs text-zinc-500">Nenhum arquivo</p>
        )}
      </div>
    </aside>
  );
}
