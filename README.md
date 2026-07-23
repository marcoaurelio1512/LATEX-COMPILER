# LaTeX Studio Local

> **Começando agora?** Manual completo: [MANUAL-USO.md](MANUAL-USO.md) (também no botão **Como usar** do app)
>
> Resumo curto: [COMO-USAR.md](COMO-USAR.md)
>
> **Replicar em outro Mac?** Veja a lista completa: [REQUISITOS-INSTALACAO.md](REQUISITOS-INSTALACAO.md) — explicação simples de ligar, abrir projeto, compilar e ver o PDF.


Overleaf local simplificado: edite, compile e visualize projetos LaTeX **inteiramente no seu computador**.

**Por padrão, arquivos do projeto permanecem no seu Mac.**  
A única exceção opcional é o **Assistente de IA**: se você cadastrar uma chave OpenAI-compatible, o texto do chat é enviado à LLM configurada.

## Recursos

### Editor e projetos
- Abrir/criar projetos locais (seletor nativo no macOS; diálogo na tela do navegador padrão)
- Abrir pasta **ou** arquivo `.tex` / `.md` (o Studio carrega a pasta do arquivo)
- Árvore de arquivos: criar, renomear e **excluir**; **preview** ao clicar em imagens (png/jpg/gif/svg/webp)
- Editor Monaco (LaTeX / BibTeX / Markdown) com abas
- Barra superior **agrupada por função** (Arquivo · Edição · Converter · Compilar · Painéis)
- Salvar, **Salvar como…** e **Baixar** o arquivo atual
- Definir arquivo principal (**Usar na compilação**)
- **Procurar** texto no arquivo aberto ou em todo o projeto (⌘/Ctrl+F)
- **Inserir Figura** / **Inserir Citação**: miniaturas; citação no formato `(\cite{chave})`; auto `graphicx`/`biblatex`/`babel` (brasileiro → rótulo **Figura**)

### Templates de publicação
- Wizard em **2 passos** ao criar projeto: **tipo** → **template**
- Tipos: Livro, Paper científico, Tese, Dissertação, Monografia, Relatório técnico, Beamer, Personalizado
- Templates nativos: Book / Memoir / KOMA, IEEE, ACM, Springer LNCS, Elsevier, Nature, MDPI, arXiv, ABNT, Beamer e outros
- Importar template oficial de revista/editora via **pasta** (ZIP descompactado) com `.cls`, `.sty`, `.bst`, logos, etc.
- Separação clara: **conteúdo** (`content/`) · **template** (`templates/`) · **configuração** (`metadata.json`, `.latex-local.json`) · **compilação**
- Camada de compatibilidade (`studio-compat.sty`): macros como `\DocumentTitle`, `\DocumentAuthor` — o texto não depende da classe IEEE/Nature/etc.
- Painel **Templates** no workspace: listar, validar, importar, remover importados e **trocar template** sem apagar o conteúdo
- Cache de análise em `~/.latex-studio-local/` ao importar

### Compilação e PDF
- Compilação via `latexmk` (LuaLaTeX, XeLaTeX, PDFLaTeX conforme o template/projeto)
- Biber/BibTeX conforme o documento; `BIBINPUTS`/`TEXINPUTS` na raiz (capítulos em subpastas)
- **Compilar gera o documento completo em PDF** quando o arquivo principal inclui a árvore (capítulos, figuras, `.bib`)
- Preview PDF embutido; **Visualizar Full** em overlay na mesma página
- Diagnósticos a partir do **log final** (evita falsos “Citation undefined” / “rerun Biber” de passagens intermediárias)
- **Copiar problemas** na aba Problemas
- Compilação automática ao salvar (opcional)
- Watchdog para alterações externas
- Modo nativo ou Docker isolado (`--network none`, sem root, sem shell-escape)
- Metadados em SQLite local (`~/.latex-studio-local/`)

### Markdown ↔ LaTeX e bibliografia
- **MD → TeX:** converte Markdown em `.tex` (Pandoc se disponível; fallback interno)
- **MD → .bib:** extrai referências com escolha de perfil (**biblatex** / **bibtex** / **abnt**)
- **.bib → formato:** reconverte um `.bib` entre esses perfis
- **TeX → MD:** gera Markdown a partir de um `.tex`
- Após MD → TeX, o `.tex` gerado pode ser definido como arquivo principal

### Assistente de IA (opcional)
- Painel **Assistente IA** no workspace
- Chave no padrão OpenAI-compatible (`base_url` + `model` + `api_key`)
- Chave armazenada só no Mac (`~/.latex-studio-local/ai-settings.json`, permissão restrita)
- Conversas com resposta em **Markdown**
- **Salvar .md** ou **Salvar .md → .tex** (converte e pode marcar como principal)
- Contexto opcional do arquivo aberto no editor
- **Traduzir projeto → EN:** traduz `.tex`/`.md`/`.bib`/`.txt` PT→EN via LLM, com backup em `.latex-local/translate-backup/`

### Documentação
- Manual completo para estudantes: [MANUAL-USO.md](MANUAL-USO.md)
- Resumo: [COMO-USAR.md](COMO-USAR.md)
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

- `INICIAR.command` — sobe API (8000) e App (3000), abre o **navegador padrão** em **página inteira**
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

## Pasta típica (projeto de publicação)

Projetos criados pelo wizard de templates:

```text
MeuProjeto/
├── main.tex                 # wrapper (classe do template) — COMPILE ESTE
├── metadata.json            # tipo, template, engine, bibliografia
├── studio-compat.sty        # macros \DocumentTitle, \DocumentAuthor…
├── .latex-local.json
├── content/
│   ├── frontmatter.tex
│   ├── chapters/            # (ou body.tex / slides.tex)
│   ├── figures/
│   └── tables/
├── references/
│   └── references.bib
├── templates/<id>/          # .cls/.sty do template + cópia do compat
├── config/
├── build/
├── output/
└── logs/
```

Ao clicar em **Compilar**, o Studio roda `latexmk` no `main.tex`. Esse arquivo inclui frontmatter, capítulos e bibliografia — o PDF gerado é o **documento completo** (livro/paper inteiro), não um capítulo isolado.

Detalhes passo a passo: [COMO-USAR.md](COMO-USAR.md).

## Pasta clássica de livro (também suportada)

```text
meu-livro/
├── main.tex
├── referencias.bib
├── capitulos/
│   ├── 01-introducao.tex
│   └── ...
└── figuras/
```

## Testes

```bash
make test
# ou: cd backend && .venv/bin/pytest -q
```

## Configuração do projeto

Arquivo `.latex-local.json` na raiz (preferências de compilação):

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

Em projetos de publicação há também `metadata.json` (tipo, template, classe, engine).

Saída de compilação: `<projeto>/.latex-local/build/`

## Atalhos

| Atalho | Ação |
|--------|------|
| ⌘/Ctrl+S | Salvar |
| ⌘/Ctrl+F | Procurar |
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
- Endpoint `POST /api/projects/{id}/ai/translate-project` — tradução em lote PT→EN (texto dos arquivos)

## Licença

Uso local. Adapte conforme necessário para o seu ambiente.
