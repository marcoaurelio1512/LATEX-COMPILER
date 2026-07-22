import { API_BASE } from "@/lib/config";
import type {
  AiChatMessage,
  AiSettings,
  CompilationJob,
  FileContent,
  FileNode,
  ProjectConfig,
  ProjectDetail,
  ProjectSummary,
  SystemDiagnostics,
} from "@/types";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: unknown = await res.text();
    try {
      detail = JSON.parse(detail as string);
    } catch {
      /* keep text */
    }
    throw new Error(
      typeof detail === "object" && detail && "detail" in detail
        ? JSON.stringify((detail as { detail: unknown }).detail)
        : `HTTP ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<ProjectSummary[]>("/projects"),
  openProject: (body: {
    path?: string;
    use_native_picker?: boolean;
    pick_tex_file?: boolean;
  }) =>
    request<ProjectDetail>("/projects/open", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pickFolder: () =>
    request<{ path: string }>("/projects/pick-folder", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  pickTex: () =>
    request<{ path: string }>("/projects/pick-tex", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  createProject: (body: {
    name: string;
    parent_path?: string;
    template?: string;
    use_native_picker?: boolean;
  }) =>
    request<ProjectDetail>("/projects/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProject: (id: string) => request<ProjectDetail>(`/projects/${id}`),
  getTree: (id: string) => request<FileNode>(`/projects/${id}/tree`),
  readFile: (id: string, path: string) =>
    request<FileContent>(
      `/projects/${id}/file?path=${encodeURIComponent(path)}`,
    ),
  writeFile: (
    id: string,
    body: {
      path: string;
      content: string;
      expected_mtime?: number | null;
      force?: boolean;
    },
  ) =>
    request<FileContent>(`/projects/${id}/file`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  createFile: (
    id: string,
    body: { path: string; content?: string; is_directory?: boolean },
  ) =>
    request<FileNode>(`/projects/${id}/file`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteFile: (id: string, path: string) =>
    request<{ ok: boolean }>(`/projects/${id}/file`, {
      method: "DELETE",
      body: JSON.stringify({ path }),
    }),
  rename: (id: string, path: string, new_path: string) =>
    request<FileNode>(`/projects/${id}/rename`, {
      method: "POST",
      body: JSON.stringify({ path, new_path }),
    }),
  mkdir: (id: string, path: string) =>
    request<FileNode>(`/projects/${id}/mkdir`, {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  getConfig: (id: string) =>
    request<ProjectConfig>(`/projects/${id}/config`),
  putConfig: (id: string, config: ProjectConfig) =>
    request<ProjectDetail>(`/projects/${id}/config`, {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  compile: (id: string, body?: Record<string, unknown>) =>
    request<CompilationJob>(`/projects/${id}/compile`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  compileClean: (id: string) =>
    request<CompilationJob>(`/projects/${id}/compile/clean`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  cancel: (jobId: string) =>
    request<{ ok: boolean }>(`/compilations/${jobId}/cancel`, {
      method: "POST",
    }),
  getJob: (jobId: string) =>
    request<CompilationJob>(`/compilations/${jobId}`),
  getLogs: (jobId: string) =>
    request<{ job_id: string; log: string; diagnostics: unknown[] }>(
      `/compilations/${jobId}/logs`,
    ),
  diagnostics: () => request<SystemDiagnostics>("/system/diagnostics"),
  pdfUrl: (projectId: string, version?: number | string) =>
    `${API_BASE}/projects/${projectId}/pdf?version=${version ?? Date.now()}`,
  texToMd: (id: string, body: { path: string; output_path?: string }) =>
    request<{
      source_path: string;
      output_path: string;
      method: string;
      message: string;
    }>(`/projects/${id}/convert/tex-to-md`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  mdToTex: (id: string, body: { path: string; output_path?: string }) =>
    request<{
      source_path: string;
      output_path: string;
      method: string;
      message: string;
    }>(`/projects/${id}/convert/md-to-tex`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  searchFiles: (id: string, q: string) =>
    request<{ matches: string[] }>(
      `/projects/${id}/files?q=${encodeURIComponent(q)}`,
    ),
  getAiSettings: () => request<AiSettings>("/ai/settings"),
  putAiSettings: (body: Partial<AiSettings>) =>
    request<AiSettings>("/ai/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  putAiKey: (api_key: string) =>
    request<AiSettings>("/ai/settings/key", {
      method: "PUT",
      body: JSON.stringify({ api_key }),
    }),
  deleteAiKey: () =>
    request<AiSettings>("/ai/settings/key", { method: "DELETE" }),
  aiChat: (body: {
    messages: AiChatMessage[];
    project_id?: string;
    context_path?: string;
    context_excerpt?: string;
  }) =>
    request<{ reply_markdown: string; model: string; usage_tokens?: number }>(
      "/ai/chat",
      { method: "POST", body: JSON.stringify(body) },
    ),
  aiSaveMarkdown: (
    id: string,
    body: {
      path: string;
      content: string;
      convert_to_tex?: boolean;
      set_as_main?: boolean;
    },
  ) =>
    request<{ md_path: string; tex_path?: string | null; message: string }>(
      `/projects/${id}/ai/save-markdown`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};
