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
- [ ] Quando terminei, cliquei em `PARAR.command`

---

## Para quem quiser ir além

- Detalhes técnicos: [README.md](README.md)
- Instalação macOS: [docs/macos-install.md](docs/macos-install.md)
- Como a arquitetura funciona: [docs/architecture.md](docs/architecture.md)

Se você só quer escrever e gerar PDF, **este arquivo (`COMO-USAR.md`) é o suficiente**.

Para instalar o mesmo ambiente em **outro computador**, use: [REQUISITOS-INSTALACAO.md](REQUISITOS-INSTALACAO.md).
