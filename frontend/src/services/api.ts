import { API_BASE } from "@/lib/config";
import type {
  AiChatMessage,
  AiSettings,
  CompilationJob,
  FileContent,
  FileNode,
  ProjectConfig,
  ProjectDetail,
  ProjectMetadata,
  ProjectSummary,
  ProjectType,
  SystemDiagnostics,
  TemplateManifest,
  TemplateValidation,
  ContentSearchResponse,
  ManualResponse,
  InsertablesResponse,
  TranslateProjectResponse,
} from "@/types";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      "Não foi possível conectar à API (Load failed). Os servidores estão desligados? Rode INICIAR.command e abra http://localhost:3000 de novo.",
    );
  }
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
  deleteProject: (id: string, deleteFiles = false) =>
    request<{ ok: boolean }>(
      `/projects/${id}?delete_files=${deleteFiles ? "true" : "false"}`,
      { method: "DELETE" },
    ),
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
  createPublicationProject: (body: {
    name: string;
    project_type: ProjectType;
    template_id: string;
    parent_path?: string;
    use_native_picker?: boolean;
  }) =>
    request<ProjectDetail>("/projects/create-publication", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listTemplates: (projectType?: ProjectType) =>
    request<TemplateManifest[]>(
      projectType
        ? `/templates?project_type=${encodeURIComponent(projectType)}`
        : "/templates",
    ),
  getTemplate: (id: string) =>
    request<TemplateManifest>(`/templates/${encodeURIComponent(id)}`),
  installTemplate: (body: {
    path?: string;
    use_native_picker?: boolean;
    name?: string;
  }) =>
    request<TemplateManifest>("/templates/install", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  validateTemplate: (id: string) =>
    request<TemplateValidation>(
      `/templates/${encodeURIComponent(id)}/validate`,
      { method: "POST" },
    ),
  deleteTemplate: (id: string) =>
    request<{ ok: boolean }>(`/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getProjectMetadata: (id: string) =>
    request<ProjectMetadata>(`/projects/${id}/metadata`),
  switchTemplate: (projectId: string, templateId: string) =>
    request<ProjectMetadata>(
      `/projects/${projectId}/switch-template?template_id=${encodeURIComponent(templateId)}`,
      { method: "POST" },
    ),
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
  compileClean: (id: string, body?: Record<string, unknown>) =>
    request<CompilationJob>(`/projects/${id}/compile/clean`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
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
  getManual: () => request<ManualResponse>("/docs/manual"),
  getInsertables: (id: string) =>
    request<InsertablesResponse>(`/projects/${id}/insertables`),
  pdfUrl: (projectId: string, version?: number | string) =>
    `${API_BASE}/projects/${projectId}/pdf?version=${version ?? Date.now()}`,
  assetUrl: (projectId: string, path: string) =>
    `${API_BASE}/projects/${projectId}/asset?path=${encodeURIComponent(path)}`,
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
  mdToBib: (
    id: string,
    body: {
      path?: string;
      content?: string;
      output_path?: string;
      append?: boolean;
      profile?: "biblatex" | "bibtex" | "abnt";
    },
  ) =>
    request<{
      source_path?: string | null;
      output_path: string;
      entries_count: number;
      keys: string[];
      message: string;
      profile?: string;
    }>(`/projects/${id}/convert/md-to-bib`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  convertBib: (
    id: string,
    body: {
      path: string;
      output_path?: string;
      profile?: "biblatex" | "bibtex" | "abnt";
    },
  ) =>
    request<{
      source_path: string;
      output_path: string;
      entries_count: number;
      keys: string[];
      message: string;
      profile: string;
    }>(`/projects/${id}/convert/bib`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  searchFiles: (id: string, q: string) =>
    request<{ matches: string[] }>(
      `/projects/${id}/files?q=${encodeURIComponent(q)}`,
    ),
  searchContent: (id: string, q: string, caseSensitive = false) =>
    request<ContentSearchResponse>(
      `/projects/${id}/search-content?q=${encodeURIComponent(q)}&case_sensitive=${caseSensitive}`,
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
  translateProject: (
    id: string,
    body?: {
      extensions?: string[];
      dry_run?: boolean;
      create_backup?: boolean;
    },
  ) =>
    request<TranslateProjectResponse>(
      `/projects/${id}/ai/translate-project`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    ),

};
