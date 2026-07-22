# Como usar o LaTeX Studio Local (guia para leigos)

Este texto explica o software **sem jargão técnico**.  
Se algo der errado, vá direto à seção [Problemas comuns](#problemas-comuns).

---

## O que é este programa?

Imagine o **Word**, mas para textos científicos em LaTeX (artigos, TCCs, livros).

Diferença importante:

| Programa comum | LaTeX Studio Local |
|----------------|--------------------|
| Você digita e já vê a página “pronta” | Você edita o **código** do texto e depois **compila** para gerar o PDF |
| Fica na nuvem (Google Docs, Overleaf online) | Fica **só no seu Mac** — nada é enviado para a internet |

Em uma frase:

> Você abre uma pasta com arquivos `.tex`, edita, aperta **Compilar**, e o PDF aparece do lado direito.

---

## Ideia geral do funcionamento

O programa tem **duas partes** que precisam estar ligadas ao mesmo tempo:

1. **A “oficina” (API / backend)** — lê seus arquivos, chama o LaTeX e gera o PDF  
2. **A “tela” (site local / frontend)** — o que você vê no navegador

Quando você clica em **INICIAR**, as duas partes ligam.  
Quando clica em **PARAR**, as duas desligam.

Depois de iniciar, você abre o navegador em:

**http://localhost:3000**

Isso **não é a internet**. É uma página que roda dentro do seu computador.

```text
Você (navegador)
      ↓
Tela do Studio (localhost:3000)
      ↓
Oficina local (localhost:8000)
      ↓
Arquivos na sua pasta + programa LaTeX do Mac
      ↓
PDF gerado
```

---

## Antes de usar pela primeira vez (só uma vez)

Você precisa de três coisas instaladas no Mac:

1. **Python** e **Node.js** (para o Studio funcionar)
2. **MacTeX** (o “motor” que realmente transforma `.tex` em PDF)
3. Rodar a instalação do próprio Studio

### Passo A — Instalar o MacTeX (recomendado)

No Terminal:

```bash
brew install --cask mactex-no-gui
```

Isso é grande e pode demorar. Depois, **feche e abra o Terminal de novo**.

Para conferir:

```bash
which latexmk
```

Se aparecer um caminho, está ok.

### Passo B — Preparar o Studio

No Terminal, entre na pasta do projeto e rode:

```bash
cd "/Users/marcoaureliocarvalho/Desktop/PROJETO COMPILADOR LATEX"
./scripts/setup-macos.sh
```

Espere terminar. Só precisa disso na primeira vez (ou se algo quebrar).

---

## Como ligar e desligar (o dia a dia)

### Ligar

1. Abra a pasta do projeto no **Finder**
2. Dê **dois cliques** em `INICIAR.command`
3. Uma janela preta (Terminal) vai abrir e mostrar mensagens
4. Quando aparecer algo como:
   - `API http://127.0.0.1:8000/docs`
   - `App http://localhost:3000`
5. O navegador deve **abrir sozinho** em **http://localhost:3000**
   (se não abrir, copie esse endereço manualmente)

Pronto: o programa está ligado.

### Desligar

1. Dê **dois cliques** em `PARAR.command`
2. Espere a mensagem “Servidores parados”

Sempre que terminar de trabalhar, use o **PARAR**.  
Assim o Mac não fica com processos rodando à toa.

---

## Tela inicial — o que cada botão faz

Na primeira tela você verá opções parecidas com estas:

### Abrir arquivo .tex (recomendado se você só tem o arquivo)
Escolhe um arquivo `.tex` no Finder. O Studio abre a **pasta** dele e já mostra o código no editor. Aí é só clicar em **Compilar**.

### Abrir pasta do projeto
Escolhe a pasta inteira do trabalho (com capítulos, imagens, `.bib`).  
Depois, na coluna da esquerda, clique no `.tex` que deseja editar e em **Compilar**.

### Criar projeto novo
Cria uma pasta nova com um artigo de exemplo (`main.tex`).  
Bom para testar se está tudo funcionando.

### Abrir por caminho
Você pode:

1. Clicar em **Escolher pasta…** → abre o Finder → seleciona a pasta → o projeto carrega sozinho  
2. Ou digitar/colar o caminho e clicar em **Carregar**

Exemplo de caminho:

```text
/Users/seu-nome/Documents/meu-tcc
```

### Projetos recentes
Lista pastas que você já abriu antes. Clique para reabrir.

### Configurações / Diagnóstico
Mostra se o LaTeX e o Docker estão instalados.  
Se algo estiver **ausente**, a tela explica o que instalar.  
O programa **não instala sozinho** — você confirma e instala.

---

## A tela de trabalho (depois de abrir um projeto)

A tela se divide em **3 colunas** + uma faixa embaixo:

```text
┌─────────────┬──────────────────────┬─────────────────┐
│  ARQUIVOS   │      EDITOR          │   PREVIEW PDF   │
│  (esquerda) │   (centro)           │   (direita)     │
│             │                      │                 │
│  main.tex   │  código LaTeX aqui   │  páginas do PDF │
│  imagens/   │                      │                 │
└─────────────┴──────────────────────┴─────────────────┘
│  Problemas  |  Log  |  Saída  |  Configurações         │
└────────────────────────────────────────────────────────┘
```

### Coluna esquerda — Arquivos
É a pasta do seu projeto.  
Clique em um arquivo `.tex` para abrir no editor.

### Coluna do meio — Editor
Onde você escreve/edita o LaTeX.  
Parece um bloco de notas com números de linha.

Bolinha ou ponto no nome da aba = arquivo **ainda não salvo**.

### Coluna direita — Preview PDF
Mostra o PDF depois da compilação.  
Se estiver vazio: ainda não compilou, ou a compilação falhou.

### Faixa de baixo — Problemas e Log
- **Problemas:** erros e avisos em português/resumo (clique para ir à linha)
- **Log:** texto técnico completo da compilação
- **Configurações:** opções como “compilar automaticamente”

---

## Como montar a pasta de um livro (para conseguir compilar)

O LaTeX **não trabalha com um arquivo solto** como um `.docx`.  
Ele trabalha com uma **pasta de projeto**. Dentro dela ficam o arquivo principal, os capítulos, as imagens e a bibliografia.

### Estrutura recomendada (copie e adapte)

No Finder, organize assim:

```text
meu-livro/
├── main.tex                 ← arquivo PRINCIPAL (é este que se compila)
├── referencias.bib          ← fichas bibliográficas (opcional, mas comum)
├── .latex-local.json        ← o Studio cria/atualiza sozinho (pode ignorar)
├── capitulos/
│   ├── 01-introducao.tex
│   ├── 02-fundamentos.tex
│   ├── 03-metodo.tex
│   └── 99-conclusao.tex
├── figuras/
│   ├── diagrama.png
│   └── capa.jpg
└── anexos/                  ← opcional
    └── tabela-extra.tex
```

### O que cada coisa faz

| Item | Para que serve |
|------|----------------|
| `main.tex` | “Capa” do livro: título, pacotes, sumário e a ordem dos capítulos |
| `capitulos/*.tex` | Texto de cada capítulo (não precisam ter `\documentclass` sozinhos) |
| `referencias.bib` | Lista de livros/artigos citados (`@book{...}`, `@article{...}`) |
| `figuras/` | Imagens usadas com `\includegraphics{...}` |
| `.latex-local.json` | Lembra qual é o arquivo principal e as opções de compilação |

### Regra de ouro

> Só o `main.tex` tem `\documentclass{...}` e `\begin{document}` … `\end{document}`.  
> Os capítulos são **pedaços** incluídos pelo principal.

### Exemplo mínimo de `main.tex` (livro)

```tex
\documentclass[12pt,a4paper,openany]{book}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[brazilian]{babel}
\usepackage{graphicx}
\usepackage[backend=biber,style=authoryear]{biblatex}
\addbibresource{referencias.bib}

\graphicspath{{figuras/}}

\title{Título do meu livro}
\author{Seu nome}
\date{\today}

\begin{document}
\frontmatter
\maketitle
\tableofcontents

\mainmatter
\input{capitulos/01-introducao}
\input{capitulos/02-fundamentos}
\input{capitulos/03-metodo}
\input{capitulos/99-conclusao}

\printbibliography
\end{document}
```

### Exemplo de um capítulo (`capitulos/01-introducao.tex`)

```tex
\chapter{Introdução}

Texto do capítulo...

Como cita um autor: \cite{silva2020}.

\begin{figure}[ht]
  \centering
  \includegraphics[width=0.8\linewidth]{diagrama.png}
  \caption{Exemplo de figura.}
\end{figure}
```

### Exemplo curto de `referencias.bib`

```bib
@book{silva2020,
  author    = {Silva, Maria},
  title     = {Produção intelectual e tecnologia},
  publisher = {Editora Exemplo},
  year      = {2020},
  address   = {São Paulo}
}
```

### Como abrir e compilar essa pasta no Studio

1. Ligue o Studio (`INICIAR.command`)
2. Na tela inicial, use **Abrir pasta do projeto** (ou **Escolher pasta…**)
3. Selecione a pasta `meu-livro` (a pasta inteira, não só um capítulo)
4. Na coluna da esquerda, confirme que aparece `main.tex`, `capitulos/`, etc.
5. Abra o `main.tex`
6. Se ainda não estiver marcado, clique em **Usar na compilação** (arquivo principal)
7. Clique em **Compilar**
8. O PDF do livro deve aparecer à direita

### Dicas práticas (evitam 90% dos erros)

1. **Nomes de arquivo:** evite espaços e acentos nos nomes (`01-introducao.tex`, não `Capítulo 1.tex`)
2. **Caminhos:** no LaTeX use barra `/` (`capitulos/01-introducao`, `figuras/diagrama.png`)
3. **Bibliografia:** se usar `biblatex` + Biber, deixe a opção de bibliografia em **auto** (padrão do Studio)
4. **Compile o principal:** se você abrir só um capítulo e tentar compilá-lo sozinho, costuma falhar — compile o `main.tex`
5. **Exemplo pronto no projeto:** abra a pasta  
   `examples/book`  
   para ver um livro mínimo funcionando

### Versão ainda mais simples (tudo em um arquivo)

Se o livro for curto, pode ter só:

```text
meu-livro/
└── main.tex
```

Funciona. Quando crescer, aí você separa em `capitulos/`.

---

## Fluxo simples (o que fazer na prática)

### 1) Abrir um exemplo (melhor teste)

1. Clique em **INICIAR**
2. Abra http://localhost:3000
3. Em “Abrir por caminho”, use:

```text
/Users/marcoaureliocarvalho/Desktop/PROJETO COMPILADOR LATEX/examples/article
```

4. O arquivo `main.tex` deve abrir
5. Clique em **Compilar** (barra de cima)
6. Espere alguns segundos
7. O PDF deve aparecer à direita

Se isso funcionar, o Studio está ok.

### 2) Editar e salvar

1. Mude um texto no editor (por exemplo o título)
2. Salve com **⌘ + S** (Command + S) ou botão **Salvar**
3. Se “Auto” estiver ligado, ele pode compilar sozinho após salvar
4. Senão, clique em **Compilar** de novo

### 3) Quando der erro

1. Olhe a aba **Problemas** embaixo
2. Clique no erro
3. O editor deve saltar para o arquivo/linha
4. Corrija, salve e compile outra vez

Erros comuns de quem está começando:

- pacote ou comando digitado errado
- imagem com nome/caminho errado
- esqueceu de salvar antes de compilar

### 4) Limpar e recompilar

Se o PDF “estranho” não atualiza:

1. Clique em **Limpar e compilar**
2. Isso apaga arquivos temporários da pasta de build e gera de novo

### 5) Cancelar

Se a compilação travar ou demorar demais:

1. Clique em **Cancelar**

---

## Botões da barra superior (resumo)

| Botão | Para que serve |
|-------|----------------|
| **Projetos** | Volta à tela inicial |
| **Salvar** | Grava o arquivo no disco |
| **Compilar** | Gera o PDF |
| **Limpar e compilar** | Limpa lixo da compilação e gera de novo |
| **Cancelar** | Para uma compilação em andamento |
| **LuaLaTeX / XeLaTeX / PDFLaTeX** | Escolhe o “motor” (deixe LuaLaTeX se não souber) |
| **Nativo / Docker** | Nativo = LaTeX do Mac; Docker = LaTeX em caixa isolada (avançado) |
| **Auto** | Compila sozinho depois de salvar |

---

## Atalhos úteis no Mac

| Atalho | Ação |
|--------|------|
| ⌘ + S | Salvar |
| ⌘ + Enter | Compilar |
| ⌘ + Shift + Enter | Limpar e compilar |
| ⌘ + B | Mostrar/ocultar lista de arquivos |
| ⌘ + J | Mostrar/ocultar painel de baixo |

---

## Onde ficam os arquivos?

### Seus textos
Continuam **na pasta que você abriu**.  
O Studio **não copia** seu TCC para outro lugar misterioso.

### Configuração do projeto
Pode aparecer um arquivo:

```text
.latex-local.json
```

Isso só guarda preferências (arquivo principal, motor, etc.).  
**Não altera** o conteúdo científico do seu trabalho.

### PDF e arquivos temporários
Ficam em:

```text
sua-pasta/.latex-local/build/
```

Você pode ignorar essa pasta no dia a dia. O preview já mostra o PDF.

---

## Privacidade (importante)

- Não precisa de login
- Não sobe arquivo para nuvem
- Não manda seu texto para inteligência artificial
- Funciona sem internet (depois de instalado)

Se alguém pedir senha ou “conta Overleaf” **dentro deste programa**, desconfie: esta versão local não usa isso.

---

## Problemas comuns

### 1) Cliquei em INICIAR e nada abre no navegador
- Espere 5–10 segundos
- Abra manualmente: http://localhost:3000
- Se falhar, rode `PARAR.command` e depois `INICIAR.command` de novo

### 2) A tela abre, mas compilar falha
Quase sempre falta o MacTeX.  
Abra **Diagnóstico** na tela inicial e veja se Latexmk/LuaLaTeX estão “instalados”.

### 3) “Ambiente Python não encontrado”
Rode uma vez:

```bash
cd "/Users/marcoaureliocarvalho/Desktop/PROJETO COMPILADOR LATEX"
./scripts/setup-macos.sh
```

### 4) O PDF não atualiza
- Salve o arquivo (⌘ + S)
- Compile de novo
- Ou use **Limpar e compilar**

### 5) Fechei o Terminal e o site parou
Normal. Os servidores precisam estar ligados.  
Use `INICIAR.command` outra vez.

### 6) A porta já está em uso
Use `PARAR.command`. Isso libera as portas 3000 e 8000.

---


## Converter Markdown (.md) para LaTeX (.tex)

1. Abra a pasta do projeto (ou um arquivo `.md`)
2. Na coluna esquerda, clique no arquivo `.md`
3. Na barra de cima, clique em **MD → TeX**
4. O Studio cria um `.tex` com o mesmo nome e já abre no editor
5. Clique em **Compilar** para gerar o PDF

Se o Pandoc estiver instalado (`brew install pandoc`), a conversão fica melhor.  
Sem Pandoc, o Studio usa um conversor interno básico (títulos, listas, negrito, itálico, links).

## Converter LaTeX (.tex) para Markdown (.md)

1. Abra um arquivo `.tex` no editor
2. Na barra de cima, clique em **TeX → MD**
3. O Studio cria um `.md` com o mesmo nome e já abre no editor

Também usa Pandoc se estiver instalado; senão, conversor interno básico.

## Mini roteiro “do zero ao PDF” (checklist)

- [ ] Instalei o MacTeX e abri um Terminal novo
- [ ] Rodei `./scripts/setup-macos.sh` uma vez
- [ ] Dei dois cliques em `INICIAR.command`
- [ ] Abri http://localhost:3000
- [ ] Abri a pasta `examples/article`
- [ ] Cliquei em **Compilar**
- [ ] Vi o PDF à direita
- [ ] (Opcional) Abri `examples/book` ou montei minha pasta no modelo da seção “Como montar a pasta de um livro”
- [ ] Quando terminei, cliquei em `PARAR.command`

---

## Para quem quiser ir além

- Detalhes técnicos: [README.md](README.md)
- Instalação macOS: [docs/macos-install.md](docs/macos-install.md)
- Como a arquitetura funciona: [docs/architecture.md](docs/architecture.md)

Se você só quer escrever e gerar PDF, **este arquivo (`COMO-USAR.md`) é o suficiente**.

Para instalar o mesmo ambiente em **outro computador**, use: [REQUISITOS-INSTALACAO.md](REQUISITOS-INSTALACAO.md).
