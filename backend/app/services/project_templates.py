from __future__ import annotations

from pathlib import Path


ARTICLE_TEMPLATE = r"""\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazilian]{babel}
\usepackage{hyperref}

\title{Artigo de exemplo}
\author{LaTeX Studio Local}
\date{\today}

\begin{document}
\maketitle

\section{Introdução}
Este é um artigo de exemplo gerado localmente.

\section{Conclusão}
Compilação bem-sucedida.

\end{document}
"""

BOOK_MAIN_TEMPLATE = r"""\documentclass[12pt,a4paper,openany]{book}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[brazilian]{babel}
\usepackage{graphicx}
\usepackage[backend=biber,style=authoryear]{biblatex}
\addbibresource{referencias.bib}

\graphicspath{{figuras/}}

\title{TITLE_PLACEHOLDER}
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
"""

BOOK_CHAPTERS = {
    "01-introducao.tex": r"""\chapter{Introdução}

Escreva aqui a introdução do livro.

Como citar um autor: \cite{silva2020}.
""",
    "02-fundamentos.tex": r"""\chapter{Fundamentos}

Desenvolva os fundamentos teóricos neste capítulo.
""",
    "03-metodo.tex": r"""\chapter{Método}

Descreva o método, os procedimentos ou a abordagem do trabalho.
""",
    "99-conclusao.tex": r"""\chapter{Conclusão}

Consolide as contribuições e os próximos passos.
""",
}

BOOK_BIB_TEMPLATE = """@book{silva2020,
  author    = {Silva, Maria},
  title     = {Produção intelectual e tecnologia},
  publisher = {Editora Exemplo},
  year      = {2020},
  address   = {São Paulo},
  note      = {Entrada de exemplo — substitua pelas suas referências},
}
"""

EMPTY_TEMPLATE = (
    "\\documentclass{article}\n"
    "\\begin{document}\n"
    "Olá\n"
    "\\end{document}\n"
)


def scaffold_article_project(root: Path) -> None:
    (root / "main.tex").write_text(ARTICLE_TEMPLATE, encoding="utf-8")


def scaffold_empty_project(root: Path) -> None:
    (root / "main.tex").write_text(EMPTY_TEMPLATE, encoding="utf-8")


def scaffold_book_project(root: Path, title: str) -> None:
    """Cria a árvore recomendada no COMO-USAR.md para um livro."""
    safe_title = (title or "Meu livro").replace("\\", "").strip() or "Meu livro"
    main = BOOK_MAIN_TEMPLATE.replace("TITLE_PLACEHOLDER", safe_title)
    (root / "main.tex").write_text(main, encoding="utf-8")
    (root / "referencias.bib").write_text(BOOK_BIB_TEMPLATE, encoding="utf-8")

    capitulos = root / "capitulos"
    capitulos.mkdir(exist_ok=True)
    for name, content in BOOK_CHAPTERS.items():
        (capitulos / name).write_text(content, encoding="utf-8")

    figuras = root / "figuras"
    figuras.mkdir(exist_ok=True)
    (figuras / "LEIA-ME.txt").write_text(
        "Coloque aqui as imagens do livro (PNG, JPG, PDF).\n"
        "No texto use: \\includegraphics{nome-do-arquivo.png}\n",
        encoding="utf-8",
    )

    anexos = root / "anexos"
    anexos.mkdir(exist_ok=True)
    (anexos / "tabela-extra.tex").write_text(
        "% Material suplementar (opcional)\n"
        "% Inclua no main.tex com: \\input{anexos/tabela-extra}\n",
        encoding="utf-8",
    )


def scaffold_project(root: Path, template: str, title: str) -> None:
    if template == "article":
        scaffold_article_project(root)
    elif template == "book":
        scaffold_book_project(root, title)
    else:
        scaffold_empty_project(root)
