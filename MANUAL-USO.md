# Manual de uso — LaTeX Studio Local

Guia completo para estudantes e iniciantes.  
Não é preciso saber programar. Siga os tópicos na ordem na primeira vez.

---
> **Na interface:** o botão **Como usar** abre o guia [`COMO-USAR.md`](COMO-USAR.md) (Assistente IA, Traduzir → EN, barra, figuras, etc.).
> Este `MANUAL-USO.md` é a versão numerada para estudo/impressão.


## 1. O que é este programa?

O **LaTeX Studio Local** é um editor e compilador de textos científicos (artigos, TCCs, dissertações, teses, livros) que roda **só no seu Mac**.

Pense nele como um “Word para LaTeX”:

| No Word / Google Docs | Neste Studio |
|-----------------------|--------------|
| Você digita e já vê a página | Você edita o texto em código (`.tex` ou `.md`) e depois **compila** |
| Fica na nuvem | Fica **no seu computador** (privado) |
| Formatação pelo mouse | A formatação vem de um **template** (IEEE, livro, ABNT…) |

Em uma frase:

> Abra (ou crie) uma pasta de projeto → edite o texto → clique em **Compilar** → veja o **PDF completo** à direita.

---

## 2. O que você precisa ter instalado (só na primeira vez)

1. **MacTeX** — o motor que transforma LaTeX em PDF  
2. **Python** e **Node.js** — para o Studio funcionar  
3. Rodar uma vez o script de preparação do Studio  

### Instalar o MacTeX (recomendado)

No app **Terminal**:

```bash
brew install --cask mactex-no-gui
```

É um download grande. Depois, **feche e abra o Terminal** de novo.

Confira:

```bash
which latexmk
```

Se aparecer um caminho, está ok.

### Preparar o Studio (uma vez)

```bash
cd "/Users/marcoaureliocarvalho/Desktop/PROJETO COMPILADOR LATEX"
./scripts/setup-macos.sh
```

Detalhes extras: veja também `REQUISITOS-INSTALACAO.md`.

---

## 3. Como ligar e desligar

### Ligar

1. Abra a pasta do Studio no **Finder**
2. Dê **dois cliques** em `INICIAR.command`
3. Espere aparecer algo como:
   - API em `http://127.0.0.1:8000`
   - App em `http://localhost:3000`
4. O **navegador padrão** do Mac abre sozinho em **http://localhost:3000**, em **página inteira**
5. Para sair da tela cheia: **Ctrl+⌘+F**

Isso **não é a internet** — é uma página local no seu Mac.

### Desligar

1. Dois cliques em `PARAR.command`
2. Espere “Servidores parados”

Sempre desligue quando terminar, para o Mac não ficar com processos ligados.

### Se aparecer “Load failed”

Os servidores estão desligados. Rode `INICIAR.command` de novo e recarregue a página.

---

## 4. Tela inicial — o que cada coisa faz

### Abrir arquivo .tex

Escolhe um arquivo `.tex` no Finder. O Studio abre a **pasta** dele e já mostra o código. Depois é só **Compilar**.

### Abrir pasta do projeto

Escolhe a pasta inteira (capítulos, imagens, bibliografia). Na coluna esquerda, clique no arquivo que quiser editar.

### Criar projeto novo (recomendado para começar do zero)

Há **2 passos**:

1. **Tipo** — Livro, Paper, Tese, Dissertação, Monografia, Relatório, Beamer, Personalizado  
2. **Template** — aparência (Book, IEEE, ACM, ABNT…)

Depois informe a **pasta pai** (onde a pasta do projeto será criada):

- botão **Escolher pasta pai…**, ou  
- cole um caminho, por exemplo: `/Users/seu-nome/Desktop`

Clique em **Criar projeto nesta pasta**.

### Abrir por caminho

Cole o caminho de uma pasta ou de um `.tex` e clique em **Carregar**.

### Projetos recentes

Lista o que você já abriu. Clique para reabrir.

### Diagnóstico

Mostra se o LaTeX está instalado. Se algo estiver “ausente”, siga a orientação da tela.

### Botão Como usar

Abre este manual dentro do próprio Studio, por tópicos.

---

## 5. Criar um livro, tese ou paper do zero

1. Ligue o Studio (`INICIAR.command`)
2. Em **Criar projeto novo**, digite o nome (ex.: `meu-tcc`)
3. Escolha o tipo (ex.: **Monografia** ou **Livro**)
4. Continue e escolha o template
5. Escolha a pasta pai (Desktop, Documentos…)
6. O Studio cria a pasta automaticamente e abre o projeto

### O que a pasta contém (visão simples)

```text
meu-tcc/
├── main.tex              ← arquivo PRINCIPAL (compile este)
├── metadata.json         ← tipo e template
├── content/              ← SEU texto (capítulos, figuras)
├── references/           ← bibliografia (.bib)
└── templates/            ← aparência (classe LaTeX)
```

Regra de ouro:

> Escreva o conteúdo em `content/`.  
> O `main.tex` só “monta” o documento.  
> Trocar o template muda a aparência, não apaga seu texto.

---

## 6. A tela de trabalho

No editor, o botão **Editor Full** (ao lado das abas) amplia `.tex`/`.md` em tela cheia; **Layout normal** ou **Esc** volta ao layout.

```text
┌─────────────┬──────────────────────┬─────────────────┐
│  ARQUIVOS   │      EDITOR          │   PREVIEW PDF   │
│  (esquerda) │   (centro)           │   (direita)     │
└─────────────┴──────────────────────┴─────────────────┘
│  Problemas  |  Log  |  Configurações                     │
└──────────────────────────────────────────────────────────┘
```

- **Arquivos** — pasta do projeto  
- **Editor** — onde você digita/edita  
- **PDF** — resultado depois de compilar  
- **Faixa de baixo** — erros e log técnico  

Bolinha no nome da aba = arquivo **ainda não salvo**.

---

## 7. Compilar e gerar o PDF completo

No preview à direita: **Visualizar Full** abre o PDF ampliado na mesma página; **Salvar** baixa o arquivo.

A aba **Problemas** reflete o log **final** da compilação (e tem **Copiar problemas**).

1. Confirme que o arquivo principal é o `main.tex`  
   (se não estiver, abra o `main.tex` e clique em **Usar na compilação**)
2. Clique em **Compilar** (ou ⌘ + Enter)
3. Espere alguns segundos
4. O PDF aparece à direita

### Importante

**Compilar gera o documento inteiro** (todos os capítulos + bibliografia), não um capítulo isolado — desde que o `main.tex` inclua os capítulos.

Se o PDF parecer incompleto:

- verifique se capítulos novos têm `\input{...}` no `main.tex`
- use **Limpar e compilar**

### Motores (só se precisar)

- **LuaLaTeX** — bom padrão geral  
- **XeLaTeX** — fontes do sistema  
- **PDFLaTeX** — comum em templates IEEE/ACM  

O template costuma já escolher o motor certo.

---

## 8. Editar, salvar e baixar

### Inserir figura ou citação no .tex

1. Abra um arquivo `.tex` e clique onde o texto deve entrar
2. **Inserir Figura** — grade com miniaturas; insere `\includegraphics` ou bloco `figure`
3. **Inserir Citação** — insere **`(\cite{chave})`** (sempre entre parênteses)

Extras automáticos:

- Pacotes `graphicx` / `biblatex` e `babel` **brazilian** (legenda **Figura**, não “Figure”)
- Clique numa imagem na árvore de arquivos → **preview** (só visualizar)

| Ação | Como |
|------|------|
| Salvar | Botão **Salvar** ou ⌘ + S |
| Salvar como | **Salvar como…** (outro nome/caminho no projeto) |
| Baixar cópia | **Baixar** (vai para Downloads) |
| Usar na compilação | Marca o `.tex` aberto como principal |

Salve sempre antes de desligar o computador.

---

## 9. Procurar palavra ou frase

1. Clique em **Procurar** (ou ⌘ + F)
2. Digite o texto
3. Escolha:
   - **Neste arquivo** — percorre ocorrências (↑ / ↓)
   - **No projeto** — lista resultados em vários arquivos; clique para abrir
4. **Aa** diferencia maiúsculas/minúsculas
5. **Esc** fecha a barra

---

## 10. Excluir arquivos e pastas

Na coluna **Arquivos**:

1. Passe o mouse sobre o item
2. Clique no ícone da **lixeira**
3. Confirme

Funciona na raiz do projeto (ex.: apagar um `.tex` antigo) e em pastas internas.  
A pasta raiz do projeto inteiro **não** pode ser apagada por aqui (use o Finder se quiser remover o projeto todo).

---

## 11. Templates de publicação

O Studio separa:

| Camada | Significado | Onde |
|--------|-------------|------|
| Conteúdo | Seu texto | `content/` |
| Template | Aparência | `templates/` |
| Configuração | Tipo, motor | `metadata.json` |
| Compilação | Gerar PDF | botão Compilar |

### Painel Templates (com o projeto aberto)

Botão **Templates** na barra de cima:

- ver templates nativos e importados  
- **importar** pasta de template oficial (`.cls`, `.sty`…)  
- **validar**  
- **aplicar** outro template sem apagar o conteúdo  

Macros como `\DocumentTitle` e `\DocumentAuthor` ajudam a trocar de IEEE para Nature etc. sem reescrever tudo.

---

## 12. Markdown ↔ LaTeX e formatos `.bib`

Muitos estudantes escrevem primeiro em Markdown (`.md`).

| Botão | O que faz |
|-------|-----------|
| **MD → TeX** | Converte o `.md` aberto em `.tex` |
| **MD → .bib** | Extrai referências do Markdown (perfis: biblatex, bibtex, abnt) |
| **.bib → formato** | Converte um `.bib` entre esses perfis |
| **TeX → MD** | Gera Markdown a partir do LaTeX |

Se o Pandoc estiver instalado (`brew install pandoc`), a conversão MD↔TeX fica melhor.

---

## 13. Assistente de IA (opcional)

Por padrão **não** envia nada para a internet.

### Chat (painel Assistente IA)

1. Abra **Assistente IA** (grupo Painéis)
2. Cadastre uma chave no padrão OpenAI-compatible (`base_url` + `model` + chave)
3. A chave fica só no Mac (`~/.latex-studio-local/ai-settings.json`)
4. Converse em português; a resposta vem em **Markdown**
5. **Salvar .md** ou **Salvar .md → .tex** grava a resposta no projeto
6. O arquivo aberto no editor pode ser enviado como contexto (trecho)

Use só se entender que o texto do chat será enviado ao provedor da chave.

### Traduzir todo o projeto para inglês

1. Com a chave configurada, clique em **Traduzir projeto → EN** (grupo Converter)
2. Confirme a quantidade de arquivos
3. O Studio traduz `.tex`, `.md`, `.bib` e `.txt` (preserva LaTeX/`\cite`/chaves)
4. Backup automático em `.latex-local/translate-backup/`

Ideal para escrever em português e gerar a versão em inglês no final.

---

## 13b. Barra superior (grupos)

| Grupo | Botões |
|-------|--------|
| Arquivo | Salvar, Salvar como, Baixar |
| Edição | Procurar, Inserir Figura, Inserir Citação |
| Converter | MD→TeX, MD→.bib, .bib→formato, TeX→MD, Traduzir → EN |
| Compilar | Principal, Compilar, Limpar, Cancelar, motor, modo, Auto |
| Painéis | Assistente IA, Templates, Como usar |

---

## 14. Estrutura clássica de livro (alternativa)

Se seu professor pediu pastas `capitulos/` e `figuras/` (sem `content/`):

```text
meu-livro/
├── main.tex
├── referencias.bib
├── capitulos/
│   ├── 01-introducao.tex
│   └── ...
└── figuras/
```

Abra a pasta no Studio e compile o `main.tex`. Também funciona.

---

## 15. Atalhos úteis (Mac)

| Atalho | Ação |
|--------|------|
| ⌘ + S | Salvar |
| ⌘ + F | Procurar |
| ⌘ + Enter | Compilar |
| ⌘ + Shift + Enter | Limpar e compilar |
| ⌘ + B | Mostrar/ocultar lista de arquivos |
| ⌘ + J | Mostrar/ocultar painel de baixo |

---

## 16. Problemas comuns

### Cliquei em INICIAR e nada abre

- Espere 10 segundos  
- Abra manualmente: http://localhost:3000  
- Se falhar: `PARAR.command` e depois `INICIAR.command`

### Compilar falha

- Abra o **Diagnóstico** na tela inicial  
- Confira se Latexmk / LuaLaTeX estão instalados  
- Veja a aba **Problemas** / **Log** no projeto  

### “Seleção de pasta cancelada”

O diálogo do Finder pode estar **atrás do navegador**.  
Traga o Finder à frente, ou cole o caminho da pasta no campo (ex.: Desktop).

### PDF não atualiza

- Salve (⌘ + S)  
- Compile de novo  
- Ou use **Limpar e compilar**

### PDF incompleto

- Arquivo principal deve ser `main.tex`  
- Capítulos novos precisam estar no `main.tex` com `\input{...}`

### Porta em uso

Use `PARAR.command` para liberar as portas 3000 e 8000.

---

## 17. Checklist “do zero ao PDF”

- [ ] Instalei o MacTeX e abri um Terminal novo  
- [ ] Rodei `./scripts/setup-macos.sh` uma vez  
- [ ] Dei dois cliques em `INICIAR.command`  
- [ ] Abri http://localhost:3000  
- [ ] Criei um projeto (tipo + template) **ou** abri um exemplo em `examples/book`  
- [ ] Confirmei que o principal é `main.tex`  
- [ ] Cliquei em **Compilar**  
- [ ] Vi o PDF completo à direita  

---

## 18. Glossário rápido

| Termo | Significado simples |
|-------|---------------------|
| `.tex` | Arquivo de texto do LaTeX |
| `.bib` | Lista de referências bibliográficas |
| Compilar | Transformar o código em PDF |
| Template | “Modelo visual” (IEEE, livro, ABNT…) |
| `main.tex` | Arquivo principal do projeto |
| latexmk | Programa que cuida das várias etapas da compilação |
| Biber / BibTeX | Programas que montam a bibliografia |

---

## 19. Privacidade

Por padrão tudo fica no Mac. Se usar **Assistente IA** ou **Traduzir projeto → EN**, o texto correspondente é enviado ao provedor da chave de API.

- Não precisa de login  
- Não sobe seu TCC para a nuvem por padrão  
- Funciona offline depois de instalado  
- IA só envia dados se **você** cadastrar uma chave  

---

## 20. Onde pedir mais detalhes técnicos

- Este arquivo: `MANUAL-USO.md` (raiz do projeto)  
- Resumo curto: `COMO-USAR.md`  
- Instalação detalhada: `REQUISITOS-INSTALACAO.md`  
- Visão geral do software: `README.md`  

Bom trabalho no seu texto!
