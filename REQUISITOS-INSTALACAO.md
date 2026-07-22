# Requisitos e instalação — LaTeX Studio Local

Este arquivo lista **tudo o que precisa existir** em um computador macOS para o app funcionar como neste projeto.

Use-o quando for **replicar em outro Mac**.

---

## Resumo rápido

| Item | Obrigatório? | Para quê | Como instalamos / instalar |
|------|--------------|----------|----------------------------|
| macOS | Sim | Sistema | Já vem no Mac |
| Homebrew | Recomendado | Instalar o resto | Ver abaixo |
| Python 3.9+ | Sim | Backend (API) | Costuma já vir / Xcode CLT |
| Node.js 18+ e npm | Sim | Frontend (interface) | `brew install node` |
| MacTeX (`mactex-no-gui` ou `mactex`) | Sim (para PDF) | Compilar `.tex` → PDF | `brew install --cask mactex-no-gui` |
| Pandoc | Recomendado | Converter `.md` → `.tex` com qualidade | `brew install pandoc` |
| Docker Desktop | Não | Compilação isolada (modo Docker) | Opcional |
| Dependências do projeto | Sim | Rodar o Studio | `./scripts/setup-macos.sh` |

**Privacidade:** tudo roda local. Não precisa de conta na nuvem.

---

## 1. O que já estava / instalamos neste Mac

Conforme o uso neste projeto:

1. **Homebrew** — gerenciador de pacotes do Mac  
2. **Node.js + npm** — interface Next.js  
3. **Python 3** — API FastAPI  
4. **MacTeX (TeX Live 2026 / mactex-no-gui)** — `latexmk`, LuaLaTeX, XeLaTeX, PDFLaTeX, Biber, BibTeX  
5. **Pandoc** — conversão Markdown → LaTeX  
6. **Dependências do app** — `backend/.venv` (pip) e `frontend/node_modules` (npm)  

**Não é obrigatório** para o uso básico:

- Docker Desktop  

---

## 2. Instalação em um Mac novo (passo a passo)

### Passo A — Homebrew

Se ainda não tiver:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Siga as instruções finais do instalador (às vezes pede para adicionar o brew ao `PATH`).

### Passo B — Node.js

```bash
brew install node
node -v
npm -v
```

### Passo C — Python 3

No macOS moderno costuma existir. Confira:

```bash
python3 --version
```

Se faltar:

```bash
brew install python
```

### Passo D — MacTeX (obrigatório para gerar PDF)

Instalação grande (pode demorar):

```bash
brew install --cask mactex-no-gui
```

Alternativa completa com interface:

```bash
brew install --cask mactex
```

Depois:

1. **Feche e abra o Terminal**  
2. Confira:

```bash
which latexmk
latexmk -v
lualatex --version
```

Se `which latexmk` não achar, mas os arquivos existirem em `/usr/local/texlive/...`, o Studio ainda tenta detectar sozinho. Idealmente deve existir:

```text
/Library/TeX/texbin
```

### Passo E — Pandoc (recomendado para MD → TeX)

```bash
brew install pandoc
pandoc --version
```

Sem Pandoc o Studio ainda converte `.md` com um conversor interno **básico**.

### Passo F — Copiar o projeto

Copie a pasta inteira do app para o outro Mac, por exemplo:

```text
~/Desktop/PROJETO COMPILADOR LATEX
```

Ou clone/copie por pendrive/rede.  
**Não é necessário** copiar:

- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/.next/`
- `.runtime/`

Essas pastas são recriadas no setup.

### Passo G — Preparar o app

```bash
cd "/caminho/para/PROJETO COMPILADOR LATEX"
./scripts/setup-macos.sh
```

Isso cria o ambiente Python e instala os pacotes Node.

### Passo H — Ligar

No Finder, dê dois cliques em:

- `INICIAR.command`

Ou no Terminal:

```bash
./scripts/iniciar.sh
```

Abre em: http://localhost:3000  

Para desligar: `PARAR.command`

---

## 3. Checklist de verificação (cole no Terminal)

```bash
echo "=== Checklist LaTeX Studio Local ==="
command -v brew && brew --version | head -1 || echo "FALTA: brew"
command -v node && node -v || echo "FALTA: node"
command -v npm && npm -v || echo "FALTA: npm"
command -v python3 && python3 --version || echo "FALTA: python3"
command -v pandoc && pandoc --version | head -1 || echo "FALTA (opcional): pandoc"
command -v latexmk && latexmk -v | head -1 || echo "FALTA: latexmk (MacTeX)"
command -v lualatex && lualatex --version | head -1 || echo "FALTA: lualatex (MacTeX)"
command -v docker && docker --version || echo "OK ausente: docker (opcional)"
```

No app: tela inicial → **Configurações / Diagnóstico** → **Verificar novamente**.

Esperado para compilar PDF:

- Latexmk: instalado  
- LuaLaTeX: instalado  

Docker pode ficar ausente.

---

## 4. Comandos oficiais usados neste projeto

```bash
# Pacotes do sistema (macOS)
brew install node
brew install --cask mactex-no-gui
brew install pandoc

# App (dentro da pasta do projeto)
./scripts/setup-macos.sh
./scripts/iniciar.sh
./scripts/parar.sh

# Testes do backend (opcional)
cd backend && source .venv/bin/activate && pytest -q
```

Script de conferência do próprio projeto:

```bash
./scripts/check-dependencies.sh
```

---

## 5. O que o app cria sozinho (não precisa instalar)

| Caminho | Conteúdo |
|---------|----------|
| `backend/.venv/` | Ambiente virtual Python |
| `frontend/node_modules/` | Pacotes do frontend |
| `~/.latex-studio-local/` | Banco SQLite de projetos recentes |
| `<projeto>/.latex-local.json` | Config do projeto (main, motor, etc.) |
| `<projeto>/.latex-local/build/` | PDF e arquivos temporários da compilação |
| `.runtime/logs/` | Logs do INICIAR/PARAR |

---

## 6. Windows / Linux (visão futura)

Este guia foca em **macOS**, que foi o ambiente usado.

Em outros sistemas, a ideia é a mesma:

1. Python 3.9+  
2. Node.js 18+  
3. TeX Live (em vez do MacTeX)  
4. Pandoc (opcional)  
5. `setup` + backend porta 8000 + frontend porta 3000  

Os scripts `.command` são específicos do Mac; no Linux/Windows use `scripts/iniciar.sh` e `scripts/parar.sh` (ou adapte).

---

## 7. Problemas que já vimos e como evitar

| Problema | Solução |
|----------|---------|
| Diagnóstico diz Latexmk ausente | Instalar MacTeX; reiniciar Terminal/Studio |
| Senha do Terminal “não aparece” | Normal; digite e Enter |
| Compilar baixava PDF em loop | Já corrigido no app; use a versão atual |
| MD → TeX fraco | Instalar Pandoc |
| `INICIAR` falha no venv/npm | Rodar `./scripts/setup-macos.sh` de novo |

---

## 8. Ordem mínima para “funcionar de verdade”

1. Homebrew  
2. Node.js  
3. Python 3  
4. MacTeX  
5. Pandoc (se for usar Markdown)  
6. Copiar o projeto  
7. `./scripts/setup-macos.sh`  
8. `INICIAR.command`  

Pronto: editar `.tex` / converter `.md` → **Compilar** → ver PDF.
