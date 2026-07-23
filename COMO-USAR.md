# Como usar o LaTeX Studio Local (guia para leigos)

Este texto explica o software **sem jargão técnico**.  
Se algo der errado, vá direto à seção [Problemas comuns](#problemas-comuns).

---

> **Este texto é o mesmo do botão `Como usar` dentro do Studio** (Assistente IA, Traduzir projeto → EN, figuras, barra, etc.).
>
> Versão numerada para estudo: [`MANUAL-USO.md`](MANUAL-USO.md).


## O que é este programa?

Imagine o **Word**, mas para textos científicos em LaTeX (artigos, TCCs, livros).

Diferença importante:

| Programa comum | LaTeX Studio Local |
|----------------|--------------------|
| Você digita e já vê a página “pronta” | Você edita o **código** do texto e depois **compila** para gerar o PDF |
| Fica na nuvem (Google Docs, Overleaf online) | Fica **só no seu Mac** — nada é enviado para a internet |

Em uma frase:

> Você abre uma pasta com arquivos `.tex`, edita, aperta **Compilar**, e o PDF completo do documento (livro, paper, tese…) aparece do lado direito.

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
5. O **navegador padrão do Mac** deve abrir sozinho em **http://localhost:3000**, em **página inteira**
   (se não abrir, copie esse endereço manualmente; para sair da tela cheia use **Ctrl+⌘+F**)

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

### Criar projeto novo (tipo + template)

O Studio cria projetos no formato de **publicação**, separando:

| Camada | O que é | Onde fica |
|--------|---------|-----------|
| Conteúdo | Seu texto, capítulos, figuras | `content/` |
| Template | Aparência (IEEE, Book, ABNT…) | `templates/` |
| Configuração | Tipo, engine, arquivo principal | `metadata.json` e `.latex-local.json` |
| Compilação | Processo que gera o PDF | botão **Compilar** |

**Passo 1 — Tipo de documento**

Escolha uma opção:

- Livro
- Paper científico
- Tese
- Dissertação
- Monografia
- Relatório técnico
- Apresentação Beamer
- Documento personalizado

**Passo 2 — Template**

Exemplos conforme o tipo:

- Livro → Book padrão, Memoir, KOMA Book…
- Paper → IEEE, ACM, Springer LNCS, Elsevier, Nature, MDPI, arXiv, ABNT…

1. Digite o **nome do projeto** (vira o nome da pasta)
2. Escolha o tipo → continue → escolha o template
3. Clique em **Criar projeto** e selecione a **pasta pai** no Finder

O Studio gera, por exemplo:

```text
pasta-pai/meu-livro/
├── main.tex                 ← arquivo PRINCIPAL (é este que se compila)
├── metadata.json
├── studio-compat.sty
├── .latex-local.json
├── content/
│   ├── frontmatter.tex      ← título, autor, sumário
│   ├── chapters/
│   │   ├── 01-introducao.tex
│   │   ├── 02-desenvolvimento.tex
│   │   └── 99-conclusao.tex
│   ├── figures/
│   └── tables/
├── references/
│   └── references.bib
└── templates/<id>/
```

### Compilar = PDF completo do livro (ou paper)

Se a pasta estiver completa e o `main.tex` for o arquivo principal:

1. Abra o projeto (pasta ou `main.tex`)
2. Clique em **Compilar**

O Studio usa o `main.tex`, que já inclui frontmatter + capítulos + bibliografia.  
O resultado é o **PDF do documento inteiro** — não um capítulo isolado.

Só falha se faltar LaTeX no Mac, imagem citada, pacote/classe, ou se outro arquivo estiver marcado como principal.

### Templates de publicação (painel no workspace)

Com o projeto aberto, o botão **Templates** na barra de cima abre o painel para:

- ver templates **nativos** e **importados** (versão, engine, arquivos, status validado);
- **importar** pasta de template oficial (`.cls`, `.sty`, `.bst`, logos…);
- **validar** o template;
- **aplicar** outro template (ex.: IEEE → Nature) **sem apagar** o que está em `content/`;
- remover templates importados.

Macros de compatibilidade (`\DocumentTitle`, `\DocumentAuthor`, …) permitem trocar a aparência sem reescrever o texto à mão.

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
Clique em um arquivo `.tex` (ou `.md` / `.bib`) para abrir no editor.

**Imagens** (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`): ao clicar, abre um **preview** da figura (útil quando o nome do arquivo não descreve o conteúdo). Use **Fechar** ou Esc para sair. Para colocar a imagem no texto, use **Inserir Figura** com um `.tex` aberto.

Para **excluir** um arquivo ou pasta (inclusive na raiz do livro/tese):
1. Passe o mouse sobre o nome na lista
2. Clique no ícone da **lixeira**
3. Confirme na caixa de diálogo

Pastas são removidas com todo o conteúdo. A pasta raiz do projeto (o próprio livro) **não** pode ser apagada por aqui — use o Finder se quiser remover o projeto inteiro.

### Coluna do meio — Editor
Onde você escreve/edita o LaTeX (ou Markdown).  
Parece um bloco de notas com números de linha.

Bolinha ou ponto no nome da aba = arquivo **ainda não salvo**.

**Editor Full** (botão à direita das abas): amplia o editor para **tela cheia**, como o Visualizar Full do PDF. Na tela cheia permanecem **Salvar**, **Salvar como…**, **Baixar**, **Procurar**, **Inserir Figura/Citação** e **Compilar**. **Sair da tela cheia** ou **Esc** volta ao layout de 3 colunas.

### Inserir figura ou citação (no .tex)

Com um arquivo `.tex` aberto:

1. Posicione o cursor onde deseja inserir
2. Clique em **Inserir Figura** — grade com **miniaturas** das pastas `figuras/` / `figures/` / `content/figures/`
3. Ou clique em **Inserir Citação** — escolhe uma chave do `.bib`

O que o Studio faz automaticamente:

| Ação | Resultado |
|------|-----------|
| Inserir figura | Código `\includegraphics` (ou bloco `figure` + legenda). Se faltar, adiciona `graphicx`, `\graphicspath` e **português** (`\usepackage[brazilian]{babel}`) para o PDF mostrar **Figura 1:** (não “Figure 1:”) |
| Inserir citação | Insere **sempre entre parênteses**: `(\cite{chave})`. Se faltar, liga `biblatex` + `referencias.bib` e `\printbibliography` |

Dica: capítulos em subpastas (`capitulos/…`) usam `../figuras/` no caminho gráfico; o compilador também encontra o `.bib` na raiz do projeto.

### Procurar texto (palavra ou frase)

1. Clique em **Procurar** na barra de cima (ou pressione **⌘ + F**)
2. Digite a palavra ou frase
3. Escolha o escopo:
   - **Neste arquivo** — destaca e percorre ocorrências no arquivo aberto (↑ / ↓ ou Enter)
   - **No projeto** — lista resultados em todos os `.tex`, `.md`, `.bib`, etc.; clique para abrir na linha
4. Opção **Aa** diferencia maiúsculas/minúsculas
5. **Esc** ou **Fechar** some a barra


### Coluna direita — Preview PDF
Mostra o PDF depois da compilação.  
Se estiver vazio: ainda não compilou, ou a compilação falhou.

- **Visualizar Full** — abre o PDF em tela grande **sobre a mesma página** (não abre outra janela do Mac)
- **Salvar** — baixa uma cópia do PDF

### Faixa de baixo — Problemas e Log
- **Problemas:** erros e avisos em português/resumo (clique para ir à linha)
- **Log:** texto técnico completo da compilação
- **Configurações:** opções como “compilar automaticamente”

Você pode **ocultar** ou **mostrar** essa faixa com o botão **Ocultar/Mostrar** (ou ⌘ + J).  
Com o painel aberto, arraste a barrinha superior dele para **alterar a altura**.

---

## Como montar a pasta de um livro (para conseguir compilar)

O LaTeX **não trabalha com um arquivo solto** como um `.docx`.  
Ele trabalha com uma **pasta de projeto**. Dentro dela ficam o arquivo principal, os capítulos, as imagens e a bibliografia.

> **Preferência atual:** use **Criar projeto novo** (tipo Livro + template). A estrutura com `content/` e `templates/` já vem pronta.  
> A estrutura “clássica” abaixo (`capitulos/`, `figuras/`) **continua válida** se você já tem um livro assim — abra a pasta e compile o `main.tex`.

### Estrutura gerada pelo Studio (publicação)

```text
meu-livro/
├── main.tex
├── metadata.json
├── content/chapters/…
├── content/figures/
├── references/references.bib
└── templates/…
```

Ao **Compilar**, o PDF sai com **todos** os capítulos incluídos pelo `main.tex`.

### Estrutura clássica (também funciona)

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
8. O PDF **completo** do livro (todos os capítulos + bibliografia) deve aparecer à direita

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

## Botões da barra superior (organizados por função)

A barra agrupa botões parecidos (Arquivo, Edição, Converter, Compilar, Painéis):

### Arquivo
| Botão | Para que serve |
|-------|----------------|
| **Projetos** | Volta à tela inicial |
| **Salvar** | Grava os arquivos abertos no disco (⌘S) |
| **Salvar como…** | Copia o arquivo atual com outro nome/caminho no projeto |
| **Baixar** | Baixa uma cópia para a pasta Downloads |

### Edição
| Botão | Para que serve |
|-------|----------------|
| **Procurar** | Busca palavra/frase neste arquivo ou no projeto (⌘F) |
| **Inserir Figura** | Escolhe imagem (com preview) e insere no `.tex` |
| **Inserir Citação** | Insere `(\cite{chave})` a partir do `.bib` |

### Converter
| Botão | Para que serve |
|-------|----------------|
| **MD → TeX** | Converte o Markdown aberto em `.tex` |
| **MD → .bib** | Extrai referências do Markdown e gera `.bib` (escolhe o formato) |
| **.bib → formato** | Converte um `.bib` entre BibLaTeX, BibTeX clássico ou estilo ABNT |
| **TeX → MD** | Gera Markdown a partir do LaTeX |
| **Traduzir projeto → EN** | Usa o **Assistente IA** para traduzir `.tex` / `.md` / `.bib` / `.txt` de português para inglês (com backup) |

### Compilar
| Botão | Para que serve |
|-------|----------------|
| **Usar na compilação** / **Principal** | Define qual `.tex` é o arquivo principal |
| **Compilar** | Gera o PDF (a partir do arquivo principal) |
| **Limpar e compilar** | Limpa arquivos temporários e gera de novo |
| **Cancelar** | Interrompe compilação em andamento |
| **LuaLaTeX / XeLaTeX / PDFLaTeX** | Motor TeX (deixe LuaLaTeX se não souber) |
| **Nativo / Docker** | Nativo = LaTeX do Mac; Docker = isolado (avançado) |
| **Auto** | Compila sozinho depois de salvar |

### Painéis
| Botão | Para que serve |
|-------|----------------|
| **Assistente IA** | Chat opcional (precisa de chave de API) |
| **Templates** | Importar, validar e trocar template sem apagar o conteúdo |
| **Como usar** | Abre este manual dentro do app |

---

## Assistente de IA (chat)

O botão **Assistente IA** (grupo Painéis) abre um painel lateral de conversa.

### Para que serve
- Pedir rascunhos de seções, reescrever trechos, explicar erros
- Respostas em **Markdown** (dá para salvar e depois converter para `.tex`)
- Opcionalmente usa o arquivo aberto no editor como **contexto**

### Como configurar (uma vez)
1. Clique em **Assistente IA**
2. Cadastre uma chave no padrão **OpenAI-compatible** (também funciona com outros provedores que usem a mesma API: informe `base_url` + `model` + chave)
3. A chave fica **só no seu Mac** (`~/.latex-studio-local/ai-settings.json`), não no repositório do projeto

### Como usar no dia a dia
1. Abra o painel **Assistente IA**
2. Digite o pedido (ex.: “reescreva esta introdução de forma mais acadêmica”)
3. Se quiser, mantenha um `.tex`/`.md` aberto para a IA ver um trecho do contexto
4. Use **Salvar .md** ou **Salvar .md → .tex** quando a resposta estiver boa
5. Há também atalho para gerar `.bib` a partir de referências no Markdown da resposta

### Importante
- Por padrão o Studio **não** usa IA — só depois que você cadastra a chave
- Com a IA ligada, o **texto do chat** (e trechos de contexto) vão para o provedor da chave — precisa de internet
- Erros de compilação na aba Problemas continuam com sugestões **locais** (sem enviar nada), mesmo sem IA

---

## Traduzir o projeto para inglês (IA)

Fluxo pensado para **escrever em português** e, quando quiser, gerar a versão em inglês:

1. Cadastre a chave no painel **Assistente IA** (padrão OpenAI-compatible)
2. Escreva e revise o projeto em português
3. Clique em **Traduzir projeto → EN**
4. Confirme a lista de arquivos (`.tex`, `.md`, `.bib`, `.txt`)
5. Aguarde — pode demorar e consumir tokens da sua API

O que acontece:

- O conteúdo é traduzido **no próprio arquivo** (sobrescreve)
- Há **backup** em `sua-pasta/.latex-local/translate-backup/`
- Comandos LaTeX, `\cite`, `\label`, fórmulas e chaves do `.bib` são preservados
- `babel` brasileiro passa a `english` quando aplicável

> Sem chave de IA configurada, o botão pede para abrir o Assistente IA.  
> A tradução **envia o texto dos arquivos** ao provedor da chave (não é 100% offline).

---

## Formatos de bibliografia (.bib)

Ao usar **MD → .bib** ou **.bib → formato**, você escolhe o perfil:

| Perfil | Quando usar |
|--------|-------------|
| **biblatex** | Com `\usepackage{biblatex}` + Biber (padrão do Studio ao inserir citação) |
| **bibtex** | BibTeX clássico (`\bibliographystyle` + BibTeX) |
| **abnt** | Estilo mais próximo de normas ABNT em entradas `.bib` |

---

## Avisos de compilação (o que importa)

Depois de **Compilar**, a aba **Problemas** mostra erros e avisos do **resultado final**.

- Mensagens do tipo “rode o Biber de novo” / “Citation undefined” **só na passagem intermediária** não devem mais aparecer se o PDF já saiu certo
- Use **Copiar problemas** para colar o relatório na IA ou no professor
- Aviso de “Shell escape” é normal neste Studio (segurança: shell-escape fica desligado)

---

## Atalhos úteis no Mac

| Atalho | Ação |
|--------|------|
| ⌘ + S | Salvar |
| ⌘ + F | Procurar (neste arquivo ou no projeto) |
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
Podem aparecer:

```text
.latex-local.json    ← arquivo principal, motor, auto-compilar…
metadata.json        ← tipo de projeto, template, classe LaTeX (publicação)
```

Isso só guarda preferências e metadados.  
**Não substitui** o texto científico em `content/`.

### PDF, temporários e backups de tradução
Ficam em:

```text
sua-pasta/.latex-local/build/                 ← PDF e logs da compilação
sua-pasta/.latex-local/translate-backup/      ← cópia PT antes de Traduzir → EN
```

Você pode ignorar essas pastas no dia a dia. O preview já mostra o PDF.

---

## Privacidade (importante)

- Não precisa de login
- Não sobe arquivo para nuvem **por padrão**
- Funciona sem internet (depois de instalado), **exceto** se você usar o Assistente IA

Exceções opcionais (só se você ativar):

- **Assistente IA** (chat) — envia as mensagens do chat ao provedor da chave
- **Traduzir projeto → EN** — envia o conteúdo dos arquivos traduzidos ao mesmo provedor

Se alguém pedir senha ou “conta Overleaf” **dentro deste programa**, desconfie: esta versão local não usa isso.

---

## Problemas comuns

### 1) Cliquei em INICIAR e nada abre no navegador
- Espere 5–10 segundos
- Abra manualmente: http://localhost:3000
- Se falhar, rode `PARAR.command` e depois `INICIAR.command` de novo

### 1b) Abriu no Chrome (ou outro) em vez do navegador padrão

O INICIAR usa o **navegador padrão do macOS**. Confira em:

**Ajustes → Desktop e Dock → Navegador padrão** (ou **Ajustes → Geral**, conforme a versão do macOS).

Depois rode **PARAR** e **INICIAR** de novo.

### 1c) Quero sair da página inteira (tela cheia)

Pressione **Ctrl + ⌘ + F** (ou o atalho de tela cheia do seu navegador).

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

### 4b) Compilei, mas o PDF parece “incompleto”
- Confirme que o arquivo principal é o `main.tex` (botão **Usar na compilação**)
- Nos projetos de publicação, os capítulos precisam estar em `content/chapters/` **e** listados no `main.tex` via `\input{...}`
- Capítulos novos: crie o `.tex` e acrescente um `\input{content/chapters/seu-arquivo}` no `main.tex`

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
- [ ] Criei um projeto (tipo Livro + template) **ou** abri `examples/book` / `examples/article`
- [ ] Confirmei que o arquivo principal é o `main.tex`
- [ ] (Opcional) Inseri figura/citação ou traduzi o projeto → EN
- [ ] Cliquei em **Compilar**
- [ ] Vi o PDF **completo** à direita

## Para quem quiser ir além

- Detalhes técnicos: [README.md](README.md)
- Instalação macOS: [docs/macos-install.md](docs/macos-install.md)
- Como a arquitetura funciona: [docs/architecture.md](docs/architecture.md)

Se você só quer escrever e gerar PDF, **este arquivo (`COMO-USAR.md`) é o suficiente**.

Para instalar o mesmo ambiente em **outro computador**, use: [REQUISITOS-INSTALACAO.md](REQUISITOS-INSTALACAO.md).
