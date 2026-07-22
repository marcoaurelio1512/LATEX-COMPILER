# LaTeX Studio Local

> **Começando agora?** Leia o guia para leigos: [COMO-USAR.md](COMO-USAR.md)
>
> **Replicar em outro Mac?** Veja a lista completa: [REQUISITOS-INSTALACAO.md](REQUISITOS-INSTALACAO.md) — explicação simples de ligar, abrir projeto, compilar e ver o PDF.


Overleaf local simplificado: edite, compile e visualize projetos LaTeX **inteiramente no seu computador**.

**Por padrão, arquivos do projeto permanecem no seu Mac.**  
A única exceção opcional é o **Assistente de IA**: se você cadastrar uma chave OpenAI-compatible, o texto do chat é enviado à LLM configurada.

## Recursos

### Editor e projetos
- Abrir/criar projetos locais (seletor nativo no macOS)
- Abrir pasta **ou** arquivo `.tex` / `.md` (o Studio carrega a pasta do arquivo)
- Árvore de arquivos com criar/renomear/excluir
- Editor Monaco (LaTeX / BibTeX / Markdown) com abas
- Salvar, **Salvar como…** e **Baixar** o arquivo atual
- Definir arquivo principal (**Usar na compilação**)

### Compilação e PDF
- Compilação via `latexmk` (LuaLaTeX padrão, XeLaTeX, PDFLaTeX)
- Biber/BibTeX conforme o documento (`bibliography: auto`)
- Preview PDF embutido (blob inline, sem download forçado)
- Logs e diagnósticos (arquivo + linha) clicáveis
- Compilação automática ao salvar (opcional)
- Watchdog para alterações externas
- Modo nativo ou Docker isolado (`--network none`, sem root, sem shell-escape)
- Metadados em SQLite local (`~/.latex-studio-local/`)

### Markdown ↔ LaTeX
- **MD → TeX (salvar):** converte Markdown em `.tex` (Pandoc se disponível; conversor interno como fallback)
- **TeX → MD:** gera Markdown a partir de um `.tex`
- Após MD → TeX, o `.tex` gerado pode ser definido automaticamente como arquivo principal

### Assistente de IA (opcional)
- Painel **Assistente IA** no workspace
- Chave no padrão OpenAI-compatible (`base_url` + `model` + `api_key`)
- Chave armazenada só no Mac (`~/.latex-studio-local/ai-settings.json`, permissão restrita)
- Conversas com resposta em **Markdown**
- **Salvar .md** ou **Salvar .md → .tex** (converte e pode marcar como principal)
- Contexto opcional do arquivo aberto no editor

### Documentação
- Guia para leigos com estrutura de pasta de **livro** (`.tex`, `.bib`, capítulos, figuras): [COMO-USAR.md](COMO-USAR.md)
- Exemplo mínimo de livro em `examples/book`

## Requisitos (macOS)

```bash
# TeX (escolha um)
brew install --cask mactex-no-gui
# brew install --cask mactex

# Node + Python já devem estar instalados
node -v && python3 --version

# Opcional (melhor conversão MD↔TeX)
brew install pandoc
```

Guia detalhado: [docs/macos-install.md](docs/macos-install.md)


## INICIAR / PARAR

No Finder, dê dois cliques em:

- `INICIAR.command` — sobe API (8000) e App (3000) em segundo plano
- `PARAR.command` — encerra os servidores

Pelo terminal:

```bash
./scripts/iniciar.sh
./scripts/parar.sh
# ou
make iniciar
make parar
```

Logs em `.runtime/logs/`.

## Início rápido

```bash
./scripts/setup-macos.sh
make dev
# ou: npm run dev
```

| Serviço   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| API       | http://127.0.0.1:8000        |
| OpenAPI   | http://127.0.0.1:8000/docs   |

### Desenvolvimento separado

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

## Compilação Docker (opcional)

```bash
./scripts/build-compiler-image.sh
```

No projeto, escolha modo **Docker**. O container monta **somente** a pasta do projeto, sem rede, com limites de CPU/memória e usuário não-root.

## Exemplos

Em `examples/`:

| Pasta | Propósito |
|-------|-----------|
| `article` | Artigo válido |
| `book` | Livro válido (com capítulos via `\input`) |
| `error-undefined` | Comando inexistente |
| `error-missing-image` | Imagem ausente |
| `error-missing-ref` | Referência ausente |
| `error-bibtex` / `error-biber` | Bibliografia |
| `slow-timeout` | Teste de timeout |

## Pasta típica de um livro

```text
meu-livro/
├── main.tex              # arquivo principal (compilar este)
├── referencias.bib
├── capitulos/
│   ├── 01-introducao.tex
│   └── ...
└── figuras/
```

Detalhes e exemplos de código: seção **“Como montar a pasta de um livro”** em [COMO-USAR.md](COMO-USAR.md).

## Testes

```bash
make test
# ou: cd backend && .venv/bin/pytest -q
```

## Configuração do projeto

Arquivo `.latex-local.json` na raiz do projeto (não altera o conteúdo científico):

```json
{
  "main_file": "main.tex",
  "engine": "lualatex",
  "bibliography": "auto",
  "auto_compile": true,
  "synctex": true,
  "compiler_mode": "native"
}
```

Saída de compilação: `<projeto>/.latex-local/build/`

## Atalhos

| Atalho | Ação |
|--------|------|
| ⌘/Ctrl+S | Salvar |
| ⌘/Ctrl+Enter | Compilar |
| ⌘/Ctrl+Shift+Enter | Limpar e compilar |
| ⌘/Ctrl+P | Abrir arquivo |
| ⌘/Ctrl+B | Árvore |
| ⌘/Ctrl+J | Painel inferior |

## Segurança

- Sem `shell=True`
- Sem `--shell-escape` / `-enable-write18`
- Path traversal e symlinks externos bloqueados
- Extensões e tamanhos limitados
- Timeout configurável (padrão 120s)
- Cancelamento de processo + grupo
- Chave de IA nunca é commitada (fica fora do repositório)

## SyncTeX

Arquitetura preparada; sincronização bidirecional completa fica para evolução futura. Ver [docs/synctex.md](docs/synctex.md).

## IA

Há integração **opcional** com LLMs no padrão OpenAI (`/v1/chat/completions`).

- Desligada por padrão até cadastrar a chave no painel **Assistente IA**
- Sugestões de erro de compilação continuam locais (`DiagnosticAssistant` determinístico)
- Com a IA ativa, o conteúdo do chat (e trechos de contexto, se habilitados) é enviado ao provedor configurado

## Licença

Uso local. Adapte conforme necessário para o seu ambiente.
