# LaTeX Studio Local

> **Começando agora?** Leia o guia para leigos: [COMO-USAR.md](COMO-USAR.md)
>
> **Replicar em outro Mac?** Veja a lista completa: [REQUISITOS-INSTALACAO.md](REQUISITOS-INSTALACAO.md) — explicação simples de ligar, abrir projeto, compilar e ver o PDF.


Overleaf local simplificado: edite, compile e visualize projetos LaTeX **inteiramente no seu computador**.

**Todos os arquivos permanecem no computador do usuário.**

Não há conta, nuvem, telemetria, analytics nem envio de documentos para APIs externas.

## Recursos

- Abrir/criar projetos locais (seletor nativo no macOS)
- Árvore de arquivos com criar/renomear/excluir
- Editor Monaco (LaTeX/BibTeX) com abas
- Compilação via `latexmk` (LuaLaTeX padrão, XeLaTeX, PDFLaTeX)
- Biber/BibTeX conforme o documento
- Preview PDF embutido
- Logs e diagnósticos (arquivo + linha) clicáveis
- Compilação automática ao salvar
- Watchdog para alterações externas
- Modo nativo ou Docker isolado (`--network none`, sem root, sem shell-escape)
- Metadados em SQLite local (`~/.latex-studio-local/`)

## Requisitos (macOS)

```bash
# TeX (escolha um)
brew install --cask mactex-no-gui
# brew install --cask mactex

# Node + Python já devem estar instalados
node -v && python3 --version
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
| `book` | Livro válido |
| `error-undefined` | Comando inexistente |
| `error-missing-image` | Imagem ausente |
| `error-missing-ref` | Referência ausente |
| `error-bibtex` / `error-biber` | Bibliografia |
| `slow-timeout` | Teste de timeout |

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

## SyncTeX

Arquitetura preparada; sincronização bidirecional completa fica para evolução futura. Ver [docs/synctex.md](docs/synctex.md).

## IA

Não há integração com IA nesta versão. Existe apenas `DiagnosticAssistant` com sugestões determinísticas locais. Nenhum conteúdo é enviado a modelos remotos.

## Licença

Uso local. Adapte conforme necessário para o seu ambiente.
