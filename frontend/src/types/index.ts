export type Engine = "lualatex" | "xelatex" | "pdflatex";
export type CompilerMode = "native" | "docker";
export type JobStatus =
  | "idle"
  | "queued"
  | "preparing"
  | "compiling"
  | "completed"
  | "failed"
  | "timeout"
  | "cancelled";

export interface ProjectConfig {
  main_file: string | null;
  engine: Engine;
  bibliography: "auto" | "biber" | "bibtex" | "none";
  auto_compile: boolean;
  synctex: boolean;
  compiler_mode: CompilerMode;
  halt_on_error: boolean;
  timeout_seconds: number;
  cancel_previous_on_new: boolean;
  compile_debounce_ms: number;
  autosave_debounce_ms: number;
  autosave: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  root_path: string;
  main_file: string | null;
  engine: Engine;
  compiler_mode: CompilerMode;
  auto_compile: boolean;
  last_opened_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  config: ProjectConfig;
  main_candidates: string[];
  initial_file?: string | null;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  extension?: string | null;
  size?: number | null;
  modified_at?: string | null;
  children?: FileNode[] | null;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  size: number;
  modified_at: string;
  editable: boolean;
}

export interface Diagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  file: string | null;
  line: number | null;
  column: number | null;
  message: string;
  raw_message: string;
  context: string | null;
  suggestion: string | null;
}

export interface CompilationJob {
  job_id: string;
  project_id: string;
  status: JobStatus;
  engine: Engine;
  main_file: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  exit_code: number | null;
  error_count: number;
  warning_count: number;
  log_path: string | null;
  pdf_path: string | null;
  synctex_path: string | null;
  diagnostics: Diagnostic[];
  compile_pending: boolean;
}

export interface ToolStatus {
  name: string;
  installed: boolean;
  path: string | null;
  version: string | null;
  guidance: string | null;
}

export interface SystemDiagnostics {
  platform: string;
  tools: ToolStatus[];
  ready_native: boolean;
  ready_docker: boolean;
  notes: string[];
}

export interface EditorTab {
  path: string;
  content: string;
  originalContent: string;
  dirty: boolean;
  mtime: number | null;
}


export interface AiSettings {
  enabled: boolean;
  base_url: string;
  model: string;
  has_api_key: boolean;
  api_key_hint: string | null;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
