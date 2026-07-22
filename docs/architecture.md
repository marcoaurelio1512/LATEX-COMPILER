# Arquitetura

```text
Navegador local (http://localhost:3000)
      ↓
Frontend Next.js + Monaco + react-pdf
      ↓
API FastAPI (http://localhost:8000)
      ↓
Serviço de compilação (nativo ou Docker)
      ↓
latexmk + LuaLaTeX / XeLaTeX / PDFLaTeX
      ↓
PDF + logs + diagnósticos estruturados
```

## Privacidade

- Sem conta, telemetria ou analytics.
- Documentos nunca saem da máquina.
- Compilação Docker usa `--network none`.
- Shell-escape é bloqueado.

## Segurança de caminhos

Toda leitura/escrita passa por `resolve_safe_project_path`, que rejeita `..`, absolutos e symlinks externos.
