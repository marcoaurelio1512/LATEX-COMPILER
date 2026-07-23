"use client";

import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-black/40 px-1 py-0.5 font-mono text-[0.85em] text-sky-200"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const lm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) {
        parts.push(
          <a
            key={key++}
            href={lm[2]}
            className="text-sky-400 underline hover:text-sky-300"
            target="_blank"
            rel="noreferrer"
          >
            {lm[1]}
          </a>,
        );
      } else parts.push(token);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "secao";
}

interface Props {
  markdown: string;
  activeId?: string | null;
}

export function MarkdownLite({ markdown, activeId }: Props) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let seen: Record<string, number> = {};

  const headingId = (title: string) => {
    const base = slug(title);
    const n = seen[base] ?? 0;
    seen[base] = n + 1;
    return n === 0 ? base : `${base}-${n}`;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      nodes.push(
        <pre
          key={`c-${i}`}
          className="my-3 overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-200"
        >
          <code data-lang={lang || undefined}>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.trim() === "---") {
      nodes.push(<hr key={`hr-${i}`} className="my-6 border-zinc-700" />);
      i += 1;
      continue;
    }

    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      const level = hm[1].length;
      const title = hm[2].trim();
      const id = headingId(title);
      const cls =
        level === 1
          ? "mb-4 mt-2 text-2xl font-semibold tracking-tight text-white"
          : level === 2
            ? "mb-3 mt-8 scroll-mt-4 border-b border-zinc-800 pb-2 text-lg font-semibold text-sky-100"
            : "mb-2 mt-5 scroll-mt-4 text-base font-medium text-zinc-100";
      const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
      nodes.push(
        <Tag
          key={id}
          id={id}
          className={`${cls} ${activeId === id ? "rounded bg-sky-500/10" : ""}`}
        >
          {inline(title)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        if (!row.every((c) => /^:?-+:?$/.test(c))) rows.push(row);
        i += 1;
      }
      if (rows.length) {
        const head = rows[0];
        const body = rows.slice(1);
        nodes.push(
          <div key={`t-${i}`} className="my-3 overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-300">
                  {head.map((c, ci) => (
                    <th key={ci} className="px-2 py-1.5 font-medium">
                      {inline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-zinc-800/80">
                    {row.map((c, ci) => (
                      <td key={ci} className="px-2 py-1.5 text-zinc-300">
                        {inline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={`q-${i}`}
          className="my-3 border-l-4 border-sky-500/60 bg-sky-500/5 px-3 py-2 text-sm text-sky-100"
        >
          {buf.map((b, bi) => (
            <p key={bi} className="my-1">
              {inline(b)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (
        i < lines.length &&
        (ordered ? /^\d+\.\s+/.test(lines[i]) : /^[-*]\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(/^([-*]|\d+\.)\s+/, ""));
        i += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      nodes.push(
        <ListTag
          key={`l-${i}`}
          className={`my-2 space-y-1 pl-5 text-sm text-zinc-300 ${
            ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, ii) => (
            <li key={ii}>{inline(item)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("|") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      lines[i].trim() !== "---"
    ) {
      para.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={`p-${i}`} className="my-2 text-sm leading-relaxed text-zinc-300">
        {inline(para.join(" "))}
      </p>,
    );
  }

  return <div className="prose-invert max-w-none">{nodes.map((n, idx) => <Fragment key={idx}>{n}</Fragment>)}</div>;
}
